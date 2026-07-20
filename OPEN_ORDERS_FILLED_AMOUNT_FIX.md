# Open Orders: Filled Amount Wei to Human-Readable Conversion

## Issue Fixed
When an order was partially filled, the "Filled" column displayed the remaining amount in Wei format instead of human-readable format.

**Before:**
```
Order: 2 USDT
Filled: 1 USDT  
Remaining: 1000000000000000000 (Wei - not human readable!)
```

**After:**
```
Order: 2 USDT
Filled: 1 USDT
Remaining: 1 (human readable!)
```

---

## Root Cause
The `filled_amount` field in orders comes as a raw blockchain value (Wei). Other fields like `amount_in_human` and `amount_out_min_human` are pre-converted to human-readable format by the backend, but `filled_amount` is not.

**Backend returns:**
- `amount_in_human` - ✅ Already human-readable (e.g., "1.5")
- `amount_out_min_human` - ✅ Already human-readable
- `filled_amount` - ❌ Raw Wei value (e.g., "1000000000000000000")

---

## Solution Implemented

Created `getFilledAmountHuman()` function to convert Wei to human-readable:

```typescript
function getFilledAmountHuman(o: OrderWithPair): number {
  const filledAmount = Number.parseFloat(o.order.filled_amount || "0");
  if (!Number.isFinite(filledAmount) || filledAmount === 0) {
    return 0;
  }

  // Use the correct decimals based on order side
  const decimals = o.order.side === "buy" 
    ? o.order.token_out_decimals  // For buy: output token (e.g., ETH has 18 decimals)
    : o.order.token_in_decimals;  // For sell: input token decimals

  // Convert from Wei: divide by 10^decimals
  const divisor = Math.pow(10, decimals);
  return filledAmount / divisor;
}
```

**Why this works:**
- `filled_amount` is in Wei (smallest unit)
- Each token has a specific number of decimals
- To convert: `human_readable = wei_amount / (10 ^ decimals)`
- Example: USDT with 6 decimals: `1000000 Wei → 1000000 / 10^6 = 1 USDT`
- Example: ETH with 18 decimals: `1000000000000000000 Wei → ... / 10^18 = 1 ETH`

---

## Files Modified

### 1. Mobile Bottom Section
**File:** `src/mobile/components/MobileBottomSection.tsx`

**Changes:**
- Added `getFilledAmountHuman()` helper function
- Updated line 114: `const filled = getFilledAmountHuman(o);` (was: `parseFloat(ord.filled_amount)`)
- Updated line 151 display to use converted `filled` value

**Result:** Mobile "Open Orders" tab now shows correct filled amounts

### 2. Mobile Order Book View
**File:** `src/mobile/components/MobileOrderBookView.tsx`

**Changes:**
- Updated `mergeUserOrders()` function
- Added inline `getFilledHuman()` helper
- Fixed remaining amount calculation to use human-readable filled amount
- Now properly calculates: `remaining = total - getFilledHuman(o)`

**Result:** Mobile order book user orders display correct amounts

### 3. Desktop Order Book
**File:** `src/desktop/components/OrderBook.tsx`

**Changes:**
- Updated `mergeUserOrders()` function (same as mobile)
- Added inline `getFilledHuman()` helper
- Fixed remaining amount calculation

**Result:** Desktop order book user orders display correct amounts

---

## Technical Details

### Decimals Handling
- **Buy orders:** Use `token_out_decimals` (quantity token)
  - Example: BUY 1 ETH with USDT → ETH has 18 decimals
- **Sell orders:** Use `token_in_decimals` (quantity token)
  - Example: SELL 1 ETH for USDT → ETH has 18 decimals
- **Quote tokens:** Typically 6-18 decimals depending on blockchain/token

### Data Flow
```
Order stored with filled_amount = 1000000000000000000 (Wei)
                      ↓
Token decimals: 18 (for ETH)
                      ↓
Conversion: 1000000000000000000 / 10^18 = 1
                      ↓
Display: "1" (human readable) ✅
```

---

## Testing

### Test Mobile
1. Go to Mobile → Open Orders
2. Find a partially filled order
3. Check "Filled" column
4. Should show: `1.5` (not `1500000000000000000`)

### Test Mobile Order Book
1. Go to Mobile → Order Book view
2. Place a partially filled order
3. See it appears in your order list
4. Verify remaining amount is correct
5. Example: 2 USDT ordered, 1 USDT filled → shows remaining as `1` (not Wei)

### Test Desktop
1. Go to Desktop → Bottom Panel → Open Orders or Order Book
2. Check partially filled orders
3. Verify all calculations use human-readable amounts

---

## Verification

Check that these are now fixed:

✅ Mobile Open Orders tab - Filled column shows correct values
✅ Mobile Order Book - User order remaining amounts correct
✅ Desktop Order Book - User order remaining amounts correct
✅ All order side types handled (buy/sell)
✅ All token decimals handled correctly

---

## Edge Cases Handled

1. **No filled amount:** Returns 0 (not NaN)
2. **Zero decimals:** Correctly handles stablecoins with 6+ decimals
3. **High decimals:** Works with 18 decimal tokens (ETH, etc.)
4. **Different order sides:** Uses correct decimals for buy vs sell
5. **Invalid amounts:** Validates with `Number.isFinite()` before division

---

## Backend Notes

No backend changes needed. The backend already provides:
- `filled_amount` (raw Wei)
- `token_in_decimals` and `token_out_decimals`

This frontend fix properly converts using available data.

---

## Future Improvement

Consider adding `filled_amount_human` to backend response (like `amount_in_human` and `amount_out_min_human`) to simplify frontend logic. This would:
- Reduce conversion logic in UI components
- Ensure consistency across all uses
- Be more performant (pre-calculated at source)

---

## One-Line Summary
**Fixed filled amounts showing in Wei instead of human-readable format by converting using token decimals in three key places: mobile open orders, mobile/desktop order book views.**
