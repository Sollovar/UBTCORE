# Liquidity Column Zero Display Fix

## Problem
When orders were filled and liquidity was removed from the orderbook, the liquidity and volume columns in both mobile and desktop market pages would display `0` instead of the correct remaining amounts. The correct values only appeared after a full page refresh.

## Root Cause
The WebSocket ticker messages that arrive after order fills sometimes contain:
- Empty string `liquidity: ""` or `volume_24h: ""`
- Zero value `liquidity: "0"` or `volume_24h: "0"`
- Missing liquidity/volume fields entirely

The real-time update handlers in two hooks were **unconditionally** overwriting the liquidity and volume24h values even when the incoming data was invalid or zero, replacing the correct cached values with `0`.

### Affected Files
1. **`usePairWebsocket.ts`** - Single-pair WebSocket handler
2. **`useRealtimePairs.ts`** - Multi-pair WebSocket handler

## Solution

### Fixed in `usePairWebsocket.ts` (Lines 173-187)
**Before:**
```typescript
const volume24h = parseFloat(ticker.volume_24h) || 0;
const liquidity = ticker.liquidity ? parseFloat(ticker.liquidity) : 0;
// ...
updates.volume24h = volume24h; // ❌ Always set, even if 0
updates.liquidity = liquidity; // ❌ Always set, even if 0
updates.trendingScore = calculateTrendingScore(volume24h, liquidity, priceChange24h);
```

**After:**
```typescript
const volume24h = parseFloat(ticker.volume_24h) || 0;
const liquidity = ticker.liquidity ? parseFloat(ticker.liquidity) : 0;
// ...
// Only update volume24h if we have a valid non-zero value
if (volume24h > 0) {
  updates.volume24h = volume24h;
}
// Only update liquidity if we have a valid non-zero value
if (liquidity > 0) {
  updates.liquidity = liquidity;
}
// Get current pair's volume and liquidity for trending score calculation
const store = getStore();
const currentPair = store.pairs.find(p => p.id === ticker.pair_id);
const effectiveVolume = volume24h > 0 ? volume24h : (currentPair?.volume24h ?? 0);
const effectiveLiquidity = liquidity > 0 ? liquidity : (currentPair?.liquidity ?? 0);
updates.trendingScore = calculateTrendingScore(effectiveVolume, effectiveLiquidity, priceChange24h);
```

### Fixed in `useRealtimePairs.ts` (Lines 218-224)
**Before:**
```typescript
if (newVolume24h != null && !Number.isNaN(newVolume24h)) {
  updates.volume24h = newVolume24h; // ❌ Could set to 0
}
if (newLiquidity != null && !Number.isNaN(newLiquidity)) {
  updates.liquidity = newLiquidity; // ❌ Could set to 0
}
if (newLiquidityUSD != null && !Number.isNaN(newLiquidityUSD)) {
  updates.liquidityUSD = newLiquidityUSD; // ❌ Could set to 0
}
```

**After:**
```typescript
if (newVolume24h != null && !Number.isNaN(newVolume24h) && newVolume24h > 0) {
  updates.volume24h = newVolume24h; // ✅ Only update if > 0
}
if (newLiquidity != null && !Number.isNaN(newLiquidity) && newLiquidity > 0) {
  updates.liquidity = newLiquidity; // ✅ Only update if > 0
}
if (newLiquidityUSD != null && !Number.isNaN(newLiquidityUSD) && newLiquidityUSD > 0) {
  updates.liquidityUSD = newLiquidityUSD; // ✅ Only update if > 0
}
```

## Impact
- ✅ Liquidity column now preserves correct values during real-time order fills
- ✅ Volume column now preserves correct values during real-time order fills
- ✅ No more incorrect "0 WBNB" or "0" display
- ✅ Trending score calculation uses correct volume and liquidity even when ticker data is incomplete
- ✅ Works for both mobile and desktop market views
- ✅ Consistent with how `volume24hUSD` and `liquidityUSD` were already being handled

## Testing Recommendations
1. Place and fill an order on any trading pair
2. Watch the liquidity and volume columns in the markets page (both mobile and desktop)
3. Verify they show the correct remaining amounts, not 0
4. Verify the trending score also updates correctly
5. Check that liquidity USD and volume USD also display correctly

## Related Components
- `MobileMarketsPage.tsx` - Mobile market list with liquidity and volume columns
- `DesktopPairsTable.tsx` - Desktop pairs table with liquidity and volume columns
- `MobileMarketSelectPanel.tsx` - Mobile pair selection with liquidity
- `useStore.ts` - Zustand store that holds pair data including volume and liquidity values
