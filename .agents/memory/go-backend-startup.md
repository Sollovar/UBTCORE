---
name: Go Backend startup order and health route
description: Go backend must start HTTP server before DB migrations; /health is registered by RegisterRoutes — don't add it in main.go
---

## Rule
Start the HTTP server (gin + listen) before running DB migrations and loading the matching engine. This keeps the port open within Replit's 60s timeout while migrations run in the background (~90s total).

**Why:** DB migrations + loading 140 pairs from Supabase via `aws-0-eu-west-1.pooler.supabase.com` takes ~90s. Replit's workflow port-open timeout is 60s, so the server must bind early.

**How to apply:** In `backend/cmd/api/main.go`, create the gin router and call `srv.ListenAndServe()` in a goroutine *before* `db.New()` and `runMigrations()`. Then call `h.RegisterRoutes(r)` after the engine is ready — gin allows adding routes to a live server.

## Critical gotcha
`h.RegisterRoutes(r)` already registers `GET /health`. Never add a second `r.GET("/health", ...)` in main.go — gin panics with "handlers are already registered for path '/health'" and the process exits.
