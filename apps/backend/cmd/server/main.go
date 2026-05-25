package main

import (
	"log"

	"rancher-hub-backend/internal/config"
	"rancher-hub-backend/internal/database"
	"rancher-hub-backend/internal/server"
)

func main() {
	cfg := config.Load()

	db, err := database.Open(cfg)
	if err != nil {
		log.Fatalf("failed to open database: %v", err)
	}

	if err := database.Migrate(db); err != nil {
		log.Fatalf("failed to migrate database: %v", err)
	}

	if err := database.SeedDefaultAdmin(db); err != nil {
		log.Fatalf("failed to seed default admin: %v", err)
	}
	if err := database.SeedDefaultMessageTemplates(db); err != nil {
		log.Fatalf("failed to seed default message templates: %v", err)
	}

	router := server.New(cfg, db)
	log.Printf("Backend server running on http://localhost:%s", cfg.Port)
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatalf("server stopped: %v", err)
	}
}
