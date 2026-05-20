package handlers

import (
	"gps_service/internal/middleware"
	"gps_service/internal/response"
	"net/http"
	"time"

	"github.com/redis/go-redis/v9"
)

func TerminalPingHandler(rdb *redis.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		terminalID := r.URL.Query().Get("id")
		location := r.URL.Query().Get("location")

		if terminalID == "" {
			response.WriteError(w, http.StatusBadRequest, "terminal_id required")
			return
		}

		// Сохраняем время последнего пинга в Redis (TTL 12 минут)
		key := "terminal:ping:" + terminalID + ":" + location
		now := time.Now().Format(time.RFC3339)

		ctx := r.Context()
		rdb.Set(ctx, key, now, 12*time.Minute)

		// Обновляем метрику (alive)
		middleware.TerminalStatus.WithLabelValues(terminalID, location).Set(1)

		response.WriteJSON(w, http.StatusOK, map[string]string{
			"status":      "pong",
			"terminal_id": terminalID,
			"location":    location,
		})
	}
}
