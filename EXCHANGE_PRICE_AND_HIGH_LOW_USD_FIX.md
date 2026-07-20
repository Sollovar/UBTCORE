# Exchange Price Change & 24h High/Low USD Equivalent Fix

## Problem
1. **Desktop Header**: Exchange Price column didn't show the price change percentage (backend-calculated from fills)
2. **Mobile & Desktop**: 24h high/low prices didn't show their USD equivalent values

## Solution
Added missing exchange price change percentage and USD equivalents for 24h high/low prices across all UI components.

## Changes Made

### 1. Desktop Trading Pair Header (`TradingPairHeader.tsx`)

#### A. Added Exchange Price Change Calculation
**Lines ~118-123**: Added exchange price change variables
```typescript
// Exchange price change = computed from our backend fills (NOT gecko)
const exchangeChange = activePair?.priceChange24h ?? 0;
const exchangeChangeColor = exchangeChange >= 0 ? "#00c853" : "#ff4d6a";
```

#### B. Updated Exchange Price Display
**Lines ~179-193**: Replaced `<Stat>` with inline display showing price + change %
```typescript
<div className="flex flex-col justify-center leading-none shrink-0 gap-0.5">
  <span className="text-[11px] text-[#555]">Exchange Price</span>
  <div className="flex items-center gap-2">
    <span className="text-[13px] tabular-nums font-medium">
      {exchangePrice > 0 ? fmtPrice(exchangePrice) : "0"}
    </span>
    {exchangePrice > 0 && exchangeChange !== 0 && (
      <span className="text-[11px] tabular-nums font-medium" style={{ color: exchangeChangeColor }}>
        {exchangeChange >= 0 ? "+" : ""}{exchangeChange.toFixed(2)}%
      </span>
    )}
  </div>
  {exchangePrice > 0 && exchangePriceUSD > 0 && (
    <span className="text-[10px] tabular-nums" style={{ color: "#666" }}>
      ≈ {fmtUsdBrief(exchangePriceUSD)}
    </span>
  )}
</div>
```

**Result**: Exchange price now displays like:
```
Exchange Price
1.2345  +2.45%
≈ $0.15
```

#### C. Added USD Equivalent to 24h High/Low
**Lines ~164-181**: Added `valueSecondary` prop with USD calculation
```typescript
<Stat label="24h High" 
  value={...} 
  valueSecondary={
    activePair?.geckoHigh24h && quoteTokenUSDRate > 0
      ? "≈ " + fmtUsdBrief(activePair.geckoHigh24h * quoteTokenUSDRate)
      : undefined
  } 
  color="#00c853" 
/>
```

**Result**: Desktop header now shows:
```
24h High          24h Low
0.1234            0.1100
≈ $0.015          ≈ $0.013
```

---

### 2. Mobile Pair Header (`MobilePairHeader.tsx`)

#### Added USD Equivalent to 24h High/Low in Expanded Section
**Lines ~245-266**: Added USD equivalent display below high/low prices

```typescript
<div className="flex flex-col gap-0.5 pt-3">
  <span className="text-[11px] font-medium">24h High</span>
  <span className="text-[13px] font-semibold tabular-nums" style={{ color: "#00c853" }}>
    {high24h > 0 ? formatPriceForDisplay(high24h) : "—"}
  </span>
  {high24h > 0 && quoteTokenUSDRate > 0 && (
    <span className="text-[10px] tabular-nums" style={{ color: "var(--m-fg-5)" }}>
      ≈ {fmtUsdHeader(high24h * quoteTokenUSDRate)}
    </span>
  )}
</div>
```

**Result**: Mobile dropdown now shows:
```
24h High                    24h Low
0.1234                      0.1100
≈ $0.015                    ≈ $0.013
```

**Note**: Mobile header already had exchange price change implemented correctly (line 278-282)

---

### 3. Mobile Pair Info Panel (`MobilePairInfoPanel.tsx`)

#### A. Added Quote Token USD Rate Calculation
**Lines ~287-294**: Calculate the quote token USD rate
```typescript
// Calculate quote token USD rate for high/low conversion
const geckoRateDenom = p.geckoPrice ?? p.price ?? 0;
const geckoRateNumer = p.geckoPriceUSD ?? p.priceUSD ?? 0;
const quoteTokenUSDRate = (geckoRateDenom > 0 && geckoRateNumer > 0)
  ? geckoRateNumer / geckoRateDenom
  : 0;
```

#### B. Calculate USD Equivalents
**Lines ~299-301**: Pre-calculate USD values
```typescript
const high24hUSD = high24h > 0 && quoteTokenUSDRate > 0 ? high24h * quoteTokenUSDRate : 0;
const low24hUSD = low24h > 0 && quoteTokenUSDRate > 0 ? low24h * quoteTokenUSDRate : 0;
```

#### C. Updated 24h High/Low Display
**Lines ~371-390**: Replaced simple `<SRow>` with custom display including USD
```typescript
<div className="flex items-center justify-between py-2.5" style={{ borderBottom: "1px solid var(--m-bdr)" }}>
  <span className="text-[12px]">24h High</span>
  <div className="flex flex-col items-end gap-0.5">
    <span className="text-[12px] font-semibold" style={{ color: "#00c853" }}>
      {fmtPrice(high24h)}
    </span>
    {high24hUSD > 0 && (
      <span className="text-[10px] tabular-nums" style={{ color: "var(--m-fg-5)" }}>
        ≈ {fmtUsd(high24hUSD)}
      </span>
    )}
  </div>
</div>
```

**Result**: Mobile info panel now shows:
```
24h High              0.1234
                      ≈ $0.015

24h Low               0.1100
                      ≈ $0.013
```

---

## How USD Conversion Works

All components use the same calculation method:

1. **Get Quote Token USD Rate**:
   ```typescript
   quoteTokenUSDRate = geckoPriceUSD / geckoPrice
   ```
   This gives us the USD value of 1 unit of the quote token (e.g., 1 WBNB = $600)

2. **Convert High/Low to USD**:
   ```typescript
   high24hUSD = high24h * quoteTokenUSDRate
   low24hUSD = low24h * quoteTokenUSDRate
   ```
   
3. **Example**:
   - Pair: TOKEN/WBNB
   - 24h High: 0.0015 WBNB
   - WBNB USD Rate: $600
   - Result: 0.0015 × $600 = **$0.90**

## Visual Changes Summary

### Desktop Header
```
Before:
Exchange Price
1.2345
≈ $0.15

After:
Exchange Price
1.2345  +2.45%    ← NEW: Shows backend-calculated change %
≈ $0.15
```

### Mobile & Desktop 24h High/Low
```
Before:
24h High
0.1234

After:
24h High
0.1234
≈ $0.015          ← NEW: Shows USD equivalent
```

## Data Sources

- **Exchange Price**: `pair.price` (from backend fills via WebSocket)
- **Exchange Price Change**: `pair.priceChange24h` (calculated by backend from fills)
- **24h High/Low**: `pair.geckoHigh24h` / `pair.geckoLow24h` (from price-worker)
- **USD Rate**: `pair.geckoPriceUSD / pair.geckoPrice` (stable GeckoTerminal reference)

## Color Coding

- **Exchange Price Change**: 
  - Green `#00c853` for positive
  - Red `#ff4d6a` for negative
- **24h High**: Green `#00c853`
- **24h Low**: Red `#ff4d6a` or `#ff1744`

## Files Modified

1. `artifacts/dex/src/desktop/components/TradingPairHeader.tsx`
2. `artifacts/dex/src/mobile/components/MobilePairHeader.tsx`
3. `artifacts/dex/src/mobile/components/MobilePairInfoPanel.tsx`

## Testing Checklist

- [x] No TypeScript compilation errors
- [ ] Desktop header shows exchange price with change %
- [ ] Desktop 24h high/low show USD equivalent below
- [ ] Mobile header expanded section shows 24h high/low USD equivalent
- [ ] Mobile info panel shows 24h high/low USD equivalent
- [ ] USD values calculate correctly (high/low × quote token USD rate)
- [ ] Colors display correctly (green for high, red for low, green/red for change)
- [ ] USD equivalent only shows when values are > 0
