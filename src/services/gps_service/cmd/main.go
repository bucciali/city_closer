package main

import (
	"context"
	mygrpc "gps_service/grpc"
	"gps_service/grpc/api"
	"gps_service/internal/auth"
	"gps_service/internal/cache"
	"gps_service/internal/config"
	"gps_service/internal/db"
	"gps_service/internal/middleware"
	"gps_service/internal/router"
	"log"
	"net"

	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"

	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	pool, err := db.NewPostgresPoolWithRetry(context.Background(), cfg.DataBaseUrl, 10, 3*time.Second)
	if err != nil {
		log.Fatalf("%v", err)
	}
	defer pool.Close()

	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "redis:6379"
	}
	rdb, err := cache.NewRedisClientWithRetry(redisAddr, 10, 3*time.Second)
	if err != nil {
		log.Fatalf("%v", err)
	}

	pointsCache := cache.NewPointsCache(rdb)
	kiosksCache := cache.NewKioskCache(rdb)

	jm := auth.NewJWTManager(cfg.JwtSecret, 15*time.Minute)
	r := router.NewRouter(jm, pool, rdb, pointsCache, kiosksCache)
	grpcSrv := grpc.NewServer()
	api.RegisterGPSServiceServer(grpcSrv, mygrpc.NewGRPCServer(pool, rdb))
	reflection.Register(grpcSrv)

	lis, err := net.Listen("tcp", ":50051")
	if err != nil {
		log.Fatalf("gRPC listen: %v", err)
	}

	go func() {
		log.Printf("gRPC server listening on :50051")
		if err := grpcSrv.Serve(lis); err != nil {
			log.Fatalf("gRPC serve: %v", err)
		}
	}()

	srv := &http.Server{
		Addr:         cfg.ServerPort,
		Handler:      r,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		ticker := time.NewTicker(2 * time.Minute)
		defer ticker.Stop()

		for range ticker.C {
			ctx := context.Background()
			keys, err := rdb.Keys(ctx, "terminal:ping:*").Result()
			if err != nil {
				log.Printf("cleanup: failed to get terminal keys: %v", err)
				continue
			}

			now := time.Now()
			for _, key := range keys {
				lastPingStr, err := rdb.Get(ctx, key).Result()
				if err != nil {
					continue
				}

				lastPing, err := time.Parse(time.RFC3339, lastPingStr)
				if err != nil {
					continue
				}
				if now.Sub(lastPing) > 10*time.Minute {
					terminalID := key[len("terminal:ping:"):]

					middleware.TerminalStatus.WithLabelValues(terminalID, "").Set(0)
					log.Printf("Terminal %s is dead (last ping: %v)", terminalID, lastPing)

					rdb.Del(ctx, key)
				} else {
					terminalID := key[len("terminal:ping:"):]
					middleware.TerminalStatus.WithLabelValues(terminalID, "").Set(1)
				}
			}

			log.Printf("Terminal cleanup finished, checked %d terminals", len(keys))
		}
	}()

	go func() {
		log.Printf("server listening on %s", cfg.ServerPort)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("shutting down")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("shutdown: %v", err)
	}

	grpcSrv.GracefulStop()

	log.Println("server stopped")
	log.Println("gRPC server stopped")
}
