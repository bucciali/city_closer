package cache

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
)

func NewRedisClientWithRetry(addr string, maxRetries int, delay time.Duration) (*redis.Client, error) {
	for i := 0; i < maxRetries; i++ {
		rdb := redis.NewClient(&redis.Options{Addr: addr})
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		err := rdb.Ping(ctx).Err()
		cancel()
		if err == nil {
			log.Printf("✅ Redis connected (attempt %d/%d)", i+1, maxRetries)
			return rdb, nil
		}
		log.Printf("⚠️ Redis not ready (attempt %d/%d): %v", i+1, maxRetries, err)
		time.Sleep(delay)
	}
	return nil, fmt.Errorf("failed to connect to Redis after %d attempts", maxRetries)
}
