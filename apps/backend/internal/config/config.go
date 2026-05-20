package config

import "os"

type Config struct {
	Port             string
	FrontendURL      string
	JWTSecret        string
	DatabaseType     string
	DatabaseHost     string
	DatabasePort     string
	DatabaseName     string
	DatabaseUsername string
	DatabasePassword string
	DatabaseSSL      string
	DatabasePath     string
}

func Load() Config {
	return Config{
		Port:             env("PORT", "3000"),
		FrontendURL:      env("FRONTEND_URL", "http://localhost:5173"),
		JWTSecret:        env("JWT_SECRET", "your-super-secret-jwt-key-change-in-production"),
		DatabaseType:     env("DATABASE_TYPE", "sqlite"),
		DatabaseHost:     env("DATABASE_HOST", "localhost"),
		DatabasePort:     env("DATABASE_PORT", "5432"),
		DatabaseName:     env("DATABASE_NAME", "rancher_hub"),
		DatabaseUsername: env("DATABASE_USERNAME", "rancher_hub"),
		DatabasePassword: env("DATABASE_PASSWORD", "rancher_hub_password"),
		DatabaseSSL:      env("DATABASE_SSL", "false"),
		DatabasePath:     env("DATABASE_PATH", "rancher-hub.db"),
	}
}

func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
