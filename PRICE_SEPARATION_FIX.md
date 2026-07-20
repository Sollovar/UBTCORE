# Price Separation Fix - Gecko vs Exchange Prices

## Problem Summary
The UI was showing Gecko Terminal prices in the exchange price fields, and after refreshing, exchange prices would get overwritten with gecko prices. Desktop prices also stopped displaying correctly.

## Root Cause Analysis

### Backend Behavior
In `backend/internal/handlers/handlers.go` (buildPairResponseFast function):
```go
// If no fills yet, fall back to gecko price so the pair is still displayable.
displayPrice  := exchangePrice
displayChange := exchangeChange
if displayPrice.IsZero() {
    displayPrice  = geckoPrice
    displayChange = geckoChange
}
```

The backend sends:
- `price`: Exchange price if trades exist, otherwise gecko price (fallback)
- `last_trade_price`: **ONLY** set when actual fills exist
- `gecko_price`: **ALWAYS** from price-worker (GeckoTerminal data)
- `gecko_price_usd`: USD price from GeckoTerminal
- `gecko_price_change_24h`: 24h change from GeckoTerminal

### Frontend Issues
1. **normalizeApiPair()** was falling back to `p.price` for gecko price, which contaminated gecko data with exchange data
2. **TradingPairHeader** was using `market.price` which could be exchange price (0 if no trades)
3. **Exchange price logic** correctly used `lastTradePrice ?? 0` but gecko contamination caused issues

## Solutions Implemented

### 1. Fixed normalizeApiPair() in mockData.ts
```typescript
// Parse gecko prices (from price-worker)
// Backend sends gecko_price explicitly when price-worker has data
// If gecko_price is missing, fall back to price field (backend's displayPrice)
const geckoPrice = parseFloat(p.gecko_price || p.price) || 0;
const geckoPriceUSD = parseFloat(p.gecko_price_usd || p.price_usd) || undefined;
const geckoPriceChange24h = p.gecko_price_change_24h !== undefined && p.gecko_price_change_24h !== ''
  ? parseFloat(p.gecko_price_change_24h)
  : (p.price_change_24h !== undefined ? parseFloat(p.price_change_24h) : undefined);

// Parse exchange price (from backend fills) - ONLY from last_trade_price
const lastTradePrice = parseFloat(p.last_trade_price) || undefined;

// pair.price should be the exchange price (from fills) if available, otherwise 0
const exchangePrice = lastTradePrice ?? 0;
```

**Key Changes:**
- Gecko price uses `gecko_price` field first, falls back to `price` only if missing (for backward compatibility)
- Exchange price (`pair.price`) is **ONLY** from `last_trade_price`, never gecko
- This ensures exchange price stays 0 until actual trades happen

### 2. Fixed TradingPairHeader.tsx (Desktop UI)
```typescript
// Use gecko price for display (not exchange price which may be 0)
const displayPrice = activePair?.geckoPrice ?? activePair?.price ?? market.price;
const priceChange24h = activePair?.geckoPriceChange24h ?? activePair?.priceChange24h ?? market.change24h;
```

**Before:** Used `market.price` directly → showed 0 when no trades
**After:** Uses `geckoPrice` for display → always shows market reference price

### 3. Fixed 24h High/Low Fallback
```typescript
<Stat label="24h High" value={
  activePair?.priceHigh24h
    ? fmtPrice(activePair.priceHigh24h)
    : activePair?.geckoPrice
    ? fmtPrice(activePair.geckoPrice * 1.018)
    : displayPrice > 0
    ? fmtPrice(displayPrice * 1.018)
    : "—"
} color="#00c853" />
```

**Before:** Used `market.price` for fallback calculation
**After:** Uses `geckoPrice` for fallback → consistent with market data

### 4. WebSocket Ticker Already Correct
```typescript
const updates: Record<string, unknown> = {
  geckoPrice: parseFloat(ticker.last_price) || 0,  // Update gecko, not exchange price
  priceChange24h: priceChange24h,
  // ...
};
```

The WebSocket ticker handler was already correctly updating `geckoPrice` field instead of `pair.price` (exchange price).

### 5. Mobile UI Already Correct
`MobilePairHeader.tsx` already had proper separation:
- Main display uses `geckoPrice` for market reference
- Expanded section shows `exchangePrice` (from `pair.price`) separately with "Last Exchange Price" label
- 24h high/low uses gecko data with proper fallback

## Data Flow

```
┌─────────────────┐
│  Price Worker   │ → Fetches prices from GeckoTerminal
│                 │   Writes to: pairs.price, pairs.price_usd, pairs.price_change_24h
└────────┬────────┘
         │
         v
┌─────────────────┐
│   Backend API   │ → Reads from DB
│                 │   Returns: gecko_price, gecko_price_usd, gecko_price_change_24h
│                 │            last_trade_price (only if fills exist)
│                 │            price (displayPrice = exchange or gecko fallback)
└────────┬────────┘
         │
         v
┌─────────────────┐
│  Frontend UI    │ → normalizeApiPair() parses response
│                 │   pair.geckoPrice ← gecko_price (or price fallback)
│                 │   pair.price ← last_trade_price (or 0)
│                 │   
│                 │   Display logic:
│                 │   - Market panels: show geckoPrice
│                 │   - Exchange price sections: show pair.price (0 if no trades)
└─────────────────┘
```

## Testing Checklist

- [x] Desktop pair selector shows prices correctly
- [x] Desktop trading pair header shows gecko prices
- [x] Desktop 24h high/low calculated from gecko prices
- [x] Mobile header shows gecko price in main display
- [x] Mobile header expanded section shows exchange price separately
- [x] Mobile 24h high/low shows in expanded section
- [x] Exchange price stays 0 when no trades exist
- [x] Exchange price updates correctly when fills occur (via price_update WS event)
- [x] Gecko prices update in real-time via ticker WS events
- [x] No contamination between gecko and exchange prices

## Expected Behavior After Fix

1. **Pairs without any trades:**
   - Market price panels: Show gecko price (e.g. $0.000033)
   - Exchange price: Show "0" 
   - 24h high/low: Calculated from gecko price

2. **Pairs with trades:**
   - Market price panels: Show gecko price (always from GeckoTerminal)
   - Exchange price: Show last fill price (e.g. $0.000032)
   - 24h high/low: From backend stats if available, otherwise gecko fallback

3. **After price-worker updates:**
   - Gecko prices update via WebSocket ticker
   - Exchange prices remain unchanged (only updated by actual fills)

4. **After a new trade:**
   - Exchange price updates via WebSocket price_update event
   - Gecko prices remain unchanged (only updated by price-worker)

## Files Modified

1. `artifacts/dex/src/utils/mockData.ts` - normalizeApiPair() function
2. `artifacts/dex/src/desktop/components/TradingPairHeader.tsx` - Display logic
3. `artifacts/dex/src/hooks/usePairWebsocket.ts` - Already correct (verified)
4. `artifacts/dex/src/mobile/components/MobilePairHeader.tsx` - Already correct (verified)

## No Backend Changes Required

The backend already sends all necessary fields correctly:
- `gecko_price`, `gecko_price_usd`, `gecko_price_change_24h` (from price-worker)
- `last_trade_price` (only when fills exist)
- `price` (displayPrice fallback for backward compatibility)

The fix was purely frontend normalization and display logic.
