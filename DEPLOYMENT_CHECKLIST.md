# Gecko/Exchange Price Separation - Deployment Checklist

## Pre-Deployment

### 1. Backup Database
```bash
pg_dump -h YOUR_HOST -U YOUR_USER -d YOUR_DB > backup_before_gecko_migration_$(date +%Y%m%d_%H%M%S).sql
```
⏱️ **Time:** 1-5 minutes depending on database size
✅ **Status:** [ ]

### 2. Verify All Services Running
```bash
# Check backend
curl http://localhost:8080/health

# Check price-worker
pm2 list | grep price-worker

# Check frontend
curl http://localhost:3000 || curl http://localhost:5173
```
✅ **Status:** [ ]

### 3. Note Current Behavior
Test and document current UI behavior for comparison:
- [ ] Mobile Market page: Note top price value
- [ ] Mobile Chart dropdown: Note "Exchange Price" value  
- [ ] Mobile Trade page: Note both price values
- [ ] Screenshot or record values for comparison

✅ **Status:** [ ]

---

## Deployment Steps

### Step 1: Stop Services (30 seconds)
```bash
# Stop price-worker
pm2 stop price-worker

# Stop backend
./backend/stop.sh
# or
pkill -f "your-backend-binary"
```
⏱️ **Time:** 30 seconds
✅ **Status:** [ ]

### Step 2: Run Database Migration (10 seconds)
```bash
cd backend
psql -h YOUR_HOST -U YOUR_USER -d YOUR_DB -f migrations/001_add_gecko_columns.sql
```

**Expected output:**
```
ALTER TABLE
UPDATE 123
COMMENT
COMMENT
COMMENT
COMMENT
COMMENT
```

⏱️ **Time:** 10 seconds
✅ **Status:** [ ]

### Step 3: Start Backend (10 seconds)
```bash
cd backend
./start.sh
# or your deployment method
```

**Check logs:**
```bash
tail -f backend/logs/app.log
```

Look for: No errors about missing `gecko_*` columns

⏱️ **Time:** 10 seconds
✅ **Status:** [ ]

### Step 4: Start Price-Worker (5 seconds)
```bash
cd price-worker
pm2 start index.js --name price-worker
# or
pm2 restart price-worker
```

**Check logs:**
```bash
pm2 logs price-worker --lines 50
```

Look for:
- ✅ `[PriceWorker] Sync @ ...`
- ✅ `... prices synced`
- ❌ No SQL errors

⏱️ **Time:** 5 seconds
✅ **Status:** [ ]

### Step 5: Clear Cache (5 seconds)
```bash
curl -X POST http://localhost:8080/api/v1/cache/clear
```

Or connect to Redis:
```bash
redis-cli FLUSHDB
```

⏱️ **Time:** 5 seconds
✅ **Status:** [ ]

### Step 6: Verify API Response (10 seconds)
```bash
curl http://localhost:8080/api/v1/pairs?limit=1 | jq
```

**Look for:**
```json
{
  "data": [{
    "gecko_price": "0.001234",      ✅ Present
    "gecko_price_usd": "0.789",     ✅ Present
    "gecko_price_change_24h": "2.3",✅ Present
    "price": "0.001240",            ✅ Present
    "price_usd": "0.792"            ✅ Present
  }]
}
```

⏱️ **Time:** 10 seconds
✅ **Status:** [ ]

---

## Post-Deployment Verification

### Automated Tests
Run the verification script:

**Linux/Mac:**
```bash
chmod +x verify_price_separation.sh
./verify_price_separation.sh
```

**Windows:**
```powershell
.\verify_price_separation.ps1
```

⏱️ **Time:** 30 seconds
✅ **Status:** [ ]

### Manual UI Tests

#### Test 1: Mobile Market Page
1. Open mobile view (or use DevTools mobile emulation)
2. Navigate to Markets page
3. Observe top price for any pair
4. **Expected:** Price updates every ~39 seconds (gecko updates)
5. **Screenshot:** [ ]

⏱️ **Time:** 1 minute
✅ **Status:** [ ]

#### Test 2: Mobile Chart View
1. Open mobile view
2. Select a trading pair
3. Navigate to Chart tab
4. Check top-right corner price
5. Click dropdown arrow next to price
6. **Expected:** 
   - Top price = Gecko price (market reference)
   - Dropdown "Last Exchange Price" = Different value (if fills exist)
7. **Screenshot:** [ ]

⏱️ **Time:** 1 minute
✅ **Status:** [ ]

#### Test 3: Mobile Trade Page
1. Open mobile view
2. Navigate to Trade tab
3. Select a pair with fills
4. **Expected:**
   - First price (top) = Gecko price
   - Second price (below) = Exchange price
   - Values may be different
5. **Screenshot:** [ ]

⏱️ **Time:** 1 minute
✅ **Status:** [ ]

#### Test 4: Price Updates
1. Keep Trade page open
2. Place a test order (small amount)
3. **Expected:**
   - Exchange price updates immediately (if order fills)
   - Gecko price does NOT update
4. Wait 39 seconds
5. **Expected:**
   - Gecko price updates
   - Exchange price stays same (unless new fill)

⏱️ **Time:** 2 minutes
✅ **Status:** [ ]

### Log Verification

#### Price-Worker Logs
```bash
pm2 logs price-worker --lines 100
```

**Look for:**
- ✅ `gecko_price`, `gecko_price_usd` in update logs
- ❌ No errors about missing columns
- ❌ No `price`, `price_usd` being updated (only `gecko_*`)

✅ **Status:** [ ]

#### Backend Logs
```bash
tail -f backend/logs/app.log
```

**Look for:**
- ✅ Successful pair fetches
- ✅ `gecko_*` fields being read
- ❌ No SQL errors

✅ **Status:** [ ]

#### Browser Console
1. Open DevTools (F12)
2. Navigate to Console tab
3. Filter for errors (red)
4. **Expected:** No errors related to prices

✅ **Status:** [ ]

---

## Rollback Plan (If Needed)

### Emergency Rollback
If critical issues occur:

```bash
# 1. Stop services
pm2 stop price-worker
./backend/stop.sh

# 2. Restore database (optional - columns are backward compatible)
psql -h YOUR_HOST -U YOUR_USER -d YOUR_DB < backup_before_gecko_migration_*.sql

# 3. Revert code
git checkout HEAD~1 backend/internal/models/models.go
git checkout HEAD~1 backend/internal/handlers/handlers.go
git checkout HEAD~1 price-worker/index.js
git checkout HEAD~1 artifacts/dex/src/types/index.ts
git checkout HEAD~1 artifacts/dex/src/hooks/useRealtimePairs.ts

# 4. Rebuild backend
cd backend && go build

# 5. Restart services
./backend/start.sh
cd price-worker && pm2 start index.js --name price-worker
```

⏱️ **Time:** 3-5 minutes
✅ **Status:** [ ]

---

## Success Criteria

### Critical (Must Pass)
- [ ] Backend starts without errors
- [ ] Price-worker runs without SQL errors
- [ ] API returns `gecko_price` and `price` fields
- [ ] Mobile UI displays prices correctly
- [ ] No console errors in browser

### Important (Should Pass)
- [ ] Gecko prices update every 39 seconds
- [ ] Exchange prices update on fills
- [ ] Chart dropdown shows separate exchange price
- [ ] Trade page shows both price types

### Nice to Have (May Pass)
- [ ] Prices are different (indicates fills exist)
- [ ] Volume shows correctly
- [ ] Liquidity shows correctly

---

## Monitoring (First 24 Hours)

### Hourly Checks
- [ ] Price-worker still running (`pm2 list`)
- [ ] No backend errors (`tail backend/logs/app.log`)
- [ ] No unusual error rate in browser console

### Daily Checks
- [ ] Database size reasonable (gecko columns not exploding)
- [ ] API response times normal
- [ ] User reports of pricing issues (should be zero)

---

## Deployment Summary

| Step | Time | Status |
|------|------|--------|
| Pre-Deployment | 5-10 min | [ ] |
| Migration | 1 min | [ ] |
| Verification | 5 min | [ ] |
| **Total** | **~15 min** | [ ] |

**Downtime:** ~30 seconds (service restart only)

---

## Sign-Off

- [ ] Database migration completed
- [ ] Backend deployed and verified
- [ ] Price-worker running correctly
- [ ] Frontend tested on mobile
- [ ] No critical errors
- [ ] Rollback plan ready (just in case)
- [ ] Monitoring in place

**Deployed by:** _________________  
**Date:** _________________  
**Time:** _________________  

---

## Support Contacts

If issues arise:
- **Developer:** Check GECKO_PRICE_SEPARATION_FIX.md
- **Database:** Verify migration script output
- **API:** Check backend logs
- **UI:** Check browser console

**Status:** 🟢 Ready for Deployment
