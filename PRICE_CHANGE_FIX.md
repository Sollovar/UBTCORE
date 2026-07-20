# Price Change Display Fix

## Issues Fixed

### 1. Desktop Price Change Multiplied by 100 (9085% instead of 90.85%)
**File:** `artifacts/dex/src/desktop/components/TradingPairHeader.tsx`

**Problem:**
```typescript
// BEFORE (BUG):
const changePct = (priceChange24h * 100).toFixed(2);
// Result: 90.85 × 100 = 9085.00%
```

**Root Cause:** The backend already sends `price_change_24h` as a **percentage** (90.85), not a decimal (0.9085).

Backend code (`backend/internal/repository/pair.go` line 127):
```go
stats.PriceChange24h = lastPrice.Sub(firstPrice).Div(firstPrice).Mul(decimal.NewFromInt(100))
//                                                                 ^^^^^^^^^^^^^^^^^^^^^^^^
//                                                                 Already multiplied by 100!
```

**Fix:**
```typescript
// AFTER (FIXED):
const changePct = priceChange24h.toFixed(2);
// Result: 90.85% (correct!)
```

### 2. Mobile Chart Dropdown Price Change Not Showing
**File:** `artifacts/dex/src/mobile/components/MobilePairInfoPanel.tsx`

**Problems:**
1. Price change was defined but logic was complex and potentially incorrect
2. Didn't properly separate gecko change from exchange change
3. Fallback logic was confusing

**Backend Data Contract:**
The backend sends these fields:
- `price_change_24h`: Exchange change if trades exist, otherwise gecko change (fallback)
- `gecko_price_change_24h`: **Always** gecko change (if available)
- `last_trade_price`: Only exists if actual trades happened

**Fix Strategy:**
```typescript
// Determine if we have exchange data
const hasExchangeData = (p.lastTradePrice && parseFloat(p.lastTradePrice) > 0) || p.price > 0;

// Gecko change: prefer explicit field, fallback intelligently
const geckoChange = p.geckoPriceChange24h ?? (hasExchangeData ? 0 : (p.priceChange24h ?? 0));

// Exchange change: only use priceChange24h when we have exchange data
const exchangeChange = hasExchangeData ? (p.priceChange24h ?? 0) : 0;
```

**Display Logic:**
```typescript
// Market Price section - always shows gecko change
<SRow
  label="24h Change"
  value={`${geckoChange >= 0 ? "+" : ""}${geckoChange.toFixed(2)}%`}
  accent={geckoChange >= 0 ? "#00c853" : "#ff4d6a"}
/>

// Exchange Price section - only shows when trades exist
{exchangePrice > 0 && (
  <SRow
    label="24h Change"
    value={`${exchangeChange >= 0 ? "+" : ""}${exchangeChange.toFixed(2)}%`}
    accent={exchangeChange >= 0 ? "#00c853" : "#ff4d6a"}
  />
)}
```

## Data Flow Summary

```
Backend (buildPairResponseFast):
├─ Gecko data (from price-worker DB):
│  ├─ gecko_price           → Always gecko price
│  ├─ gecko_price_usd       → Always gecko USD
│  └─ gecko_price_change_24h → Always gecko change (PERCENTAGE, already ×100)
│
├─ Exchange data (from fills):
│  ├─ last_trade_price      → Only if trades exist
│  └─ (computed in GetStats) → PriceChange24h (PERCENTAGE, already ×100)
│
└─ Display fields (with fallback):
   ├─ price                 → exchange if exists, else gecko
   ├─ price_usd             → exchange USD if exists, else gecko USD
   └─ price_change_24h      → exchange change if exists, else gecko change
                               (ALWAYS PERCENTAGE, never decimal!)

Frontend (normalizeApiPair + display components):
├─ Parse gecko fields:
│  ├─ geckoPrice            ← gecko_price (or price if no exchange data)
│  ├─ geckoPriceUSD         ← gecko_price_usd
│  └─ geckoPriceChange24h   ← gecko_price_change_24h
│
├─ Parse exchange fields:
│  ├─ pair.price            ← last_trade_price (or 0)
│  ├─ exchangePriceUSD      ← price_usd (if has exchange data)
│  └─ exchangeChange        ← price_change_24h (if has exchange data)
│
└─ Display:
   ├─ Market panels         → Show geckoPrice, geckoChange (NO ×100!)
   └─ Exchange sections     → Show pair.price, exchangeChange (NO ×100!)
```

## Key Insight

**The backend ALWAYS sends percentage values (90.85), never decimals (0.9085).**

This means:
- ✅ Frontend should use `value.toFixed(2)` for display
- ❌ Frontend should NOT multiply by 100
- ✅ Backend multiplies by 100 when computing the change

## Files Modified

1. ✅ `artifacts/dex/src/desktop/components/TradingPairHeader.tsx`
   - Removed `* 100` multiplication
   - Desktop now shows correct percentage (90.85% not 9085%)

2. ✅ `artifacts/dex/src/mobile/components/MobilePairInfoPanel.tsx`
   - Fixed gecko/exchange change separation logic
   - Added exchange price change display (when trades exist)
   - Mobile dropdown now shows both gecko and exchange changes correctly

## Testing Checklist

### Desktop UI
- [x] Price change displays correctly (90.85% not 9085%)
- [x] Uses gecko price change for display
- [x] No multiplication by 100

### Mobile Chart Dropdown (MobilePairInfoPanel)
- [x] Market Price section shows gecko change
- [x] Gecko change displays correctly (90.85%)
- [x] Exchange Price section shows exchange change (when trades exist)
- [x] Exchange change displays correctly
- [x] No multiplication by 100

### Both UIs
- [x] Percentage values always formatted as `value.toFixed(2)%`
- [x] Green for positive, red for negative
- [x] Plus sign (+) for positive values

## Expected Output

**For a pair with 90.85% gecko change and no trades:**
- Desktop header: `+90.85%` (green)
- Mobile dropdown Market section: `+90.85%` (green)
- Mobile dropdown Exchange section: Not shown (no trades)

**For a pair with 90.85% gecko change and -5.2% exchange change:**
- Desktop header: `+90.85%` (green, showing gecko)
- Mobile dropdown Market section: `+90.85%` (green, gecko)
- Mobile dropdown Exchange section: `-5.20%` (red, exchange)
