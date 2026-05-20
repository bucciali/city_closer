package handlers

import (
	"gps_service/internal/response"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

func Healthz(pool *pgxpool.Pool, rdb *redis.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if err := pool.Ping(r.Context()); err != nil {
			response.WriteError(w, http.StatusServiceUnavailable, "Postgres unavailable")
			return
		}
		if err := rdb.Ping(r.Context()).Err(); err != nil {
			response.WriteError(w, http.StatusServiceUnavailable, "Redis unavailable")
			return
		}
		response.WriteJSON(w, http.StatusOK, "OK")

	}
}
