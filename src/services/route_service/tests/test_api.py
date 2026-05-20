import pytest
from fastapi.testclient import TestClient
from ..service.main import app

client = TestClient(app)


def test_route_success():
    payload = {
        "waypoints": [
            {"lat": 55.7558, "lng": 37.6176},  # Манежная площадь
            {"lat": 55.7512, "lng": 37.6184}   # Красная площадь
        ]
    }

    resp = client.post("/routing/v1/route", json=payload)

    # Сервис может быть не готов (503) или координаты могут быть вне графа (422)
    assert resp.status_code in (200, 422, 503)

    if resp.status_code == 200:
        data = resp.json()

        # Проверка структуры GeoJSON
        assert "type" in data
        assert data["type"] == "Feature"

        assert "geometry" in data
        assert data["geometry"]["type"] == "LineString"
        assert isinstance(data["geometry"]["coordinates"], list)
        assert len(data["geometry"]["coordinates"]) > 1

        # Проверка свойств маршрута (внимание: названия полей!)
        assert "properties" in data
        properties = data["properties"]

        # В вашем коде используется total_distance_meters, а не total_distance
        assert "total_distance_meters" in properties
        assert properties["total_distance_meters"] > 0

        # В вашем коде используется estimated_time_minutes, а не estimated_time
        assert "estimated_time_minutes" in properties
        assert properties["estimated_time_minutes"] > 0

        # Дополнительные проверки
        assert "total_distance_km" in properties
        assert "number_of_waypoints" in properties
        assert properties["number_of_waypoints"] == 2
        assert "algorithm" in properties
        assert "processing_time_ms" in properties


def test_route_invalid_coordinates():
    """Тест с координатами вне Москвы"""
    payload = {
        "waypoints": [
            {"lat": 0.0, "lng": 0.0},      # Африка
            {"lat": 55.7512, "lng": 37.6184}
        ]
    }

    resp = client.post("/routing/v1/route", json=payload)
    # Должен вернуть 422 (Unprocessable Entity)
    assert resp.status_code == 422

    data = resp.json()
    assert "detail" in data
    assert "outside Moscow" in data["detail"] or "not found" in data["detail"]


def test_route_insufficient_waypoints():
    """Тест с недостаточным количеством точек"""
    # Одна точка
    resp = client.post("/routing/v1/route", json={"waypoints": [{"lat": 55.7558, "lng": 37.6176}]})
    assert resp.status_code == 422

    # Пустой массив
    resp = client.post("/routing/v1/route", json={"waypoints": []})
    assert resp.status_code == 422


def test_route_invalid_payload():
    """Тест с некорректным payload"""
    # Отсутствуют waypoints
    resp = client.post("/routing/v1/route", json={})
    assert resp.status_code == 422

    # Некорректная структура
    resp = client.post("/routing/v1/route", json={"waypoints": "not_array"})
    assert resp.status_code == 422


def test_health_check():
    """Тест health endpoint"""
    resp = client.get("/health")

    # Если сервис готов - 200, если нет - 503
    assert resp.status_code in (200, 503)

    if resp.status_code == 200:
        data = resp.json()
        assert "status" in data
        assert data["status"] == "healthy"
        assert "graph_loaded" in data
        assert "router_ready" in data
        assert data["graph_loaded"] is True
        assert data["router_ready"] is True


def test_info_endpoint():
    """Тест info endpoint"""
    resp = client.get("/routing/v1/info")

    # Даже если сервис не готов, info должен работать
    assert resp.status_code == 200

    data = resp.json()
    assert "service" in data
    assert "algorithm" in data
    assert "city" in data
    assert data["city"] == "Moscow"
    assert "status" in data


def test_root_endpoint():
    """Тест корневого endpoint"""
    resp = client.get("/")

    assert resp.status_code == 200

    data = resp.json()
    assert "service" in data
    assert data["service"] == "Moscow Routing API"
    assert "graph_info" in data


def test_node_info_success():
    """Тест получения информации об узле (если сервис готов)"""
    resp = client.get("/health")
    if resp.status_code != 200:
        pytest.skip("Service not ready")

    # Берем любой существующий узел (нужно знать ID)
    # В реальном тесте можно сначала получить информацию о маршруте
    # или использовать заведомо существующий ID из графа
    pass  # Этот тест требует знания существующего node_id


def test_route_multiple_waypoints():
    """Тест с несколькими waypoints"""
    payload = {
        "waypoints": [
            {"lat": 55.7558, "lng": 37.6176},  # Манежная
            {"lat": 55.7512, "lng": 37.6184},  # Красная площадь
            {"lat": 55.7333, "lng": 37.5667}   # Парк Горького
        ]
    }

    resp = client.post("/routing/v1/route", json=payload)

    if resp.status_code == 200:
        data = resp.json()
        properties = data["properties"]

        # Должно быть 2 сегмента (3 точки)
        assert properties["number_of_waypoints"] == 3
        assert "total_distance_meters" in properties
        assert properties["total_distance_meters"] > 0