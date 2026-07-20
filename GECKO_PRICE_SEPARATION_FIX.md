# Gecko Price Separation Fix

## Problem
The price-worker was updating `price`, `price_usd`, `price_change_24h` and other columns in the `pairs` table, which were also being used to display exchange prices (from actual fills/orderbook). This caused GeckoTerminal market reference prices to overwrite our backend-computed exchange prices.

### Symptoms:
- In mobile Market page: Gecko prices displayed correctly in top section
- In mobile Chart view dropdown: Exchange price shown but gets overwritten by gecko price after price-worker sync
- In mobile Trade page: Second price (exchange price) gets overwritten with gecko price

## Solution
Complete separation of concerns using dedicated `gecko_*` columns:

### 1. Database Schema (Updated)
**New gecko-specific columns:**
- `gecko_price` - Native price in quote token (from GeckoTerminal)
- `gecko_price_usd` - USD price (from GeckoTerminal)
- `gecko_price_change_24h` - 24h percentage change
- `gecko_high_24h` / `gecko_low_24h` - 24h range
- `gecko_liquidity` / `gecko_liquidity_usd` - Pool liquidity from GeckoTerminal
- `gecko_market_cap` / `gecko_market_cap_usd` - Market cap data
- `gecko_updated_at` - Last update timestamp

**Old columns (DEPRECATED but kept for compatibility):**
- `price`, `price_usd`, `price_change_24h`, etc.

### 2. Price-Worker (Updated)
**Changes:**
- Now writes ONLY to `gecko_*` columns
- Never touches the legacy `price` columns
- Updates are isolated to GeckoTerminal reference data

**File:** `price-worker/index.js`

### 3. Backend API (Updated)
**Changes:**
- `models.Pair` struct now includes all gecko fields
- `PairResponse` separates gecko vs exchange prices
- `buildPairResponseFast()` reads from `gecko_*` columns
- Exchange prices computed independently from fills/orderbook

**Files:**
- `backend/internal/models/models.go`
- `backend/internal/handlers/handlers.go`

### 4. Frontend Display Logic
**Gecko prices used for:**
- Mobile Market page: Top price display + price change
- Mobile Chart view: Main price in top-right corner
- Mobile Trade page: First price (market reference)

**Exchange prices used for:**
- Mobile Chart view dropdown: "Last Exchange Price" entry
- Mobile Trade page: Second price below first (actual DEX price)
- Order book and trading interface

### 5. WebSocket Updates
**Two separate update types:**
- `ticker` event: Updates `gecko_*` fields only (from price-worker sync)
- `price_update` event: Updates exchange price only (from actual fills)

**Frontend handling:**
- `useRealtimePairs`: Keeps `geckoPrice` separate from `price`
- `usePairWebsocket`: Updates appropriate price based on event type

## Migration Steps

### Step 1: Database Migration
Run the migration to add gecko columns:

```bash
cd backend
psql -h YOUR_HOST -U YOUR_USER -d YOUR_DB -f migrations/001_add_gecko_columns.sql
```

Or use your preferred migration tool.

### Step 2: Restart Price-Worker
The price-worker will automatically start writing to the new `gecko_*` columns:

```bash
cd price-worker
pm2 restart price-worker
# or
npm run start
```

### Step 3: Restart Backend
The Go backend will read from the new gecko columns:

```bash
cd backend
./restart.sh
# or your deployment method
```

### Step 4: Clear Cache (Optional)
If using Redis cache:

```bash
redis-cli FLUSHDB
# or call the cache clear endpoint
curl -X POST http://localhost:8080/api/v1/cache/clear
```

### Step 5: Frontend Deploy
The frontend code already handles both `geckoPrice` and `price` separately, so no changes needed if you've been using the pattern correctly.

## Verification

### 1. Check Database
```sql
-- Verify gecko columns exist and have data
SELECT 
  id, 
  gecko_price, 
  gecko_price_usd, 
  gecko_price_change_24h,
  price, 
  price_usd 
FROM pairs 
LIMIT 5;
```

### 2. Check Price-Worker Logs
```bash
pm2 logs price-worker
```
Look for successful gecko_* column updates (no errors about missing columns).

### 3. Check Backend Logs
```bash
# Should see gecko prices being used for fallback
tail -f backend/logs/app.log | grep gecko
```

### 4. Check API Response
```bash
curl http://localhost:8080/api/v1/pairs | jq '.[0] | {gecko_price, gecko_price_usd, price, price_usd}'
```

You should see both gecko and exchange prices in the response.

### 5. Test in UI
1. **Mobile Market Page**: 
   - Top price should show gecko price
   - Should update every 39 seconds when price-worker syncs

2. **Mobile Chart View**:
   - Top-right price = gecko price (market reference)
   - Click dropdown arrow
   - "Last Exchange Price" section should show different value (exchange price)

3. **Mobile Trade Page**:
   - First price (top) = gecko price
   - Second price (below) = exchange price
   - Exchange price should only update on actual fills, not price-worker sync

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         GeckoTerminal API                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ Every 39s
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Price-Worker                               │
│  • Fetches market data from GeckoTerminal                       │
│  • Writes ONLY to gecko_* columns                               │
│  • Never touches price/price_usd (exchange) columns             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ UPDATE gecko_*
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PostgreSQL pairs table                      │
│                                                                   │
│  ┌─────────────────────┐         ┌────────────────────────┐    │
│  │   Gecko Columns     │         │   Exchange Prices      │    │
│  │  (Market Reference) │         │  (From Fills/Orders)   │    │
│  ├─────────────────────┤         ├────────────────────────┤    │
│  │ gecko_price         │         │ (computed by backend)  │    │
│  │ gecko_price_usd     │         │ • From fills           │    │
│  │ gecko_price_change  │         │ • From orderbook       │    │
│  │ gecko_high_24h      │         │ • From stats table     │    │
│  │ gecko_low_24h       │         │                        │    │
│  └─────────────────────┘         └────────────────────────┘    │
└───────────────┬──────────────────────────┬──────────────────────┘
                │                          │
                │ Read gecko_*             │ Compute exchange
                │                          │
                ▼                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Backend API (Go)                           │
│  • buildPairResponseFast() reads gecko_* columns                │
│  • GetStats() computes exchange prices from fills               │
│  • PairResponse includes BOTH gecko and exchange prices         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ WebSocket + REST
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (React)                             │
│                                                                   │
│  ┌─────────────────────┐         ┌────────────────────────┐    │
│  │   Gecko Display     │         │   Exchange Display     │    │
│  ├─────────────────────┤         ├────────────────────────┤    │
│  │ • Market page top   │         │ • Chart dropdown       │    │
│  │ • Chart top-right   │         │ • Trade page 2nd price │    │
│  │ • Trade page 1st    │         │ • Orderbook ref        │    │
│  └─────────────────────┘         └────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Rollback (If Needed)

If something goes wrong, you can rollback by:

1. Stop price-worker
2. Revert backend code to use `price` columns instead of `gecko_*`
3. Revert price-worker to write to `price` columns
4. Restart services

The migration doesn't drop any columns, so old data is preserved.

## Benefits

✅ **Clean Separation**: Gecko prices never overwrite exchange prices
✅ **Professional Architecture**: Each data source has dedicated columns
✅ **Backward Compatible**: Old columns still exist for fallback
✅ **Future-Proof**: Easy to add more price sources (Chainlink, other DEXes)
✅ **Better UX**: Users see both market reference AND actual exchange prices

## Testing Checklist

- [ ] Database migration completed successfully
- [ ] Price-worker running without errors
- [ ] Backend starts and serves pairs with gecko fields
- [ ] Mobile Market page shows gecko prices
- [ ] Mobile Chart view top-right shows gecko price
- [ ] Mobile Chart dropdown shows exchange price
- [ ] Mobile Trade page shows both prices correctly
- [ ] Prices update independently (gecko every 39s, exchange on fills)
- [ ] No console errors in browser
- [ ] WebSocket updates work for both price types

## Support

If you encounter issues:
1. Check logs (price-worker, backend, browser console)
2. Verify database migration ran successfully
3. Confirm cache was cleared
4. Test API response directly with curl
5. Check WebSocket messages in browser devtools

---

**Migration Date:** 2026-07-04
**Status:** ✅ Ready for deployment
