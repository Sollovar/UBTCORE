# Ladder Order Refund Decimal Units Fix

## Critical Bug Fixed

**Problem**: When a ladder order was partially filled and expired, the refund service was attempting to send **1,000,000x more tokens** than intended (e.g., trying to send 1,050,000,000 instead of 1,050).

## Root Cause

The refund amount was being multiplied by decimals **twice**:

1. **First multiplication**: When the order amount was stored in the database, it was already stored in **raw blockchain units** (e.g., lamports for SOL, raw token units with decimals already applied)
2. **Second multiplication**: In `executeRefund()`, the code was multiplying `refund.Amount` by `10^decimals` again, causing a massive overstatement

### Evidence from Codebase

Throughout the codebase, orders and fills consistently use **raw units**:

```go
// From fill transfer logic
s.transferTokenToUser(ctx, fill.TokenIn, fill.AmountIn, order.Maker)
// fill.AmountIn is in raw units

// From order comments
// Order.AmountIn: Amount of input token (RAW blockchain units)
```

## The Fix

### Before (WRONG):
```go
func (s *RefundService) executeRefund(ctx context.Context, refund *models.RefundRequest) (string, error) {
    // Convert to raw blockchain units
    decimals := getTokenDecimals(refund.TokenMint)
    rawAmount := refund.Amount.Mul(decimal.NewFromFloat(math.Pow(10, float64(decimals))))
    
    txHash, err := s.solanaSettlement.transferTokenToUser(ctx, refund.TokenMint, rawAmount, refund.UserAddress)
    // ...
}
```

### After (CORRECT):
```go
func (s *RefundService) executeRefund(ctx context.Context, refund *models.RefundRequest) (string, error) {
    // IMPORTANT: refund.Amount is ALREADY in raw blockchain units
    // DO NOT multiply by decimals again - that would cause a 10^decimals multiplication error!
    rawAmount := refund.Amount
    
    txHash, err := s.solanaSettlement.transferTokenToUser(ctx, refund.TokenMint, rawAmount, refund.UserAddress)
    // ...
}
```

## Combined Fixes

This fix works together with the **parent-child ladder tracking fix** (see `LADDER_REFUND_CRITICAL_FIX.md`):

1. **Parent-child tracking**: Ensures refund calculates `totalDeposit - totalSpentAcrossAllChildren` instead of trying to refund the full deposit
2. **Decimal units fix**: Ensures the calculated refund amount is sent correctly without additional multiplication

## Test Scenario

**Setup**:
- Deposit 1050 CATWIF tokens (6 decimals = 1,050,000,000 raw units)
- Create ladder order with 2 levels
- Each child gets 525 CATWIF (525,000,000 raw units)

**Without Fix**:
- Child 1 fills: 525 CATWIF spent
- Child 2 expires: Should refund 525 CATWIF
- BUG: Tries to send 525 * 10^6 = 525,000,000,000 raw units (525,000 CATWIF!)

**With Fix**:
- Child 1 fills: 525,000,000 raw units spent
- Child 2 expires: Refund = 1,050,000,000 - 525,000,000 = 525,000,000 raw units
- Correctly sends 525,000,000 raw units = 525 CATWIF ✅

## Files Modified

- `backend/internal/services/refund.go`:
  - Removed decimal multiplication in `executeRefund()`
  - Added comprehensive comments explaining raw units
  - Combined with parent-child ladder tracking logic

## Status

✅ **FIXED** - Backend compiles successfully with both fixes applied
✅ **Parent-child tracking** - Prevents refunding more than remaining balance
✅ **Decimal units** - Prevents sending 1,000,000x too many tokens

## Next Steps

1. Deploy updated backend
2. Test with actual ladder order scenario:
   - Create 2-level sell ladder order
   - Let one child fill
   - Let second child expire
   - Verify refund sends correct amount
3. Monitor refund service logs for correct calculations
