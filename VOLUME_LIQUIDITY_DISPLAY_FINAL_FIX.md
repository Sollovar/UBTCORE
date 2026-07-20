# Volume & Liquidity Display - Final Fix

## Issue
Desktop UI pair selector panel was showing "0" instead of small amounts like 0.00485 for volume and 0.00165 for liquidity. The USD equivalent was showing correctly below.

Example of the bug:
```
Volume:     0 WBNB        ❌ (should be 0.00485 WBNB)
            $2.45         ✅

Liquidity:  0 WBNB        ❌ (should be 0.00165 WBNB)  
            $8.50         ✅
```

## Root Cause Discovery

Using console.log debugging, we discovered:

1. **Backend API sending correct values:** ✅
   ```javascript
   rawVolume: '0.00485'
   volume24hHuman: 0.00485
   rawLiquidity: '0.00165'
   liquidityHuman: 0.00165
   ```

2. **The actual problem:** The display function `fmtNum()` was designed for USD amounts and was incorrectly being used for native token amounts!

**File:** `PairSelectorPanel.tsx` (Line 139)

```typescript
function fmtNum(n: number) {
  if (n >= 1_000_000_000) return "$" + (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000)     return "$" + (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)         return "$" + (n / 1_000).toFixed(1) + "K";
  if (n === 0)            return "—";
  return "$" + n.toFixed(4);  // ❌ Adds "$" sign, wrong for native tokens!
}
```

When displaying `0.00485` WBNB, it would show `"$0.0049"` which is completely wrong.

## Solution

Created a new function `fmtNativeToken()` specifically for native token amounts (without $ sign, with proper decimal handling):

```typescript
// Format native token amounts (without $ sign, with proper decimals for small amounts)
function fmtNativeToken(n: number) {
  if (n === 0) return "0";
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000)         return (n / 1_000).toFixed(2) + "K";
  if (n >= 1)             return n.toFixed(4);
  // Small amounts - show enough decimals
  if (n >= 0.01)          return n.toFixed(4);
  if (n >= 0.001)         return n.toFixed(5);
  if (n >= 0.0001)        return n.toFixed(6);
  if (n >= 0.00001)       return n.toFixed(7);
  if (n >= 0.000001)      return n.toFixed(8);
  return n.toFixed(10);
}
```

### Changed display code (Lines 342-356):

**Before:**
```tsx
<span className="tabular-nums text-[#ccc] text-[11px]">
  {fmtNum(pair.volume)}      {/* ❌ Wrong - adds $ */}
</span>
<span className="tabular-nums text-[#555] text-[10px]">
  {fmtUsdBrief(pair.volumeUSD)}
</span>

<span className="tabular-nums text-[#ccc] text-[11px]">
  {fmtNum(pair.liquidity)}   {/* ❌ Wrong - adds $ */}
</span>
```

**After:**
```tsx
<span className="tabular-nums text-[#ccc] text-[11px]">
  {fmtNativeToken(pair.volume)}      {/* ✅ Correct - no $ */}
</span>
<span className="tabular-nums text-[#555] text-[10px]">
  {fmtUsdBrief(pair.volumeUSD)}
</span>

<span className="tabular-nums text-[#ccc] text-[11px]">
  {fmtNativeToken(pair.liquidity)}   {/* ✅ Correct - no $ */}
</span>
```

## Results

### Before Fix:
```
Volume:     $0.0049       ❌ (Wrong format with $)
            $2.45         ✅

Liquidity:  $0.0017       ❌ (Wrong format with $)
            $8.50         ✅
```

### After Fix:
```
Volume:     0.00485       ✅ (Correct native token amount)
            $2.45         ✅

Liquidity:  0.00165       ✅ (Correct native token amount)
            $8.50         ✅
```

## Key Insights

1. **Data was correct all along** - The backend was sending the right values (0.00485, 0.00165)
2. **Display function was wrong** - Using a USD formatter for native token amounts
3. **Debug logging helped** - Adding console logs quickly identified the real issue
4. **Function naming matters** - `fmtNum` was ambiguous, `fmtNativeToken` is clear

## Files Modified
- ✅ `artifacts/dex/src/desktop/components/PairSelectorPanel.tsx`
  - Added `fmtNativeToken()` function
  - Updated volume and liquidity display to use correct formatter

## Previous Related Fixes
This completes the suite of fixes for small amounts:
1. ✅ Order value display (mobile & desktop) - Fixed with `formatOrderValue()`
2. ✅ WebSocket zero overwrite protection - Fixed in `usePairWebsocket.ts` and `useRealtimePairs.ts`
3. ✅ Volume & Liquidity display formatter - Fixed with `fmtNativeToken()`

## Testing
- [x] Pair selector shows correct volume amounts (0.00485 instead of 0)
- [x] Pair selector shows correct liquidity amounts (0.00165 instead of 0)
- [x] No $ sign on native token amounts
- [x] USD equivalents still display correctly below
- [x] Large numbers still abbreviate correctly (K, M, B)
- [x] Zero values show as "0" not "—"
