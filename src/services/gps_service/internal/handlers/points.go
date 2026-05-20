package handlers

import (
	"encoding/json"
	"gps_service/internal/auth"
	"gps_service/internal/cache"
	"gps_service/internal/db"
	"gps_service/internal/kafka"
	"gps_service/internal/response"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog/log"
)

type CreatePointRequest struct {
	Name        string  `json:"name"`
	Description *string `json:"description"`
	Latitude    float64 `json:"latitude"`
	Longitude   float64 `json:"longitude"`
	TypeID      string  `json:"type_id"`
}

type UpdatePointRequest struct {
	Name        string  `json:"name"`
	Description *string `json:"description"`
	Latitude    float64 `json:"latitude"`
	Longitude   float64 `json:"longitude"`
	TypeID      string  `json:"type_id"`
}

func derefStr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func GetPointsNearbyHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		latStr := r.URL.Query().Get("lat")
		lngStr := r.URL.Query().Get("lng")
		radiusStr := r.URL.Query().Get("radius")

		if latStr == "" || lngStr == "" || radiusStr == "" {
			response.WriteError(w, http.StatusBadRequest, "missing lat, lng or radius")
			return
		}

		lat, err := strconv.ParseFloat(latStr, 64)
		if err != nil {
			response.WriteError(w, http.StatusBadRequest, "invalid lat")
			return
		}
		lng, err := strconv.ParseFloat(lngStr, 64)
		if err != nil {
			response.WriteError(w, http.StatusBadRequest, "invalid lng")
			return
		}
		radius, err := strconv.ParseFloat(radiusStr, 64)
		if err != nil {
			response.WriteError(w, http.StatusBadRequest, "invalid radius")
			return
		}

		points, err := db.GetPointsNearby(r.Context(), pool, lat, lng, radius)
		if err != nil {
			response.WriteError(w, http.StatusInternalServerError, "nearby search failed")
			return
		}

		response.WriteJSON(w, http.StatusOK, points)
	}
}

func DeletePointHandler(pool *pgxpool.Pool, pointsCache *cache.PointsCache) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := chi.URLParam(r, "id")

		if err := db.DeletePoint(r.Context(), pool, id); err != nil {
			if err.Error() == "point is not found" {
				response.WriteError(w, http.StatusNotFound, "point not found")
				return
			}
			response.WriteError(w, http.StatusInternalServerError, "failed to delete point")
			return
		}
		if GlobalKafkaProducer != nil {
			event := kafka.NewPointEvent("deleted", id)
			if err := GlobalKafkaProducer.PublishPointEvent(r.Context(), event); err != nil {
				log.Printf("Failed to send Kafka event: %v", err)
			}
		}
		_ = pointsCache.InvalidateAll(r.Context())
		response.WriteJSON(w, http.StatusOK, map[string]any{
			"message": "deleted",
		})
	}
}

func UpdatePointHandler(pool *pgxpool.Pool, pointsCache *cache.PointsCache) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := chi.URLParam(r, "id")

		var req UpdatePointRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			response.WriteError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		defer r.Body.Close()

		p := db.Point{
			PointId:     id,
			Name:        req.Name,
			Description: req.Description,
			Latitude:    req.Latitude,
			Longitude:   req.Longitude,
			TypeID:      req.TypeID,
		}

		if err := db.UpdatePoint(r.Context(), pool, p); err != nil {
			if err.Error() == "point is not found" {
				response.WriteError(w, http.StatusNotFound, "point not found")
				return
			}
			response.WriteError(w, http.StatusInternalServerError, "failed to update point")
			return
		}
		if GlobalKafkaProducer != nil {
			event := kafka.NewPointEvent("updated", id)
			if err := GlobalKafkaProducer.PublishPointEvent(r.Context(), event); err != nil {
				log.Printf("Failed to send Kafka event: %v", err)
			}
		}

		_ = pointsCache.InvalidateAll(r.Context())
		response.WriteJSON(w, http.StatusOK, map[string]any{
			"message": "updated",
		})
	}
}

func CreatePointHandler(pool *pgxpool.Pool, pointsCache *cache.PointsCache) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req CreatePointRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			response.WriteError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		defer r.Body.Close()

		if strings.TrimSpace(req.Name) == "" {
			response.WriteError(w, http.StatusBadRequest, "name is required")
			return
		}

		claim, ok := auth.GetUserFromContext(r.Context())
		if !ok {
			response.WriteError(w, http.StatusUnauthorized, "user not found in context")
			return
		}

		p := db.Point{
			Name:        req.Name,
			Description: req.Description,
			Latitude:    req.Latitude,
			Longitude:   req.Longitude,
			TypeID:      req.TypeID,
			CreatedBy:   claim.UserID,
		}

		created, err := db.CreatePoint(r.Context(), pool, p)
		if err != nil {
			log.Error().Err(err).Msg("failed to create point")
			response.WriteError(w, http.StatusInternalServerError, "failed to create point")
			return
		}
		if GlobalKafkaProducer != nil {
			event := kafka.NewPointEvent("created", created.PointId)
			if err := GlobalKafkaProducer.PublishPointEvent(r.Context(), event); err != nil {
				log.Printf("Failed to send Kafka event: %v", err)
			}
		}
		_ = pointsCache.InvalidateAll(r.Context())
		response.WriteJSON(w, http.StatusCreated, map[string]any{
			"point": created,
		})
	}
}

func GetPointsHandler(pool *pgxpool.Pool, pointsCache *cache.PointsCache) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		cached, err := pointsCache.GetAll(ctx)
		if err == nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(cached))
			return
		}

		points, err := db.GetPoints(ctx, pool)
		if err != nil {
			response.WriteError(w, http.StatusInternalServerError, "failed to get points")
			return
		}
		resp := map[string]any{
			"points": points,
		}
		data, err := json.Marshal(resp)
		if err == nil {
			_ = pointsCache.SetAll(ctx, data)
		}

		response.WriteJSON(w, http.StatusOK, resp)

	}
}
