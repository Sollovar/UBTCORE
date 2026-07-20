# DeEx Trade - Local Development Startup Guide

This guide explains how to run the frontend and backend services locally with **local Supabase**.

---

## 📋 Prerequisites

Before running the application, make sure you have the following installed:
1. **Node.js** (v20+ recommended)
2. **pnpm** (Package Manager)
3. **Go** (v1.21+ recommended)
4. **Supabase CLI** - [Installation Guide](https://supabase.com/docs/guides/cli/getting-started)

---

## � Quick Start - Run All Services

You need to run **4 services** in this specific order:

### 1. **Local Supabase (Database)** - Port 55422

Start your local Supabase instance:
```bash
supabase start
```

✅ Wait until you see: `Started supabase local development setup.`

Your local database will be at:
- Host: `localhost`
- Port: `55422`
- User: `postgres`
- Password: `postgres`
- Database: `postgres`

---

### 2. **Pair Indexer Server (Node.js)** - Port 3001

This service fetches trading pairs from GeckoTerminal and stores them in your database.

```bash
cd server
npm install
npm start
```

✅ Wait until you see: `Initial sync complete: X pairs loaded`

This will:
- Create the `pairs` table in your local Supabase
- Fetch trending pairs from BSC, Base, and Solana networks
- Auto-sync every 15 minutes
- Expose API at http://localhost:3001

**Check it's working:**
```bash
# Should return { "status": "ok", "pairs": X }
curl http://localhost:3001/health
```

---

### 3. **Go Backend (Trading API)** - Port 8080

The Go backend serves the main trading API.

#### On Windows (PowerShell):
```powershell
cd backend
go run ./cmd/api
```

#### On macOS / Linux:
```bash
cd backend
go run ./cmd/api
```

✅ Wait until you see: `All routes registered, server fully ready`

The backend will:
- Connect to local Supabase (port 55422)
- Run database migrations
- Pre-warm the pair cache from database
- Start the matching engine
- Listen on http://localhost:8080

---

### 4. **Frontend (Vite/React)** - Port 5000

The frontend connects to the Go backend.

#### On Windows (PowerShell):
From the root project directory:
```powershell
$env:PORT="5000"; $env:BASE_PATH="/"; pnpm --filter @workspace/dex dev
```

#### On macOS / Linux:
```bash
PORT=5000 BASE_PATH=/ pnpm --filter @workspace/dex dev
```

✅ Open your browser to: **http://localhost:5000**

---

### 5. **Price Worker (Node.js)** - Background Service

This service fetches live prices, 24h changes, volume, and liquidity from GeckoTerminal and updates the `pairs` table.

```bash
cd price-worker
npm install
npm start
```

✅ Wait until you see: `[PriceWorker] Done — X prices synced`

This will:
- Read all pairs from the database (that the pair indexer created)
- Fetch live price data from GeckoTerminal for BSC, Base, Solana
- Update the `pairs` table with fresh prices every 2 minutes
- Keep your trading platform data up-to-date

**Why you need this:**
- The **pair indexer** creates/stores the pairs
- The **price worker** updates their prices continuously
- The **Go backend** reads the fresh prices from the database
- The **frontend** displays the live data

---

## 📁 Environment Files (Already Created)

✅ **`backend/.env`** - Go backend configuration
```env
DB_HOST=localhost
DB_PORT=55422
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=postgres
DB_SSL_MODE=disable
PORT=8080
```

✅ **`server/.env`** - Pair indexer configuration
```env
DB_HOST=127.0.0.1
DB_PORT=55422
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=postgres
```

✅ **`price-worker/.env`** - Price worker configuration
```env
DB_HOST=127.0.0.1
DB_PORT=55422
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=postgres
SYNC_INTERVAL_SECONDS=120
NETWORKS=bsc,base,solana
```

✅ **`artifacts/dex/vite.config.ts`** - Frontend proxy (already configured)
- Proxies `/api` requests to `http://localhost:8080`
- Proxies `/ws` WebSocket to `ws://localhost:8080`

---

## 🛠️ Troubleshooting

### ❌ "Failed to fetch pairs from API: Error: API Error: 500"

**Solution:**
1. Make sure the **pair indexer** (port 3001) has finished syncing pairs
2. Check if pairs exist: `curl http://localhost:3001/api/pairs`
3. Check backend logs for specific errors
4. Restart the Go backend to refresh cache

---

### ❌ "Missing required Replit Secrets: [DB_HOST, DB_USER, DB_PASSWORD]"

**Solution:**
- Make sure the `.env` file exists in the correct directory
- For backend: `backend/.env`
- For server: `server/.env`
- Verify the DB credentials match your local Supabase

---

### ❌ "Database connection failed"

**Solution:**
1. Check Supabase is running: `supabase status`
2. Verify the port is 55422 (from `supabase/config.toml`)
3. Check your firewall isn't blocking the connection
4. Try connecting manually:
   ```bash
   psql -h localhost -p 55422 -U postgres -d postgres
   # Password: postgres
   ```

---

### ❌ Frontend can't connect to backend

**Solution:**
1. Verify backend is running on port **8080** (not 8099)
2. Check `artifacts/dex/vite.config.ts` proxy is set to port 8080
3. **Restart the frontend dev server** after changing vite.config.ts
4. Clear browser cache

---

### ❌ WebSocket connection failed: "ws://localhost:5000/ws" 

**Solution:**
1. The Vite proxy should forward `/ws` to the Go backend
2. Make sure `artifacts/dex/vite.config.ts` has the correct proxy:
   ```ts
   proxy: {
     "/ws": {
       target: "ws://localhost:8080",
       ws: true,
       changeOrigin: true,
     }
   }
   ```
3. **Restart the frontend dev server** (Ctrl+C then restart)
4. Check the Go backend is running and has WebSocket support
5. If still failing, check backend logs for WebSocket connection attempts

---

### ❌ Price worker can't connect to Supabase

**Solution:**
1. Make sure Supabase is running: `supabase status`
2. Check `price-worker/.env` has correct local Supabase URL:
   - `SUPABASE_URL=http://127.0.0.1:55421` (API port, not DB port)
   - `SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
3. The anon key is the default local Supabase key (always the same)
4. Check if the `pairs` table exists in your database

---

### ❌ Prices not updating in the frontend

**Solution:**
1. Check the **price worker** is running and syncing:
   - Look for: `[PriceWorker] Done — X prices synced`
2. Check the **pair indexer** has created pairs first
3. Verify pairs exist: `curl http://localhost:3001/api/pairs`
4. Check the database directly in Supabase Studio (port 55423)
5. Look for the `price`, `price_usd`, `volume_24h` columns in the `pairs` table

---

## 🔍 Useful Commands

### Check what's running:
```bash
# Check Supabase status
supabase status

# Check if ports are in use
netstat -ano | findstr :55422   # Supabase DB
netstat -ano | findstr :3001    # Pair Indexer
netstat -ano | findstr :8080    # Go Backend
netstat -ano | findstr :5000    # Frontend
```

### View Supabase Studio:
```bash
# Open the database UI (usually on port 55423)
# URL shown in: supabase status
```

### Stop all services:
```bash
# Stop Supabase
supabase stop

# Stop other services with Ctrl+C in their terminals
```

---

## 📊 Service Overview

| Service | Port | Purpose | URL |
|---------|------|---------|-----|
| Supabase DB | 55422 | PostgreSQL Database | - |
| Supabase Studio | 55423 | Database UI | http://localhost:55423 |
| Pair Indexer | 3001 | Fetches & stores trading pairs | http://localhost:3001 |
| Price Worker | - | Updates pair prices every 2min | (background) |
| Go Backend | 8080 | Trading API & matching engine | http://localhost:8080 |
| Frontend | 5000 | React UI | http://localhost:5000 |

---

## 🎯 Startup Order Summary

```
1. supabase start              → Database ready
2. cd server && npm start      → Pairs indexed
3. cd price-worker && npm start → Prices syncing
4. cd backend && go run        → Backend ready
5. pnpm filter dex dev         → Frontend ready
```

Happy trading! 🚀
