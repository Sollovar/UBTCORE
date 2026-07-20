# Real-Time Price Update Diagnostic

## Issue
Prices from price-worker are not showing in the UI in real-time without refreshing the page.

## How It Should Work

### Price Update Flow:
```
Price-Worker (39s) → PostgreSQL → Backend Cache (5s) → WebSocket → Frontend
```

1. **Price-Worker** (`price-worker/index.js`):
   - Fetches prices from GeckoTerminal every 39 seconds
   - Updates PostgreSQL `pairs` table directly
   - Updates: `price`, `price_usd`, `price_change_24h`, `price_high_24h`, `price_low_24h`, `liquidity`, etc.

2. **Backend Cache Worker** (`backend/internal/cache/cache.go`):
   - Refreshes every 5 seconds (const `workerInterval = 5 * time.Second`)
   - Calls `GetAllActive()` to read all pairs from PostgreSQL
   - Detects price changes by comparing old vs new ticker
   - Calls `OnTickerBroadcast` callback when price changes

3. **WebSocket Hub** (`backend/internal/websocket/hub.go`):
   - Receives ticker updates via `BroadcastTickerUpdate()`
   - Broadcasts `{"type": "ticker", "pair_id": "...", "payload": {...}}` to all connected clients

4. **Frontend** (`artifacts/dex/src/hooks/useRealtimePairs.ts`):
   - Connects to WebSocket with `pair=all` parameter
   - Listens for `ticker` message type
   - Updates Zustand store via `updatePair()`
   - UI re-renders automatically when store updates

---

## Key Code Locations

### Backend: Cache Worker Broadcasting
File: `backend/internal/cache/cache.go` (lines 170-178)

```go
// ── broadcast ticker if price changed ────────────────────────────
if c.OnTickerBroadcast != nil {
    if !hadOld || oldTicker.Price != newTicker.Price || oldTicker.PriceChange24h != newTicker.PriceChange24h {
        id := pCopy.ID
        t := newTicker
        go c.OnTickerBroadcast(id, t)
    }
}
```

**This callback is set up in `backend/internal/handlers/handlers.go` (line 659):**
```go
cacheManager.OnTickerBroadcast = func(pairID string, t cache.PairTicker) {
    hub.BroadcastTickerUpdate(websocket.TickerUpdate{
        PairID:         pairID,
        LastPrice:      t.Price,
        // ... other fields
    })
}
```

### Frontend: WebSocket Handler
File: `artifacts/dex/src/hooks/useRealtimePairs.ts` (lines 78-103)

```typescript
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  
  if (msg.type === 'ticker' && msg.payload) {
    const newPrice = parseFloat(msg.payload.last_price);
    const dir = newPrice > oldPrice ? 'up' : newPrice < oldPrice ? 'down' : null;
    
    updatePair(pairId, {
      price: newPrice,
      priceChange24h: parseFloat(msg.payload.price_change_24h),
      // ... other fields
    });
    
    triggerFlash(pairId, dir);
  }
};
```

---

## Diagnostic Steps

### 1. Check Price-Worker is Running
```bash
# In price-worker directory
node index.js
```

**Expected output every 39 seconds:**
```
[PriceWorker] Sync @ 2024-...
[PriceWorker] bsc: 25 pairs → 1 batch(es)
[PriceWorker] Done — 25 prices synced, 3 API calls, 2.3s
```

### 2. Check Backend Cache Worker Logs
```bash
# In backend directory
go run cmd/server/main.go
```

**Expected output every 5 seconds:**
```
[CacheWorker] refreshing 25 pairs
[CacheWorker] cached 25 pairs across 3 networks
```

### 3. Check WebSocket Connection in Browser Console
Open browser DevTools → Network tab → WS filter

**Expected:**
- WebSocket connection to `/ws?pair=all` with status 101 (Switching Protocols)
- Messages tab shows incoming `ticker` messages every 5 seconds

**Console test:**
```javascript
// Check if WebSocket is connected
console.log('WebSocket connected:', window.location.href);

// Monitor store updates
import { useStore } from './stores/useStore';
const unsubscribe = useStore.subscribe((state) => {
  console.log('Pairs updated:', state.pairs.length);
});
```

### 4. Check if Prices Update in Database
```sql
-- Connect to PostgreSQL
-- Check if prices are changing
SELECT id, base_symbol, quote_symbol, price, updated_at 
FROM pairs 
ORDER BY updated_at DESC 
LIMIT 10;

-- Run this query twice (30 seconds apart)
-- updated_at should change if price-worker is working
```

---

## Common Issues & Fixes

### Issue 1: WebSocket Not Connecting
**Symptoms:**
- No WebSocket connection in DevTools Network tab
- No ticker messages received
- Prices don't update

**Fix:**
Check WebSocket URL construction in `useRealtimePairs.ts`:
```typescript
function buildWsUrl(): string {
  const explicit = import.meta.env.VITE_WS_URL;
  if (explicit) {
    const u = new URL(explicit);
    u.searchParams.set('pair', 'all');
    return u.toString();
  }
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws?pair=all`;
}
```

**Verify .env file:**
```bash
# artifacts/dex/.env
VITE_WS_URL=ws://localhost:8080/ws
# OR for production:
VITE_WS_URL=wss://your-domain.com/ws
```

### Issue 2: Cache Worker Not Broadcasting
**Symptoms:**
- Backend logs show cache refresh but no WebSocket broadcast logs
- `OnTickerBroadcast` callback not firing

**Fix:**
Verify callback is set in `handlers.go`:
```go
if hub != nil {
    cacheManager.OnTickerBroadcast = func(pairID string, t cache.PairTicker) {
        hub.BroadcastTickerUpdate(websocket.TickerUpdate{
            PairID:         pairID,
            LastPrice:      t.Price,
            // ...
        })
    }
}
```

**Check backend logs for:**
```
[WebSocket Hub] BroadcastTickerUpdate pair=<pair_id> ticker={...}
```

### Issue 3: Frontend Not Updating Store
**Symptoms:**
- WebSocket messages arrive but UI doesn't update
- Store `updatePair` not called

**Fix:**
Check Zustand store `updatePair` function:
```typescript
// artifacts/dex/src/stores/useStore.ts
updatePair: (pairId, updates) => set((state) => ({
  pairs: state.pairs.map((p) =>
    p.id === pairId ? { ...p, ...updates } : p
  ),
})),
```

### Issue 4: Price-Worker Not Running
**Symptoms:**
- No price updates in database
- `updated_at` column in `pairs` table is stale

**Fix:**
1. Check price-worker process is running
2. Check database connection in price-worker `.env`
3. Check GeckoTerminal API is responding
4. Check price-worker logs for errors

---

## Testing Real-Time Updates

### Manual Test:
1. Start price-worker: `cd price-worker && node index.js`
2. Start backend: `cd backend && go run cmd/server/main.go`
3. Start frontend: `cd artifacts/dex && npm run dev`
4. Open browser DevTools → Network → WS
5. Watch for incoming `ticker` messages every 5 seconds
6. Prices on UI should flash green/red when they change

### Expected Behavior:
- **Every 39 seconds**: Price-worker updates PostgreSQL
- **Every 5 seconds**: Backend reads PostgreSQL and broadcasts changes
- **Immediately**: Frontend receives WebSocket message and updates UI
- **Visual feedback**: Price flashes green (up) or red (down) for 700ms

---

## Current Status Check

Run these commands to diagnose:

```bash
# 1. Check if price-worker is running
ps aux | grep "node.*price-worker"

# 2. Check if backend is running
ps aux | grep "server"

# 3. Check PostgreSQL for recent price updates
# (Connect to your database and run this query)
SELECT id, base_symbol, price, updated_at 
FROM pairs 
WHERE updated_at > NOW() - INTERVAL '1 minute' 
ORDER BY updated_at DESC;

# 4. Check backend logs for cache refresh
# Look for lines like:
# [CacheWorker] refreshing X pairs
# [WebSocket Hub] BroadcastTickerUpdate pair=...

# 5. Check frontend WebSocket in browser console
# Open DevTools → Network → WS tab
# Should see connection to ws://localhost:8080/ws?pair=all
# Messages tab should show incoming ticker messages
```

---

## Solution

If prices are NOT updating in real-time, the most likely issues are:

1. **WebSocket not connecting** - Check VITE_WS_URL in `.env`
2. **Backend not broadcasting** - Check OnTickerBroadcast callback is set
3. **Price-worker not running** - Start price-worker process
4. **Database connection issue** - Check price-worker can connect to PostgreSQL

The system is DESIGNED to work in real-time. The infrastructure is already in place. The issue is likely a configuration or process management issue, not a code issue.

