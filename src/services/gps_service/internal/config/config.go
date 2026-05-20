package config

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	ServerPort  string
	DataBaseUrl string
	JwtSecret   string
}

func Load() (*Config, error) {
	godotenv.Load()
	serverPort := os.Getenv("SERVER_PORT")
	if serverPort == "" {
		serverPort = ":8080"
	}
	cfg := &Config{
		ServerPort:  serverPort,
		DataBaseUrl: os.Getenv("DATABASE_URL"),
		JwtSecret:   os.Getenv("JWT_SECRET"),
	}
	if cfg.DataBaseUrl == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}
	if cfg.JwtSecret == "" {
		return nil, fmt.Errorf("JWT_SECRET is required")
	}

	return cfg, nil
}
