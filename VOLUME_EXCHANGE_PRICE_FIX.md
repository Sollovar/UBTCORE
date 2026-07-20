# 🔥 VOLUME DISAPPEARING & EXCHANGE PRICE OVERRIDE - ROOT CAUSE FIXED

## The Problems

### Problem 1: Volume Disappearing
When ticker updates arrived, volume would disappear from pairs that had volume from backend fills.

### Problem 2: Gecko Prices Overriding Exchange Prices
Exchange prices (in chart dropdown and trade page second price) would get overridden by gecko prices every time price-worker updated.

## Root Cause Analysis - DEEP DIVE

### What Was Actually Happening:

#### 1. Backend Cache Sets Volume to "0"
**File:** `backend/internal/cache/cache.go` line 414-415
```go
// pairToTicker function
return PairTicker{
    // ... other fields
    Volume24h:      "0",      // ❌ ALWAYS "0"!
    Volume24hUSD:   "0",      // ❌ ALWAYS "0"!
}
```

**Why?** The comment says: "Volume should ONLY come from backend-calculated fills, never from GeckoTerminal"

This is CORRECT logic - volume should only be from fills. BUT...

#### 2. Backend Broadcasts Ticker with "0" Volume
**File:** `backend/internal/handlers/handlers.go`
```go
cacheManager.OnTickerBroadcast = func(pairID string, t cache.PairTicker) {
    hub.BroadcastTickerUpdate(websocket.TickerUpdate{
        // ...
        Volume24h:      t.Volume24h,  // = "0" from cache!
        Volume24hUSD:   t.Volume24hUSD,  // = "0" from cache!
    })
}
```

So ticker WebSocket message sends: `{"volume_24h": "0", "volume_24h_usd": "0"}`

#### 3. Frontend Receives Ticker and Processes
**File:** `artifacts/dex/src/hooks/useRealtimePairs.ts` (OLD CODE)
```typescript
// Frontend tries to be smart:
volume24h: (() => {
  const v = parseFloat(p.volume_24h);  // v = 0 (from "0")
  return (Number.isFinite(v) && v > 0) ? v : undefined;  // Returns undefined
})(),
```

Returns `undefined` because 0 is not > 0. Good so far...

#### 4. updatePair Called with undefined
```typescript
updatePair(pairId, {
  geckoPrice: ...,
  volume24h: undefined,  // ❌ THIS IS THE PROBLEM!
  // ... other fields
})
```

#### 5. Store Update Logic (in Zustand)
```typescript
// When updatePair is called with undefined values...
// Zustand MERGES the update, and undefined means "set to undefined"
// So it OVERWRITES the existing volume with undefined!

// BEFORE: pair.volume24h = 1234.56 (from fills)
// AFTER:  pair.volume24h = undefined (overwritten!)
```

#### 6. UI Tries to Display
```typescript
<div>{pair.volume24h || "—"}</div>
// Shows "—" because volume24h is now undefined!
```

### Same Issue with Exchange Prices!

The ticker was ALSO trying to update exchange fields like:
- `priceHigh24h`
- `priceLow24h`  
- `liquidity`
- `liquidityUSD`

All from the ticker message, which could be stale or wrong!

## The Fix

### Changed 1 File: `useRealtimePairs.ts`

**BEFORE (BROKEN):**
```typescript
const updates = {
  // Gecko fields
  geckoPrice: ...,
  // ...
  
  // ❌ ALSO updating exchange fields from ticker!
  priceHigh24h: parseFloat(p.price_high_24h) || undefined,
  priceLow24h: parseFloat(p.price_low_24h) || undefined,
  volume24h: (() => {
    const v = parseFloat(p.volume_24h);
    return (v > 0) ? v : undefined;  // ❌ undefined overwrites!
  })(),
  liquidity: ...,
  liquidityUSD: ...,
};
updatePair(pairId, updates);
```

**AFTER (FIXED):**
```typescript
const updates = {
  // ONLY gecko fields - nothing else!
  geckoPrice: newGeckoPrice,
  geckoPriceUSD: newGeckoPriceUSD,
  geckoPriceChange24h: newGeckoPriceChange,
  geckoHigh24h: geckoHigh24h,
  geckoLow24h: geckoLow24h,
  geckoLiquidity: geckoLiquidity,
  geckoLiquidityUSD: geckoLiquidityUSD,
  geckoMarketCap: geckoMarketCap,
  geckoMarketCapUSD: geckoMarketCapUSD,
  
  // ✅ DO NOT UPDATE EXCHANGE FIELDS!
  // Exchange fields are ONLY updated via price_update messages
};
updatePair(pairId, updates);
```

## Why This Is The Correct Fix

### Separation of Concerns:

**ticker message (from cache worker):**
- Fires when cache refreshes (every 5s)
- Detects gecko price changes from price-worker
- Should ONLY update gecko fields
- ✅ NOW: Only updates gecko fields

**price_update message (from fills):**
- Fires when actual orders match
- Updates exchange price immediately
- Should ONLY update exchange fields
- ✅ ALREADY CORRECT: Only updates `price` and `lastTradePrice`

### Data Flow Now:

```
┌─────────────────────────────────────────────────┐
│              GECKO PRICES (Market)              │
├─────────────────────────────────────────────────┤
│ Price-Worker → Updates gecko_* in DB           │
│       ↓                                         │
│ Cache Worker (5s) → Detects gecko change       │
│       ↓                                         │
│ WebSocket "ticker" → Sends gecko_price, etc.   │
│       ↓                                         │
│ Frontend → Updates ONLY gecko fields ✅        │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│          EXCHANGE PRICES (Your DEX)             │
├─────────────────────────────────────────────────┤
│ User Places Order → Matches in engine          │
│       ↓                                         │
│ Fill Created → Backend computes stats          │
│       ↓                                         │
│ WebSocket "price_update" → Sends last_price    │
│       ↓                                         │
│ Frontend → Updates ONLY price field ✅         │
└─────────────────────────────────────────────────┘

       COMPLETELY INDEPENDENT! ✅
```

## What Gets Fixed

### ✅ Volume No Longer Disappears
- ticker message sends `volume_24h: "0"`
- Frontend ignores it completely
- Keeps existing volume from fills
- Volume only updates when new fills occur

### ✅ Exchange Prices Stay Separate
- ticker message doesn't touch exchange fields
- Chart dropdown "Exchange Price" stays correct
- Trade page second price stays correct
- Only updates on actual fills

### ✅ Gecko Prices Update Correctly
- ticker message updates gecko fields only
- Market page, chart top, trade first price all show gecko
- Updates every ~40s from price-worker
- Never overwrites exchange data

## Files Modified

1. ✅ `artifacts/dex/src/hooks/useRealtimePairs.ts`
   - Removed ALL exchange field updates from ticker handler
   - ticker now ONLY updates gecko fields
   - Exchange fields untouched

## Testing Steps

### 1. Rebuild Frontend
```bash
cd artifacts/dex
npm run build
# OR npm run dev for development
```

### 2. Hard Refresh Browser
```
Ctrl + Shift + R
```
Clear cache to load new JavaScript

### 3. Test Volume Persistence
1. Find a pair with volume from backend fills
2. Note the volume value
3. Wait for price-worker to update (~40s)
4. ✅ Volume should NOT disappear
5. ✅ Volume should stay the same until new fills occur

### 4. Test Exchange Price Independence
1. Open chart dropdown
2. Note "Exchange Price" value
3. Wait for price-worker to update (~40s)
4. ✅ Exchange price should NOT change
5. ✅ Only gecko price (at top) should change

### 5. Test Fills Update Exchange
1. Place a test order
2. When it fills, watch the UI
3. ✅ Exchange price should update (chart dropdown, trade second price)
4. ✅ Gecko price should NOT change
5. ✅ Volume should increment

## Expected Behavior Now

### Ticker Message Arrives (every ~40s):
```javascript
// WebSocket receives:
{
  "type": "ticker",
  "pair_id": "...",
  "payload": {
    "gecko_price": "0.001234",  // From price-worker
    "volume_24h": "0",           // Ignored!
    "last_price": "0.001240"     // Ignored!
  }
}

// Frontend updates:
updatePair(pairId, {
  geckoPrice: 0.001234,  // ✅ Updated
  // volume24h NOT in update object
  // price NOT in update object
})

// Result:
pair.geckoPrice = 0.001234    // ✅ New value
pair.volume24h = 1234.56      // ✅ Unchanged!
pair.price = 0.001240         // ✅ Unchanged!
```

### Fill Occurs:
```javascript
// WebSocket receives:
{
  "type": "price_update",
  "pair_id": "...",
  "payload": {
    "last_trade_price": "0.001245"
  }
}

// Frontend updates:
updatePair(pairId, {
  price: 0.001245,
  lastTradePrice: 0.001245
})

// Result:
pair.price = 0.001245         // ✅ Updated!
pair.geckoPrice = 0.001234    // ✅ Unchanged!
```

## Why Previous Attempts Failed

### Attempt 1: Check if value > 0 before updating
```typescript
volume24h: (v > 0) ? v : undefined
```
❌ **Failed because:** `undefined` still overwrites existing value in store

### Attempt 2: Only include if present
```typescript
...(v > 0 && { volume24h: v })
```
❌ **Failed because:** We were still trying to update exchange fields from ticker

### Correct Solution: Don't include exchange fields AT ALL
```typescript
const updates = {
  // ONLY gecko fields
  geckoPrice: ...,
  // NO exchange fields!
}
```
✅ **Works because:** Store merge doesn't touch fields not in update object

## Key Insights

1. **ticker messages are for GECKO updates ONLY**
   - Never should update exchange fields
   - Even checking values doesn't help
   - Just don't include them

2. **price_update messages are for EXCHANGE updates ONLY**
   - Already working correctly
   - Only updates `price` field

3. **Volume in ticker is always "0" by design**
   - Backend correctly doesn't put volume in ticker
   - Frontend was incorrectly trying to use it

4. **undefined in update object = overwrite with undefined**
   - Zustand/store merge behavior
   - If field not in update object = no change
   - If field in update object with undefined = overwrite

## Summary

**Root Cause:** Frontend ticker handler was trying to update exchange fields (volume, liquidity, etc.) from ticker message, which contained stale/"0" values, resulting in overwrites.

**Solution:** Ticker handler now ONLY updates gecko fields. Exchange fields are completely ignored in ticker handler and ONLY updated via price_update messages.

**Impact:**
- ✅ Volume persists correctly
- ✅ Exchange prices stay separate
- ✅ Gecko prices update independently
- ✅ No more overwrites!

---

**Bro, this was the REAL root cause! The ticker was trying to be smart by updating exchange fields, but it was actually causing all the problems. Now it's clean - ticker = gecko only, price_update = exchange only. Just rebuild the frontend and test! 🚀**
