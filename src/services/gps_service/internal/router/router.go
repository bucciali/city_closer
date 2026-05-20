package router

import (
	"gps_service/internal/auth"
	"gps_service/internal/cache"
	"gps_service/internal/db"
	"gps_service/internal/handlers"
	"gps_service/internal/middleware"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/redis/go-redis/v9"
)

func NewRouter(
	jm *auth.JWTManager,
	pool *pgxpool.Pool,
	rdb *redis.Client,
	pointsCache *cache.PointsCache,
	kiosksCache *cache.KioskCache,
) chi.Router {
	r := chi.NewRouter()

	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)
	r.Use(middleware.CORS)
	r.Use(middleware.MetricsMiddleware)

	userRepo := db.NewPostgresUserRepo(pool)
	tokenRepo := db.NewPostgresTokenRepo(pool)
	authService := auth.NewAuthService(jm, userRepo, tokenRepo)
	r.Get("/healthz", handlers.Healthz(pool, rdb))

	r.Route("/api/v1", func(api chi.Router) {
		// auth
		api.Route("/auth", func(ar chi.Router) {
			ar.Post("/login", auth.LoginHandler(authService))
			ar.Post("/register", auth.RegisterHandler(authService))
			ar.Post("/refresh", auth.RefreshHandler(authService))
		})

		// public
		api.Get("/points", handlers.GetPointsHandler(pool, pointsCache))
		api.Get("/points/nearby", handlers.GetPointsNearbyHandler(pool))
		api.Get("/kiosks", handlers.GetKioskHandler(pool, kiosksCache))
		api.Get("/kiosks/{id}", handlers.GetKioskByIDHandler(pool, kiosksCache))
		api.Get("/search", handlers.SearchHandler(pool))
		api.Handle("/metrics", promhttp.Handler())
		api.Get("/terminal/ping", handlers.TerminalPingHandler(rdb))

		// admin only
		api.Group(func(admin chi.Router) {
			admin.Use(auth.AuthMiddleware(jm))
			admin.Use(auth.RequireRole("admin"))

			admin.Post("/points", handlers.CreatePointHandler(pool, pointsCache))
			admin.Put("/points/{id}", handlers.UpdatePointHandler(pool, pointsCache))
			admin.Delete("/points/{id}", handlers.DeletePointHandler(pool, pointsCache))

			admin.Post("/kiosks", handlers.CreateKioskHandler(pool, kiosksCache))
			admin.Put("/kiosks/{id}", handlers.UpdateKioskHandler(pool, kiosksCache))
			admin.Delete("/kiosks/{id}", handlers.DeleteKioskHandler(pool, kiosksCache))
		})
	})

	return r
}
