# Quick Start: Gecko Price Separation Migration

## TL;DR
Run these commands to fix the gecko/exchange price overwrite issue:

```bash
# 1. Stop services
pm2 stop price-worker
./backend/stop.sh  # or your method

# 2. Run database migration
psql -h YOUR_HOST -U YOUR_USER -d YOUR_DB -f backend/migrations/001_add_gecko_columns.sql

# 3. Start services
cd price-worker && pm2 start index.js --name price-worker
cd backend && ./start.sh

# 4. Clear cache (optional but recommended)
curl -X POST http://localhost:8080/api/v1/cache/clear

# Done! ✅
```

## What This Fixes

**Before (Problem):**
- Price-worker updates GeckoTerminal prices every 39 seconds
- These updates overwrite the exchange prices (from actual trades)
- Users see gecko prices in places where exchange prices should appear
- The chart dropdown "Exchange Price" shows gecko price instead of actual DEX price

**After (Fixed):**
- Price-worker writes ONLY to `gecko_*` columns
- Exchange prices computed from fills stay separate in `price` columns
- UI correctly shows gecko prices for market reference
- UI correctly shows exchange prices for actual DEX activity
- No more overwrites! 🎉

## Where Each Price Type Appears

### Gecko Prices (Market Reference from GeckoTerminal)
✅ Mobile Market page: Top price + change %
✅ Mobile Chart view: Top-right corner price
✅ Mobile Trade page: First price (above exchange price)

### Exchange Prices (From Actual Fills/Orderbook)
✅ Mobile Chart view: Dropdown menu "Last Exchange Price"
✅ Mobile Trade page: Second price (below gecko price)
✅ Order book calculations

## Quick Test

After migration, verify both prices work:

```bash
# Check API returns both price types
curl http://localhost:8080/api/v1/pairs | jq '.[0] | {gecko_price, gecko_price_usd, price, price_usd}'

# Should see:
# {
#   "gecko_price": "0.001234",      ← from GeckoTerminal
#   "gecko_price_usd": "0.789",     ← from GeckoTerminal
#   "price": "0.001240",            ← from fills/orderbook
#   "price_usd": "0.792"            ← computed from fills
# }
```

## Expected Behavior After Fix

1. **Price-worker runs** (every 39s):
   - Updates `gecko_*` columns only
   - Logs show: `gecko_price`, `gecko_price_usd`, etc.
   - Never touches `price` or `price_usd`

2. **Fill happens on exchange**:
   - Backend updates exchange price immediately
   - WebSocket sends `price_update` event
   - UI updates exchange price only

3. **User opens chart dropdown**:
   - Shows both prices side-by-side
   - Gecko price = market reference
   - Exchange price = last actual trade

## Troubleshooting

### Migration fails with "column already exists"
```bash
# Safe to ignore - column was added before
# Verify it exists:
psql -c "SELECT gecko_price, gecko_price_usd FROM pairs LIMIT 1;"
```

### Price-worker shows errors about missing columns
```bash
# Check price-worker is updated
cd price-worker
git pull  # or ensure you have the latest code
pm2 restart price-worker
```

### Frontend still shows old behavior
```bash
# Clear browser cache and reload
# Or hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
```

### Both prices show same value
```bash
# This is normal if no fills have happened yet
# Place a test order to see exchange price diverge from gecko price
```

## Files Changed

### Backend
- ✅ `backend/internal/models/models.go` - Added gecko_* fields to Pair struct
- ✅ `backend/internal/handlers/handlers.go` - Updated to use gecko_* columns
- ✅ `backend/schema.sql` - Added gecko_* column definitions
- ✅ `backend/migrations/001_add_gecko_columns.sql` - Migration script

### Price-Worker
- ✅ `price-worker/index.js` - Now writes to gecko_* columns only

### Frontend
- ✅ `artifacts/dex/src/types/index.ts` - Added gecko fields to Pair interface
- ✅ `artifacts/dex/src/hooks/useRealtimePairs.ts` - Properly separates gecko/exchange updates
- ✅ Mobile components already handle both price types correctly

## Rollback (If Needed)

```bash
# 1. Stop services
pm2 stop price-worker
./backend/stop.sh

# 2. Rollback migration (optional - doesn't break anything to keep columns)
psql -c "ALTER TABLE pairs DROP COLUMN IF EXISTS gecko_price, DROP COLUMN IF EXISTS gecko_price_usd, ...;"

# 3. Revert code changes
git checkout HEAD~1 backend/internal/models/models.go
git checkout HEAD~1 backend/internal/handlers/handlers.go
git checkout HEAD~1 price-worker/index.js

# 4. Restart
pm2 start price-worker
./backend/start.sh
```

## Support

Questions? Check:
- 📖 Full documentation: `GECKO_PRICE_SEPARATION_FIX.md`
- 🔍 Architecture diagram in the full doc
- 📝 Testing checklist in the full doc

---

**Status:** ✅ Ready to deploy
**Time to run:** ~2 minutes
**Downtime:** ~30 seconds (service restart only)
