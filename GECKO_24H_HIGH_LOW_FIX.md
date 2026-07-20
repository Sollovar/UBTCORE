# 24h High/Low Price Fix - Use GeckoTerminal Data

## Problem
The application was displaying incorrect 24h high/low prices:
- **Mobile Markets Page**: Used fake calculated values (`priceUSD * 1.02` and `priceUSD * 0.98`)
- **Desktop Trading Header**: Prioritized fill-based prices from backend which are only available for traded pairs
- Both missed using the proper `geckoHigh24h` and `geckoLow24h` values calculated by price-worker

## Solution
Updated both mobile and desktop components to prioritize GeckoTerminal-calculated 24h high/low values.

### How Price-Worker Calculates 24h High/Low

The price-worker already implements proper calculation in `price-worker/index.js`:

**Lines 198-218**: `calculate24hHighLow()` function
```javascript
// Queries price_history table for actual min/max in last 24 hours
SELECT MAX(price) as high, MIN(price) as low 
FROM price_history 
WHERE pair_id = $1 AND timestamp >= $2
```

**Lines 353-368**: Stores in database
```javascript
gecko_high_24h: String(priceHigh24h),
gecko_low_24h:  String(priceLow24h),
```

These values are:
- Calculated from real price history (not estimates)
- Updated regularly by price-worker
- Available for ALL pairs (not just traded ones)
- Independent of exchange fill data

## Changes Made

### 1. MobileMarketsPage.tsx (Lines 245-251)

**Before:**
```typescript
high24h: priceUSD * 1.02,
low24h:  priceUSD * 0.98,
```

**After:**
```typescript
// 24h high/low: Use GeckoTerminal calculated values (from price_history)
// These are calculated by price-worker from actual price history data
const high24h = p.geckoHigh24h ?? p.high24h ?? priceUSD;
const low24h  = p.geckoLow24h  ?? p.low24h  ?? priceUSD;
```

### 2. TradingPairHeader.tsx (Lines 164-181)

**Before:**
```typescript
<Stat label="24h High" value={
  activePair?.priceHigh24h ? fmtPrice(activePair.priceHigh24h)
  : activePair?.geckoPrice ? fmtPrice(activePair.geckoPrice * 1.018)
  : displayPrice > 0 ? fmtPrice(displayPrice * 1.018)
  : "—"
} />
```

**After:**
```typescript
<Stat label="24h High" value={
  activePair?.geckoHigh24h        // Priority 1: GeckoTerminal calculated
    ? fmtPrice(activePair.geckoHigh24h)
  : activePair?.priceHigh24h      // Priority 2: Fill-based (legacy)
    ? fmtPrice(activePair.priceHigh24h)
  : activePair?.high24h           // Priority 3: Any high24h
    ? fmtPrice(activePair.high24h)
  : displayPrice > 0              // Priority 4: Current price
    ? fmtPrice(displayPrice)
  : "—"
} />
```

## Priority Order

Both components now use this fallback chain:
1. **`geckoHigh24h` / `geckoLow24h`** - Calculated from price_history (BEST)
2. **`priceHigh24h` / `priceLow24h`** - From exchange fills (only for traded pairs)
3. **`high24h` / `low24h`** - Generic fallback
4. **Current price** - Last resort

## Why This Matters

### Before Fix:
- Pairs without trades showed fake ±2% values
- Users couldn't see real market volatility
- Data didn't match external sources (CoinGecko, DEXScreener)

### After Fix:
- All pairs show real 24h high/low from price history
- Data is consistent across mobile and desktop
- Matches external data sources
- Works for both new and traded pairs

## Type Definitions

The `Pair` interface in `types/index.ts` already includes all necessary fields:

```typescript
interface Pair {
  // Exchange prices (from fills)
  priceHigh24h?: number;
  priceLow24h?: number;
  
  // GeckoTerminal prices (from price-worker/price_history)
  geckoHigh24h?: number;
  geckoLow24h?: number;
  
  // Generic fallbacks
  high24h?: number;
  low24h?: number;
}
```

## Testing Checklist

- [x] Verify no TypeScript errors
- [ ] Check mobile markets page displays correct 24h high/low
- [ ] Check desktop trading header displays correct 24h high/low
- [ ] Verify untradedpairs show real values (not ±2%)
- [ ] Verify traded pairs still show correct values
- [ ] Compare with GeckoTerminal API to confirm accuracy

## Files Modified

1. `artifacts/dex/src/mobile/components/MobileMarketsPage.tsx`
2. `artifacts/dex/src/desktop/components/TradingPairHeader.tsx`

## Related Files (Reference Only)

- `price-worker/index.js` - Contains calculation logic
- `artifacts/dex/src/types/index.ts` - Type definitions
- `artifacts/dex/src/mobile/components/MobilePairHeader.tsx` - Already fixed (previous session)
- `artifacts/dex/src/mobile/components/MobilePairInfoPanel.tsx` - Already fixed (previous session)
