# Price Fields Architecture - Complete Guide

## Two Independent Price Systems

Your DEX tracks TWO separate price systems that should NEVER overwrite each other:

### 1. GeckoTerminal Reference Prices (Market Prices)
**Source:** Price-worker fetches from GeckoTerminal API every 39 seconds

**Fields:**
- `geckoPrice` - Market price from GeckoTerminal
- `geckoPriceUSD` - USD value of market price
- `geckoPriceChange24h` - 24h price change from GeckoTerminal

**Purpose:**
- Show users the broader market price
- Display consistent prices even before any trades
- Reference price for all pairs

**Updated by:**
- ✅ Price-worker → PostgreSQL → Backend cache → WebSocket ticker
- ❌ NEVER updated by fills/trades

---

### 2. Exchange Prices (Your Platform's Actual Fills)
**Source:** Your matching engine when orders are filled

**Fields:**
- `price` - Last fill price on your exchange
- `priceUSD` - USD value calculated from last fill
- `priceChange24h` - 24h change based on YOUR fills
- `lastTradePrice` - Most recent trade price

**Purpose:**
- Show users the actual trading price on YOUR platform
- May differ from GeckoTerminal (arbitrage opportunities!)
- Only exists after first trade

**Updated by:**
- ✅ Order fills → Executor → WebSocket price_update
- ❌ NEVER updated by price-worker

---

## UI Display Logic

### Mobile Markets Page
```typescript
// Shows GeckoTerminal prices (market reference)
const price = p.geckoPrice ?? p.price ?? 0;
const change = p.geckoPriceChange24h ?? p.priceChange24h ?? 0;
```

### Mobile Pair Header (Dropdown Menu)
```typescript
// TOP: GeckoTerminal price (market)
const geckoPrice = pair?.geckoPrice ?? pair?.price ?? 0;

// BOTTOM (in dropdown): Exchange price (your platform)
const exchangePrice = pair?.price ?? 0;
```

### Mobile Trade View
```typescript
// Line 1: GeckoTerminal price + change
const geckoPrice = pair?.geckoPrice ?? pair?.price ?? 0;
const geckoChange = pair?.geckoPriceChange24h ?? 0;

// Line 2: Exchange price + change (our platform)
const exchangePrice = pair?.price ?? 0;
const exchangeChange = pair?.priceChange24h ?? 0;
```

---

## WebSocket Message Handling

### Ticker Message (from price-worker updates)
**Broadcast:** Every 5 seconds when cache refreshes

**Purpose:** Update GeckoTerminal reference prices

**Updates ONLY:**
```typescript
{
  geckoPrice: newPrice,          // ✅ Update
  geckoPriceUSD: newPriceUSD,    // ✅ Update
  geckoPriceChange24h: newChange,// ✅ Update
  priceHigh24h: high,            // ✅ Update (24h data)
  priceLow24h: low,              // ✅ Update (24h data)
  volume24h: volume,             // ✅ Update (market volume)
  volume24hUSD: volumeUSD,       // ✅ Update (market volume USD)
  liquidity: liq,                // ✅ Update (pool liquidity)
  liquidityUSD: liqUSD,          // ✅ Update (pool liquidity USD)
}
```

**Does NOT update:**
```typescript
// ❌ price - Exchange price (fills only!)
// ❌ priceUSD - Exchange price USD (fills only!)
// ❌ priceChange24h - Exchange change (fills only!)
// ❌ lastTradePrice - Last fill (fills only!)
```

---

### Price Update Message (from fills)
**Broadcast:** Immediately when an order fills

**Purpose:** Update exchange prices from actual trades

**Updates ONLY:**
```typescript
{
  price: fillPrice,              // ✅ Update
  lastTradePrice: fillPrice,     // ✅ Update
}
```

**Does NOT update:**
```typescript
// ❌ geckoPrice - Market reference (price-worker only!)
// ❌ geckoPriceUSD - Market reference USD (price-worker only!)
// ❌ geckoPriceChange24h - Market change (price-worker only!)
```

---

## Fixed Issues

### ❌ Before Fix:
```typescript
// ticker message updated BOTH systems (WRONG!)
{
  price: newPrice,         // ❌ Overwrote exchange price
  priceChange24h: change,  // ❌ Overwrote exchange change
  geckoPrice: newPrice,    // ✅ Correct
}
```

**Result:**
- Exchange price got overwritten with GeckoTerminal prices
- Lost your platform's actual trading prices
- Volume showed only USD, not quote token amount

### ✅ After Fix:
```typescript
// ticker message updates ONLY gecko fields
{
  geckoPrice: newPrice,         // ✅ Update market price
  geckoPriceChange24h: change,  // ✅ Update market change
  volume24h: volume,            // ✅ Update (with fallback)
  volume24hUSD: volumeUSD,      // ✅ Update (with fallback)
  // price and priceChange24h NOT touched!
}
```

**Result:**
- ✅ GeckoTerminal prices update in real-time
- ✅ Exchange prices stay separate
- ✅ Both systems work independently
- ✅ Volume shows both quote token and USD amounts

---

## Data Flow Diagrams

### GeckoTerminal Price Updates:
```
Price-Worker (39s)
  ↓ Fetches GeckoTerminal API
  ↓ Updates: geckoPrice, geckoPriceChange24h
PostgreSQL
  ↓ Stores in pairs table
Backend Cache (5s)
  ↓ Reads from database
  ↓ Detects gecko price changed
WebSocket Hub
  ↓ Broadcasts ticker message
useRealtimePairs Hook
  ↓ Receives ticker
  ↓ Updates ONLY gecko* fields
Zustand Store
  ↓ Updates pairs array
UI Components
  ↓ Display geckoPrice (market)
  ↓ Display price (exchange) separately
```

### Exchange Price Updates (Fills):
```
User Places Order
  ↓
Matching Engine
  ↓ Order filled!
Executor
  ↓ Updates: price, priceChange24h
  ↓ Broadcasts price_update
WebSocket Hub
  ↓ Sends price_update message
useRealtimePairs Hook
  ↓ Receives price_update
  ↓ Updates ONLY price, lastTradePrice
Zustand Store
  ↓ Updates pairs array
UI Components
  ↓ Display updated exchange price
```

---

## Volume & Liquidity Handling

### Issue: Only USD showing
**Problem:** When `volume24h` or `liquidity` were 0, they disappeared from display

**Fix:** Don't update if value is 0 or not a valid number
```typescript
volume24h: (() => {
  const v = parseFloat(p.volume_24h);
  return (Number.isFinite(v) && v > 0) ? v : undefined;
})(),
```

**Result:** 
- If ticker sends 0, keep existing value
- If ticker sends valid number, update it
- Both quote token and USD amounts show correctly

---

## Field Reference Chart

| Field | Source | Updated By | Used For |
|-------|--------|------------|----------|
| `geckoPrice` | GeckoTerminal | ticker | Market reference price |
| `geckoPriceUSD` | GeckoTerminal | ticker | Market price in USD |
| `geckoPriceChange24h` | GeckoTerminal | ticker | Market 24h change |
| `price` | Your fills | price_update | Exchange price |
| `priceUSD` | Calculated | price_update | Exchange price USD |
| `priceChange24h` | Your fills | price_update | Exchange 24h change |
| `lastTradePrice` | Your fills | price_update | Most recent fill |
| `priceHigh24h` | GeckoTerminal | ticker | 24h high |
| `priceLow24h` | GeckoTerminal | ticker | 24h low |
| `volume24h` | GeckoTerminal | ticker | Market volume (quote) |
| `volume24hUSD` | GeckoTerminal | ticker | Market volume (USD) |
| `liquidity` | GeckoTerminal | ticker | Pool liquidity (quote) |
| `liquidityUSD` | GeckoTerminal | ticker | Pool liquidity (USD) |

---

## Testing

### Test GeckoTerminal Updates:
1. Start price-worker
2. Wait 39 seconds (price-worker cycle)
3. Check UI - `geckoPrice` should update
4. Exchange price should NOT change

### Test Exchange Updates:
1. Place and fill an order
2. Exchange price updates immediately
3. GeckoTerminal price should NOT change

### Test Both Systems:
1. Compare displayed "Market Price" vs "Exchange Price"
2. They should be different (unless identical by coincidence)
3. Both should update independently
4. Flash animation works for both

---

## Summary

**Two Independent Systems:**
1. **Market Prices** (geckoPrice) - External reference, updated by price-worker
2. **Exchange Prices** (price) - Your platform, updated by fills

**Critical Rules:**
- ✅ ticker updates gecko* fields only
- ✅ price_update updates price/lastTradePrice only
- ❌ NEVER mix the two systems
- ✅ UI displays both prices separately

**Result:**
- Users see market reference AND your platform's actual prices
- Can identify arbitrage opportunities
- Both systems update in real-time
- No data corruption between systems

---

**Status:** ✅ Fixed properly
**Files Changed:** `useRealtimePairs.ts`
**Impact:** Clean separation of market vs exchange prices
