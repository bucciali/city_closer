package db

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type User struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	Role         string    `json:"role"`
	CreatedAt    time.Time `json:"created_at"`
}

type Point struct {
	PointId     string    `json:"point_id"`
	Name        string    `json:"name"`
	Description *string   `json:"description"`
	Latitude    float64   `json:"latitude"`
	Longitude   float64   `json:"longitude"`
	TypeID      string    `json:"type_id"`
	CreatedBy   string    `json:"created_by"`
	CreatedAt   time.Time `json:"created_at"`
}

type NearbyPoint struct {
	PointId     string  `json:"point_id"`
	Name        string  `json:"name"`
	Description *string `json:"description"`
	Latitude    float64 `json:"latitude"`
	Longitude   float64 `json:"longitude"`
	Category    string  `json:"category"`
}

type Kiosk struct {
	ID          string    `json:"id" db:"terminal_point_id"`
	Name        string    `json:"name" db:"name"`
	Description string    `json:"description" db:"description"`
	Latitude    float64   `json:"latitude" db:"latitude"`
	Longitude   float64   `json:"longitude" db:"longitude"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}

type SearchResult struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Type string `json:"type"`
}

func GetPointsNearby(ctx context.Context, pool *pgxpool.Pool, lat, lng, radius float64) ([]NearbyPoint, error) {
	rows, err := pool.Query(ctx, `
		SELECT p.point_id, p.name, p.description, p.latitude, p.longitude, pt.name as category
		FROM points p
		JOIN point_types pt ON p.type_id = pt.type_id
		WHERE ST_DWithin(
			ST_MakePoint(p.longitude, p.latitude)::geography,
			ST_MakePoint($1, $2)::geography,
			$3
		)
		ORDER BY p.name
		LIMIT 50
	`, lng, lat, radius)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var points []NearbyPoint
	for rows.Next() {
		var p NearbyPoint
		if err := rows.Scan(&p.PointId, &p.Name, &p.Description, &p.Latitude, &p.Longitude, &p.Category); err != nil {
			return nil, err
		}
		points = append(points, p)
	}
	return points, nil
}
func Search(ctx context.Context, pool *pgxpool.Pool, name string) ([]SearchResult, error) {
	q := "%" + name + "%"
	rows, err := pool.Query(ctx, `
    SELECT terminal_point_id AS id, name, 'kiosk' AS type FROM terminal_points WHERE name ILIKE $1
    UNION
    SELECT point_id AS id, name, 'poi' AS type FROM points WHERE name ILIKE $1
    ORDER BY name LIMIT 50`, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []SearchResult
	for rows.Next() {
		var r SearchResult
		if err := rows.Scan(&r.ID, &r.Name, &r.Type); err != nil {
			return nil, err
		}
		results = append(results, r)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if results == nil {
		results = []SearchResult{}
	}
	return results, nil
}

func DeleteKiosk(ctx context.Context, pool *pgxpool.Pool, id string) error {
	result, err := pool.Exec(ctx, `DELETE FROM terminal_points WHERE terminal_point_id = $1;`, id)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return errors.New("kiosk is not found")
	}

	return nil
}

func DeletePoint(ctx context.Context, pool *pgxpool.Pool, id string) error {
	result, err := pool.Exec(ctx, `DELETE FROM points WHERE point_id = $1`, id)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return errors.New("point is not found")
	}

	return nil
}

func UpdateKiosk(ctx context.Context, pool *pgxpool.Pool, k Kiosk) error {
	query := `
		UPDATE terminal_points
		SET name = $2,
			description = $3,
			latitude = $4,
			longitude = $5
		WHERE terminal_point_id = $1
	`

	result, err := pool.Exec(
		ctx,
		query,
		k.ID,
		k.Name,
		k.Description,
		k.Latitude,
		k.Longitude,
	)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return errors.New("kiosk not found")
	}

	return nil
}

func UpdatePoint(ctx context.Context, pool *pgxpool.Pool, p Point) error {
	query := `UPDATE points
		SET name = $1, description = $2, latitude = $3, longitude = $4, type_id = $5
		WHERE point_id = $6`

	result, err := pool.Exec(ctx, query,
		p.Name, p.Description, p.Latitude, p.Longitude, p.TypeID, p.PointId)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return errors.New("point is not found")
	}

	return nil
}

func CreateKiosk(ctx context.Context, pool *pgxpool.Pool, k Kiosk) (Kiosk, error) {
	query := `
		INSERT INTO terminal_points (name, description, latitude, longitude)
		VALUES ($1, $2, $3, $4)
		RETURNING terminal_point_id, name, description, latitude, longitude, created_at;
	`

	err := pool.QueryRow(
		ctx,
		query,
		k.Name,
		k.Description,
		k.Latitude,
		k.Longitude,
	).Scan(
		&k.ID,
		&k.Name,
		&k.Description,
		&k.Latitude,
		&k.Longitude,
		&k.CreatedAt,
	)
	if err != nil {
		return Kiosk{}, err
	}

	return k, nil
}

func CreatePoint(ctx context.Context, pool *pgxpool.Pool, p Point) (Point, error) {
	query := `INSERT INTO points (name, description, latitude, longitude, type_id, created_by)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING point_id, created_at`

	err := pool.QueryRow(ctx, query,
		p.Name, p.Description, p.Latitude, p.Longitude, p.TypeID, p.CreatedBy,
	).Scan(&p.PointId, &p.CreatedAt)
	if err != nil {
		return Point{}, err
	}

	return p, nil
}

func GetKioskByID(ctx context.Context, pool *pgxpool.Pool, id string) (Kiosk, error) {
	query := `
		SELECT terminal_point_id, name, description, latitude, longitude, created_at
		FROM terminal_points
		WHERE terminal_point_id = $1
	`

	var k Kiosk
	err := pool.QueryRow(ctx, query, id).Scan(
		&k.ID,
		&k.Name,
		&k.Description,
		&k.Latitude,
		&k.Longitude,
		&k.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Kiosk{}, errors.New("kiosk not found")
		}
		return Kiosk{}, err
	}

	return k, nil
}

func GetKiosks(ctx context.Context, pool *pgxpool.Pool) ([]Kiosk, error) {
	query := `SELECT terminal_point_id, name, description, latitude, longitude, created_at
		FROM terminal_points
		ORDER BY created_at DESC;
	`
	rows, err := pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var kiosks []Kiosk
	for rows.Next() {
		var kiosk Kiosk
		err := rows.Scan(
			&kiosk.ID,
			&kiosk.Name,
			&kiosk.Description,
			&kiosk.Latitude,
			&kiosk.Longitude,
			&kiosk.CreatedAt,
		)
		if err != nil {
			return nil, err
		}

		kiosks = append(kiosks, kiosk)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return kiosks, nil

}

func GetPoints(ctx context.Context, pool *pgxpool.Pool) ([]Point, error) {
	query := `SELECT point_id, name, description, latitude, longitude, type_id, created_by, created_at
		FROM points
		ORDER BY created_at DESC;
	`
	rows, err := pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var points []Point
	for rows.Next() {
		var point Point
		err := rows.Scan(
			&point.PointId,
			&point.Name,
			&point.Description,
			&point.Latitude,
			&point.Longitude,
			&point.TypeID,
			&point.CreatedBy,
			&point.CreatedAt,
		)
		if err != nil {
			return nil, err
		}

		points = append(points, point)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return points, nil

}

func EnsureUserExists(ctx context.Context, userID, email, role string, pool *pgxpool.Pool) error {
	query := `
		INSERT INTO users (user_id, email, password_hash, role, created_at)
		VALUES ($1, $2, $3, $4, now())
		ON CONFLICT (user_id) DO NOTHING
	`

	_, err := pool.Exec(ctx, query, userID, email, "dummy_hash", role)
	return err
}
