package db

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func NewPostgresPoolWithRetry(ctx context.Context, connString string, maxRetries int, delay time.Duration) (*pgxpool.Pool, error) {
	for i := 0; i < maxRetries; i++ {
		pool, err := pgxpool.New(ctx, connString)
		if err == nil {
			pingCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
			err = pool.Ping(pingCtx)
			cancel()
			if err == nil {
				log.Printf("✅ Postgres connected (attempt %d/%d)", i+1, maxRetries)
				return pool, nil
			}
			pool.Close()
		}
		log.Printf("⚠️ Postgres not ready (attempt %d/%d): %v", i+1, maxRetries, err)
		time.Sleep(delay)
	}
	return nil, fmt.Errorf("failed to connect to Postgres after %d attempts", maxRetries)
}
