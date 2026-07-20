package main

import (
	"context"
	"log"

	"github.com/cexdex/backend/internal/config"
	"github.com/cexdex/backend/internal/db"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Load configuration
	cfg := config.Load()

	// Initialize Redis
	redis, err := db.NewRedis(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}
	defer redis.Close()

	log.Println("Connected to Redis, clearing all pair cache...")

	// Clear all pair-related cache
	if err := redis.ClearAllPairs(context.Background()); err != nil {
		log.Fatalf("Failed to clear cache: %v", err)
	}

	log.Println("Successfully cleared all pair cache from Redis")
}