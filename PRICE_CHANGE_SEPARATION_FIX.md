# Price Change Separation Fix - FINAL

## Issue
1. Exchange price change from backend fills was updating the Gecko price change column ❌
2. Exchange price change wasn't updating in real-time on desktop UI after fills ❌
3. Gecko price change should ONLY come from GeckoTerminal, never from backend ✅

## Root Cause

The backend sends ticker messages with a `source` field:
- `source: 'fill'` - From actual backend fill with calculated exchange price change
- `source: 'cache_refresh'` - Periodic refresh from cache
- `source: undefined` - Regular ticker update

The WebSocket handler in `usePairWebsocket.ts` was:
1. NOT checking the `source` field
2. NOT updating `priceChange24h` at all (after our first fix attempt)
3. This caused exchange price change to NOT update in real-time on desktop

Meanwhile, `useRealtimePairs.ts` correctly checks for `source === 'fill'` before updating exchange price change, which is why mobile worked!

## Solution

Updated `usePairWebsocket.ts` to match the logic in `useRealtimePairs.ts`:

### Key Changes (Lines 160-198):

```typescript
const isCacheRefresh = ticker.source === 'cache_refresh';
const isFill = ticker.source === 'fill';  // ✅ NEW: Check if from fill
const priceChange24h = parseFloat(ticker.price_change_24h) || 0;

if (!isCacheRefresh) {
  updates.price = parseFloat(ticker.last_price) || 0;
  
  // Only update priceChange24h when source is 'fill' (actual backend calculation)
  // This is the EXCHANGE price change, not gecko price change
  if (isFill && priceChange24h !== 0) {
    updates.priceChange24h = priceChange24h;  // ✅ CORRECT: Only on fill
  }
  
  // ... rest of updates
  
  // Use the appropriate price change for trending score
  const currentPriceChange = isFill && priceChange24h !== 0 
    ? priceChange24h 
    : (currentPair?.priceChange24h ?? 0);
  updates.trendingScore = calculateTrendingScore(effectiveVolume, effectiveLiquidity, currentPriceChange);
}
```

### Gecko Price Change Handling (Lines 221-251):

Gecko price change continues to be handled separately and correctly:

```typescript
const geckoPriceChange24h = ticker.gecko_price_change_24h != null && ticker.gecko_price_change_24h !== ''
  ? parseFloat(ticker.gecko_price_change_24h)
  : undefined;

if (geckoPriceChange24h != null && !Number.isNaN(geckoPriceChange24h)) {
  updates.geckoPriceChange24h = geckoPriceChange24h;  // ✅ Separate field
}
```

## Data Flow After Fix

### When Order is Filled:

**Backend:**
```
Fill occurs → Calculate exchange stats → Send WebSocket
{
  type: 'ticker',
  source: 'fill',  // ✅ Key indicator
  last_price: "50000",
  price_change_24h: "5.5",  // Exchange price change
  gecko_price_change_24h: "2.3"  // Gecko price change (separate)
}
```

**Frontend (usePairWebsocket):**
```
1. Check source === 'fill' ✅
2. Update price (exchange) ✅
3. Update priceChange24h (exchange) ✅ ONLY on fill
4. Update geckoPriceChange24h (gecko) ✅ Separate field
```

**Frontend (useRealtimePairs):**
```
Same logic - already working correctly for mobile ✅
```

## Result

### Before Fix:
```
Fill order:
- Desktop: Exchange price updates ✅, Exchange price change doesn't update ❌
- Mobile: Exchange price updates ✅, Exchange price change updates ✅
- Gecko price change: Shows exchange data ❌ (WRONG!)
```

### After Fix:
```
Fill order:
- Desktop: Exchange price updates ✅, Exchange price change updates ✅
- Mobile: Exchange price updates ✅, Exchange price change updates ✅
- Gecko price change: Shows GeckoTerminal data ✅ (CORRECT!)
```

## Why It Works Now

1. **Exchange price change** (`priceChange24h`):
   - ✅ Only updated when `source === 'fill'`
   - ✅ Real-time updates on both desktop and mobile
   - ✅ Based on actual backend calculations from fills

2. **Gecko price change** (`geckoPriceChange24h`):
   - ✅ Always comes from `gecko_price_change_24h` field
   - ✅ Never affected by fill updates
   - ✅ Pure GeckoTerminal market reference data

3. **Separation is maintained:**
   - Exchange data → Exchange columns
   - Gecko data → Gecko columns
   - No cross-contamination!

## Files Modified
- ✅ `artifacts/dex/src/hooks/usePairWebsocket.ts` - Lines 160-198

## Testing
- [x] Fill an order on backend
- [x] Verify exchange price updates in real-time (both mobile and desktop)
- [x] Verify exchange price change updates in real-time (both mobile and desktop)
- [x] Verify Gecko price change stays showing GeckoTerminal data (not affected by fills)
- [x] Verify trending score calculates correctly using the right price change values
