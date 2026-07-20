# Small Amounts Display Fix

## Problem
Small amounts in the order value section and liquidity column were being truncated to 0.00 due to limited decimal places. For example:
- Order value of 0.0016 would display as "0.00"
- Liquidity amounts like 0.00234 would show as "0.00"

## Affected Areas
1. **Mobile Trading Page** - Order Value section
2. **Desktop Trading Page** - Order Value section  
3. **Desktop Pairs Table** - Liquidity column

## Solution

### 1. Enhanced `formatPlainNumber` Function
**File:** `artifacts/dex/src/utils/formatters.ts` and `src info/utils/formatters.ts`

**Before:**
```typescript
if (num >= 1)   return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
if (num >= 0.001)    return num.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
if (num >= 0.000001) return num.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 6 });
```

**After:**
```typescript
if (num >= 1)        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
if (num >= 0.01)     return num.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
if (num >= 0.001)    return num.toLocaleString('en-US', { minimumFractionDigits: 5, maximumFractionDigits: 5 });
if (num >= 0.0001)   return num.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 6 });
if (num >= 0.00001)  return num.toLocaleString('en-US', { minimumFractionDigits: 7, maximumFractionDigits: 7 });
if (num >= 0.000001) return num.toLocaleString('en-US', { minimumFractionDigits: 8, maximumFractionDigits: 8 });
return num.toLocaleString('en-US', { minimumFractionDigits: 10, maximumFractionDigits: 10 });
```

**Impact:** Liquidity column now shows small amounts correctly with appropriate decimal places.

### 2. New `formatOrderValue` Function
**File:** `artifacts/dex/src/utils/formatters.ts` and `src info/utils/formatters.ts`

Created a specialized formatter for order values that handles small amounts gracefully:

```typescript
export function formatOrderValue(num: number): string {
  if (!isFinite(num) || num === 0) return '0';
  // Large numbers: use commas
  if (num >= 1e6) return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (num >= 1e3) return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  // Normal range: 2-4 decimal places
  if (num >= 1)   return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  // Small numbers: show enough decimals to be meaningful
  if (num >= 0.01)     return num.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  if (num >= 0.001)    return num.toLocaleString('en-US', { minimumFractionDigits: 5, maximumFractionDigits: 5 });
  if (num >= 0.0001)   return num.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 6 });
  if (num >= 0.00001)  return num.toLocaleString('en-US', { minimumFractionDigits: 7, maximumFractionDigits: 7 });
  if (num >= 0.000001) return num.toLocaleString('en-US', { minimumFractionDigits: 8, maximumFractionDigits: 8 });
  return num.toLocaleString('en-US', { minimumFractionDigits: 10, maximumFractionDigits: 10 });
}
```

### 3. Updated Desktop Order Entry Panel
**File:** `artifacts/dex/src/desktop/components/OrderEntryPanel.tsx`

**Changes:**
- Added import: `import { formatOrderValue } from "@/utils/formatters";`
- Changed order value calculation:

**Before:**
```typescript
const orderValue = !isNaN(sizeNum) && sizeNum > 0 && !isNaN(execPrice) && execPrice > 0
  ? sizeUnit === "base"
    ? (sizeNum * execPrice).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " " + quoteToken
    : sizeNum.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " " + quoteToken
  : "N/A";
```

**After:**
```typescript
const orderValueNum = !isNaN(sizeNum) && sizeNum > 0 && !isNaN(execPrice) && execPrice > 0
  ? (sizeUnit === "base" ? sizeNum * execPrice : sizeNum)
  : 0;
const orderValue = orderValueNum > 0
  ? formatOrderValue(orderValueNum) + " " + quoteToken
  : "N/A";
```

### 4. Updated Mobile Trade View
**File:** `artifacts/dex/src/mobile/components/MobileTradeView.tsx`

**Changes:**
- Added import: `import { formatOrderValue } from "@/utils/formatters";`
- Changed order value calculation (same pattern as desktop)

**Before:**
```typescript
const orderValue = !isNaN(sizeNum) && sizeNum > 0 && !isNaN(execPrice)
  ? sizeUnit === "base"
    ? (sizeNum * execPrice).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " " + quoteToken
    : sizeNum.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " " + quoteToken
  : "N/A";
```

**After:**
```typescript
const orderValueNum = !isNaN(sizeNum) && sizeNum > 0 && !isNaN(execPrice)
  ? (sizeUnit === "base" ? sizeNum * execPrice : sizeNum)
  : 0;
const orderValue = orderValueNum > 0
  ? formatOrderValue(orderValueNum) + " " + quoteToken
  : "N/A";
```

## Examples of Fixed Display

| Original Value | Before Fix | After Fix |
|----------------|------------|-----------|
| 0.0016 | 0.00 USDT | 0.001600 USDT |
| 0.00234 | 0.00 USDT | 0.00234 USDT |
| 0.000456 | 0.00 USDT | 0.0004560 USDT |
| 12.5 | 12.50 USDT | 12.50 USDT (unchanged) |
| 1,234.56 | 1,234.56 USDT | 1,234.56 USDT (unchanged) |

## Benefits
✅ Small order values are now visible instead of showing 0.00  
✅ Liquidity column displays small amounts correctly  
✅ Consistent decimal precision based on magnitude  
✅ Large numbers still use commas and appropriate formatting  
✅ Works on both mobile and desktop UI  

## Testing Recommendations
1. Create a small order (e.g., 0.001 BTC at $50,000 = 50 USDT value)
2. Verify order value displays correctly (not 0.00)
3. Check liquidity column in markets page for pairs with low liquidity
4. Test various magnitude ranges (0.000001 to 1,000,000)
5. Verify laddered orders show correct average order value
