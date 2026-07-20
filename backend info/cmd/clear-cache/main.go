package main

import (
	"log"
)

func main() {
	log.Println("Cache is now fully in-memory (otter + ristretto). No external cache to clear.")
	log.Println("Restart the Go Backend process to reset all in-memory caches.")
}
