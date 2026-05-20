import sys
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
city_closer_root = os.path.dirname(project_root)

sys.path.insert(0, city_closer_root)
sys.path.insert(0, project_root)
sys.path.insert(0, os.path.join(project_root, 'algorithms'))
sys.path.insert(0, os.path.join(project_root, 'algorithms', 'base'))
sys.path.insert(0, os.path.join(project_root, 'algorithms', 'shortest_path'))
sys.path.insert(0, os.path.join(project_root, 'algorithms', 'advanced'))
sys.path.insert(0, current_dir)

from fastapi import FastAPI, HTTPException, status
from fastapi.responses import JSONResponse
from typing import List, Tuple, Dict
import logging
from contextlib import asynccontextmanager

import osmnx as ox
import networkx as nx
import numpy as np

from schemas import RoutingRequest, RouteResponse, ErrorResponse, NetworkType
from algorithms.base.a_star import AStarRouter
from algorithms.advanced.alt import ALTRouter
from service.graph_loader import MoscowGraphLoader
from algorithms.advanced.contraction_hierarchies import ContractionHierarchies
from algorithms.shortest_path.dijkstra import DijkstraRouter
from algorithms.base.bidirectional import BidirectionalDijkstraRouter

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Глобальные переменные
GRAPH = None
COORDINATES = None
ROUTER = None
NODES_ARRAY = None
NODE_IDS = None
GRAPH_INFO = {
    'nodes': 0,
    'edges': 0,
    'network_type': 'drive'
}
ALGORITHM_NAME = os.environ.get("ROUTING_ALGORITHM", "dijkstra")
IS_READY = False  # Флаг готовности сервиса


def find_nearest_node(lat: float, lng: float) -> int:
    """Snap lat/lng to nearest OSM node using vectorized numpy search."""
    if NODES_ARRAY is None or NODE_IDS is None:
        raise HTTPException(status_code=503, detail="Graph not loaded yet")

    # Проверка на корректность координат (примерные границы Москвы)
    if not (55.2 <= lat <= 56.2 and 37.2 <= lng <= 37.9):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Coordinates ({lat}, {lng}) are outside Moscow area"
        )

    diffs = NODES_ARRAY - np.array([lat, lng])
    idx = int(np.argmin((diffs * diffs).sum(axis=1)))
    return NODE_IDS[idx]


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Управление жизненным циклом приложения"""
    global GRAPH, COORDINATES, ROUTER, GRAPH_INFO, NODES_ARRAY, NODE_IDS, IS_READY

    logger.info("="*50)
    logger.info("Starting Moscow Routing API")
    logger.info("="*50)

    logger.info(f"Using algorithm: {ALGORITHM_NAME.upper()}")
    logger.info("Loading Moscow graph...")

    try:
        loader = MoscowGraphLoader(network_type='drive')

        # Поддержка монтированного кэша
        cache_dir = os.environ.get("GRAPH_CACHE_DIR", "/app/cache")
        cache_file = os.path.join(cache_dir, 'moscow_graph_drive.pkl')

        GRAPH = loader.load_graph(
            use_cache=True, 
            cache_file=cache_file
        )
        COORDINATES = loader.get_coordinates()

        GRAPH_INFO['nodes'] = len(GRAPH)
        GRAPH_INFO['edges'] = sum(len(neighbors)
                                  for neighbors in GRAPH.values())
        GRAPH_INFO['network_type'] = 'drive'

        NODE_IDS = list(COORDINATES.keys())
        NODES_ARRAY = np.array([[COORDINATES[n][0], COORDINATES[n][1]] for n in NODE_IDS])

        logger.info(
            f"✅ Graph loaded: {GRAPH_INFO['nodes']} nodes, {GRAPH_INFO['edges']} edges")

        logger.info(f"Initializing {ALGORITHM_NAME.upper()} router...")

        if ALGORITHM_NAME == 'astar':
            ROUTER = AStarRouter(GRAPH, COORDINATES)
        elif ALGORITHM_NAME == 'dijkstra':
            ROUTER = DijkstraRouter(GRAPH)
        elif ALGORITHM_NAME == 'bidirectional':
            ROUTER = BidirectionalDijkstraRouter(GRAPH)
        elif ALGORITHM_NAME == 'ch':
            logger.info("Preprocessing Contraction Hierarchies...")
            ROUTER = ContractionHierarchies(GRAPH)
            ROUTER.preprocess()
        elif ALGORITHM_NAME == 'alt':
            ROUTER = ALTRouter(GRAPH, COORDINATES)
        else:
            logger.warning(f"Unknown algorithm {ALGORITHM_NAME}, falling back to A*")
            ROUTER = AStarRouter(GRAPH, COORDINATES)

        IS_READY = True
        logger.info(f"✅ Router initialized: {ALGORITHM_NAME.upper()}")
        logger.info("="*50)
        logger.info("API is ready!")
        logger.info("="*50)

    except Exception as e:
        logger.error(f"❌ Failed to initialize: {e}")
        import traceback
        traceback.print_exc()
        IS_READY = False
        raise

    yield

    logger.info("Shutting down API...")
    IS_READY = False


app = FastAPI(
    title="Moscow Routing API",
    description="API for finding shortest paths in Moscow road network",
    version="1.0.0",
    lifespan=lifespan
)


def build_geojson_route(ids: List[int]) -> Tuple[dict, float, int]:
    """Строит GeoJSON маршрут по массиву ID"""
    global GRAPH, COORDINATES, ROUTER

    if GRAPH is None:
        raise HTTPException(status_code=503, detail="Graph not loaded yet")

    if ROUTER is None:
        raise HTTPException(status_code=503, detail="Router not initialized")

    all_coordinates = []
    total_distance = 0.0

    for i in range(len(ids) - 1):
        start = ids[i]
        end = ids[i + 1]

        if start not in GRAPH:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Node {start} not found in graph"
            )
        if end not in GRAPH:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Node {end} not found in graph"
            )

        try:
            if hasattr(ROUTER, 'query'):
                path, distance = ROUTER.query(start, end)
            elif hasattr(ROUTER, 'find_route'):
                path, distance = ROUTER.find_route(start, end)
            else:
                raise Exception(f"Router has no find_route or query method")

            if not path:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"No path found between nodes {start} and {end}"
                )

            total_distance += distance

            for node in path:
                lat, lon = COORDINATES[node]
                all_coordinates.append([lon, lat])

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Routing error between {start} and {end}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Routing error: {str(e)}"
            )

    if len(all_coordinates) > 1:
        unique_coords = []
        for i, coord in enumerate(all_coordinates):
            if i == 0 or coord != all_coordinates[i-1]:
                unique_coords.append(coord)
        all_coordinates = unique_coords

    geojson = {
        "type": "Feature",
        "geometry": {
            "type": "LineString",
            "coordinates": all_coordinates
        },
        "properties": {
            "total_distance_meters": round(total_distance, 2),
            "total_distance_km": round(total_distance / 1000, 2),
            "number_of_waypoints": len(ids),
            "algorithm": ALGORITHM_NAME,
            "waypoints": ids
        }
    }
    estimated_time = round(total_distance / 83.3)

    return geojson, total_distance, estimated_time


@app.get("/")
async def root():
    """Корневой эндпоинт"""
    return {
        "service": "Moscow Routing API",
        "version": "1.0.0",
        "status": "running",
        "graph_info": GRAPH_INFO
    }


@app.get("/health")
async def health_check():
    """Health check endpoint - возвращает 200 только когда сервис полностью готов"""
    if not IS_READY or GRAPH is None or ROUTER is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service is initializing, please wait"
        )

    return {
        "status": "healthy",
        "graph_loaded": GRAPH is not None,
        "router_ready": ROUTER is not None
    }


@app.get("/routing/v1/info")
async def get_info():
    """Информация о сервисе"""
    return {
        "service": "Moscow Routing API",
        "graph": {
            "nodes": GRAPH_INFO.get('nodes', 0),
            "edges": GRAPH_INFO.get('edges', 0),
            "network_type": GRAPH_INFO.get('network_type', 'drive')
        },
        "algorithm": ALGORITHM_NAME,
        "heuristic": "Euclidean distance" if ALGORITHM_NAME == "astar" else "None",
        "city": "Moscow",
        "status": "ready" if IS_READY else "loading"
    }


@app.get("/routing/v1/node/{node_id}")
async def get_node_info(node_id: int):
    """Информация об узле"""
    if GRAPH is None or not IS_READY:
        raise HTTPException(status_code=503, detail="Service not ready")

    if node_id not in GRAPH:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Node {node_id} not found"
        )

    neighbors = list(GRAPH[node_id].keys())
    lat, lon = COORDINATES[node_id]

    return {
        "node_id": node_id,
        "coordinates": {
            "latitude": lat,
            "longitude": lon
        },
        "degree": len(neighbors),
        "neighbors": neighbors[:20],
        "total_neighbors": len(neighbors)
    }


@app.post("/routing/v1/route")
async def get_route(request: RoutingRequest):
    """Построение маршрута по массиву координат [{lat, lng}]"""
    import time
    start_time = time.time()

    logger.info(f"Route request: {len(request.waypoints)} waypoints")

    if GRAPH is None or not IS_READY:
        raise HTTPException(status_code=503, detail="Service not ready")

    if ROUTER is None:
        raise HTTPException(status_code=503, detail="Router not initialized")

    # Валидация входных данных
    if not request.waypoints or len(request.waypoints) < 2:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least 2 waypoints are required"
        )

    try:
        node_ids = []
        for idx, wp in enumerate(request.waypoints):
            try:
                node_id = find_nearest_node(wp.lat, wp.lng)
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Failed to snap waypoint {idx}: {e}")
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Failed to snap waypoint {idx} to graph: {str(e)}"
                )

            if node_id is None or node_id not in GRAPH:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Waypoint {idx} ({wp.lat}, {wp.lng}) not found in graph"
                )

            node_ids.append(node_id)
        
        logger.info(f"Snapped waypoints to OSM nodes: {node_ids}")

        geojson, total_distance, estimated_time = build_geojson_route(node_ids)

        geojson['properties']['estimated_time_minutes'] = estimated_time
        geojson['properties']['processing_time_ms'] = round(
            (time.time() - start_time) * 1000, 2)

        logger.info(
            f"Route built: {total_distance:.2f}m, ~{estimated_time}min, "
            f"in {geojson['properties']['processing_time_ms']}ms")

        return JSONResponse(content=geojson, status_code=200)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info"
    )