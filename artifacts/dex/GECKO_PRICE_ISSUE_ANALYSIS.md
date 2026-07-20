# Gecko Price Override Issue - Analysis & Fix

## Problem Statement
User reports: "When a fill happens, it overrides the gecko prices with backend exchange prices until I refresh the UI."

## Root Cause Analysis

### Price Architecture
The app maintains TWO separate price systems:

1. **Gecko Price** (`geckoPrice`, `geckoPriceUSD`, `geckoPriceChange24h`)
   - Source: GeckoTerminal API via price-worker
   - Updated every 30s by price-worker cache refresh
   - Should be displayed as the DEFAULT price everywhere

2. **Exchange Price** (`price`, `priceUSD`, `lastTradePrice`)
   - Source: Actual fills on our DEX platform  
   - Updated immediately when trades execute
   - Should ONLY be displayed in specific "Exchange" columns

### WebSocket Event Flow

```
Fill Occurs
    ↓
Backend sends "price_update" event
    ├─→ useRealtimePairs receives → Updates pair.price (exchange) ✅
    └─→ usePairWebsocket receives → Updates pair.price (exchange) ✅
    ↓
Backend sends "ticker" event
    ├─→ useRealtimePairs receives → Updates geckoPrice from ticker.last_price
    └─→ usePairWebsocket receives → Updates geckoPrice from ticker.last_price
```

### The Bug

The issue occurs when the backend sends a `ticker` event after a fill with `ticker.last_price` containing the **exchange price** instead of the **gecko price**.

According to the frontend code comments, ticker events should ONLY come from the price-worker with GeckoTerminal data, but the backend appears to be sending ticker events with exchange prices after fills.

## Frontend State

### WebSocket Handlers (CORRECT ✅)
- `useRealtimePairs.ts` line 100: `geckoPrice: newGeckoPrice` from ticker
- `useRealtimePairs.ts` line 136: `price: newPrice` from price_update
- `usePairWebsocket.ts` line 163: `geckoPrice: parseFloat(ticker.last_price)` from ticker
- `usePairWebsocket.ts` line 145: `price: newPrice` from price_update

### Components (CORRECT ✅)
- **MobilePairHeader** line 127: Uses `geckoPrice`
- **MobileTradeView** line 636: Uses `geckoPrice`  
- **MobileMarketsPage** line 209: Uses `geckoPrice` for DisplayPair
- **Desktop TradingPairHeader** line 126: Uses `geckoPrice`

### Fixed Issues
- **MobileMarketsPage** alert notification (line 272): Was using `apiPairs[].price` instead of `DisplayPair.price` → FIXED

## Solution

The user's issue suggests the **backend is sending ticker events with exchange prices**. This requires a backend fix to ensure:

```
ticker.last_price = gecko_price  (from price-worker)
NOT
ticker.last_price = last_trade_price  (from fills)
```

## Verification Steps

1. Monitor WebSocket messages during a fill
2. Check if `ticker` event's `last_price` matches `gecko_price` or `last_trade_price`
3. Verify backend only sends ticker events from price-worker, not from fill processing

## Files Modified

- `artifacts/dex/src/mobile/components/MobileMarketsPage.tsx`
  - Added comment clarifying DisplayPair.price comes from geckoPrice
  - Alert notification now correctly uses DisplayPair.price (which is geckoPrice)

## Backend Action Required

Check `backend` WebSocket ticker event logic to ensure:
- Ticker events after fills do NOT override `last_price` with fill prices
- Only price-worker cache refreshes should update `last_price` in ticker events
- Consider sending TWO separate fields: `gecko_price` and `exchange_price` to avoid ambiguity
