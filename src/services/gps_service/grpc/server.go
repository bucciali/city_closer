package grpc

import (
	"context"
	api "gps_service/grpc/api"
	"gps_service/internal/db"
	"gps_service/internal/middleware"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

type GRPCServer struct {
	api.UnimplementedGPSServiceServer
	pool *pgxpool.Pool
	rdb  *redis.Client
}

func NewGRPCServer(pool *pgxpool.Pool, rdb *redis.Client) *GRPCServer {
	return &GRPCServer{
		pool: pool,
		rdb:  rdb,
	}
}

// Healthz
func (s *GRPCServer) Healthz(ctx context.Context, req *api.Empty) (*api.HealthzResponse, error) {
	if err := s.pool.Ping(ctx); err != nil {
		return nil, err
	}
	if err := s.rdb.Ping(ctx).Err(); err != nil {
		return nil, err
	}
	return &api.HealthzResponse{Status: "OK"}, nil
}

// GetPointsNearby
func (s *GRPCServer) GetPointsNearby(ctx context.Context, req *api.PointsNearbyRequest) (*api.PointsNearbyResponse, error) {
	points, err := db.GetPointsNearby(ctx, s.pool, req.Lat, req.Lng, req.Radius)
	if err != nil {
		return nil, err
	}

	var grpcPoints []*api.NearbyPoint
	for _, p := range points {
		grpcPoints = append(grpcPoints, &api.NearbyPoint{
			PointId:   p.PointId,
			Name:      p.Name,
			Latitude:  p.Latitude,
			Longitude: p.Longitude,
			Category:  p.Category,
		})
	}

	return &api.PointsNearbyResponse{Points: grpcPoints}, nil
}

// TerminalPing
func (s *GRPCServer) TerminalPing(ctx context.Context, req *api.TerminalPingRequest) (*api.TerminalPingResponse, error) {
	key := "terminal:ping:" + req.TerminalId + ":" + req.Location
	now := time.Now().Format(time.RFC3339)
	s.rdb.Set(ctx, key, now, 12*time.Minute)

	middleware.TerminalStatus.WithLabelValues(req.TerminalId, req.Location).Set(1)

	return &api.TerminalPingResponse{
		Status:     "pong",
		TerminalId: req.TerminalId,
		Location:   req.Location,
	}, nil
}

// TODO: Реализовать остальные методы:
// - GetPoints
func (s *GRPCServer) GetPoints(ctx context.Context, req *api.Empty) (*api.GetPointsResponse, error) {
	points, err := db.GetPoints(ctx, s.pool)
	if err != nil {
		return nil, err
	}

	var grpcPoints []*api.Point
	for _, p := range points {
		desc := ""
		if p.Description != nil {
			desc = *p.Description
		}
		grpcPoints = append(grpcPoints, &api.Point{
			PointId:     p.PointId,
			Name:        p.Name,
			Description: &desc,
			Latitude:    p.Latitude,
			Longitude:   p.Longitude,
			TypeId:      p.TypeID,
			CreatedBy:   p.CreatedBy,
			CreatedAt:   p.CreatedAt.Format(time.RFC3339),
		})
	}

	return &api.GetPointsResponse{Points: grpcPoints}, nil
}

// - GetKiosks
// - GetKioskById
// - Search
// - Login
// - Register
// - Refresh
// - CreatePoint
// - UpdatePoint
// - DeletePoint
// - CreateKiosk
// - UpdateKiosk
// - DeleteKiosk
