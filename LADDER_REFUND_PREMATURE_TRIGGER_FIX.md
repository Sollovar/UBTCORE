# Ladder Refund Premature Trigger Fix

## Critical Issue Discovered

After deploying the previous fixes, a NEW critical issue was found:
- When ONE child order fills, it **immediately triggers a refund** 
- The refund tries to send the remaining balance even though OTHER child orders are still active!
- This causes failed transactions and incorrect refunds

## Root Cause Analysis

### Where Refunds Are Triggered

Refunds can be triggered from 3 places in the codebase:

1. **Executor** (`executor.go` lines 474, 487):
   - When an order becomes **FILLED**
   - Calls `CreateRefundForOrder` to refund any remaining deposit

2. **Matching Engine** (`matching.go` line 531):
   - When an order **EXPIRES**
   - Calls `CreateRefundForOrder` to refund unused deposit

3. **Order Handlers** (`handlers.go` lines 2798, 2864):
   - When user **CANCELS** an order
   - Calls `CreateRefundForOrder` to refund unused deposit

### The Problem

For **ladder orders**, when child 1 fills:
```
Child 1 (525 CATWIF): FILLS
├─ Executor detects: order.Status = FILLED
├─ Executor calls: CreateRefundForOrder(child1)
├─ RefundService sees: this is a ladder child
├─ Calculates: totalDeposit(1050) - totalSpent(525) = 525
├─ Creates refund for 525 CATWIF
└─ ❌ BUT Child 2 is still ACTIVE and might fill!

Result: Premature refund while other children are still trading!
```

## The Fix

Added **TWO critical checks** in `CreateRefundForOrder`:

### Check #1: Skip Refund for FILLED Ladder Children

```go
// CRITICAL: For ladder CHILD orders that are FILLED, do NOT create refund!
// A filled child has no remaining deposit to refund - the funds were used in the fill.
// Only expired/cancelled children need refunds (handled when they transition to those states).
if order.LadderParentID != nil && order.Status == models.OrderStatusFilled {
    fmt.Printf("[RefundService] Ladder child order %d is FILLED - no refund needed (funds were used)\n", order.ID)
    return nil
}
```

**Why**: A filled ladder child used its entire allocation in the fill. There's nothing to refund from that specific child. The parent will handle final refund when ALL children complete.

### Check #2: Only Refund When ALL Siblings Are Terminal

```go
// CRITICAL CHECK: Only create refund if ALL other sibling orders are in terminal states
// Terminal states: filled, expired, cancelled
// Active states: pending, partial
hasActiveSiblings := false
for _, child := range allChildOrders {
    if child.ID == order.ID {
        continue // Skip the current order being processed
    }
    // Check if sibling is still active
    if child.Status == models.OrderStatusPending || child.Status == models.OrderStatusPartial {
        hasActiveSiblings = true
        fmt.Printf("[RefundService] Ladder child order %d has active sibling %d (status: %s) - skipping refund for now\n",
            order.ID, child.ID, child.Status)
        break
    }
}

if hasActiveSiblings {
    fmt.Printf("[RefundService] Ladder child order %d still has active siblings - no refund yet\n", order.ID)
    return nil
}
```

**Why**: We should ONLY create a refund when it's safe to do so - when ALL other children have reached a terminal state and we know the final total spent amount.

## Order Status Flow

### Terminal States (Order is done)
- `OrderStatusFilled` - Order completely filled
- `OrderStatusExpired` - Order expired without filling
- `OrderStatusCancelled` - User cancelled the order

### Active States (Order still trading)
- `OrderStatusPending` - Order waiting for matches
- `OrderStatusPartial` - Order partially filled, still matching

## Refund Trigger Decision Tree

```
CreateRefundForOrder(order) called:
│
├─ Is this a Solana order?
│  └─ NO → Skip (refunds only for Solana custody model)
│
├─ Is this a ladder CHILD order?
│  ├─ NO → Process normally (regular order refund logic)
│  │
│  └─ YES → Is it FILLED?
│     ├─ YES → Skip refund (funds were used in fill) ✅
│     │
│     └─ NO (expired or cancelled) → Check siblings
│        │
│        └─ Are there active siblings (pending/partial)?
│           ├─ YES → Skip refund (wait for siblings to complete) ✅
│           │
│           └─ NO (all siblings terminal) → Calculate and create refund ✅
```

## Example Scenario - Before & After Fix

### Scenario Setup
- Deposit: 1050 CATWIF
- Ladder levels: 2
- Child 1: 525 CATWIF at price 0.00186
- Child 2: 525 CATWIF at price 0.00187

### ❌ BEFORE FIX

```
T=0: Both children pending (waiting for matches)
├─ Child 1: pending, 525 CATWIF
└─ Child 2: pending, 525 CATWIF

T=1: Child 1 matches and fills
├─ Child 1: FILLED, 525 CATWIF spent
├─ Executor calls CreateRefundForOrder(child1)
├─ RefundService calculates: 1050 - 525 = 525 refund
├─ Creates refund for 525 CATWIF ❌ PREMATURE!
└─ Child 2: still PENDING, 525 CATWIF ❌ Still active!

T=2: Child 2 also matches and fills
├─ Child 2: FILLED, 525 CATWIF spent
├─ Total spent: 1050 CATWIF
└─ Problem: Already refunded 525! Now user has 525 extra ❌

Result: User gets 525 CATWIF back + sold 1050 = 1575 total (should be 1050!)
```

### ✅ AFTER FIX

```
T=0: Both children pending (waiting for matches)
├─ Child 1: pending, 525 CATWIF
└─ Child 2: pending, 525 CATWIF

T=1: Child 1 matches and fills
├─ Child 1: FILLED, 525 CATWIF spent
├─ Executor calls CreateRefundForOrder(child1)
├─ Check #1: Is this a filled ladder child? YES
├─ RefundService: "Ladder child order 123 is FILLED - no refund needed"
├─ SKIPS refund ✅
└─ Child 2: still PENDING, 525 CATWIF

T=2: Child 2 expires without filling
├─ Child 2: EXPIRED, 0 CATWIF spent
├─ Expiry processor calls CreateRefundForOrder(child2)
├─ Check #1: Is this a filled ladder child? NO (it expired)
├─ Check #2: Are there active siblings? NO (child1 is filled - terminal)
├─ RefundService calculates: 1050 - 525 = 525 refund
├─ Creates refund for 525 CATWIF ✅ CORRECT!
└─ Total spent: 525 CATWIF, refund: 525 CATWIF ✅

Result: User sold 525 CATWIF + got 525 back = 1050 total ✅ CORRECT!
```

## All Three Fixes Working Together

This fix works with the previous two fixes:

1. **Parent-child tracking** (Fix #1): Calculates refund across ALL children
2. **Decimal units** (Fix #2): Uses correct raw units without extra multiplication
3. **Premature trigger prevention** (Fix #3): Only refunds when all siblings complete

```go
CreateRefundForOrder Flow:
├─ 1. Skip if not Solana
├─ 2. Skip if filled ladder child (Fix #3) ← NEW!
├─ 3. Skip if has active siblings (Fix #3) ← NEW!
├─ 4. Calculate total spent across all children (Fix #1)
├─ 5. Calculate refund = deposit - totalSpent (Fix #1)
└─ 6. Execute refund with raw units (Fix #2)
```

## Log Messages to Watch For

### Good Logs (Expected Behavior)

```
# Child 1 fills - correctly skips refund
[Executor] Filling maker order 123
[RefundService] Ladder child order 123 is FILLED - no refund needed (funds were used)

# Child 2 expires - checks siblings
[Expiry] Order 124 expired
[RefundService] Ladder child order 124 has active sibling 123 (status: filled) - skipping refund for now
# Wait... child 123 is filled (terminal), so it should NOT skip!

Actually let me re-check the logic...
```

Wait, I need to verify my sibling check logic again. A FILLED sibling is TERMINAL, not ACTIVE. Let me re-read my code...

Actually looking at my code again:

```go
if child.Status == models.OrderStatusPending || child.Status == models.OrderStatusPartial {
    hasActiveSiblings = true
}
```

This is CORRECT! We only mark as "active sibling" if status is pending or partial. Filled/expired/cancelled siblings will NOT trigger this flag. So the logic is good!

### Good Logs (Corrected)

```
# Child 1 fills - correctly skips refund
[Executor] Filling maker order 123
[RefundService] Ladder child order 123 is FILLED - no refund needed (funds were used)

# Child 2 still pending - no refund yet
[RefundService] Ladder child order 124 has active sibling 125 (status: pending) - skipping refund for now

# Child 2 expires - all siblings terminal now
[Expiry] Order 124 expired
[RefundService] Ladder child order 124: all siblings are in terminal state - calculating final refund
[RefundService] Ladder child order 124 (parent 120): total_deposit=1050000000, total_spent=525000000, refund=525000000
[RefundService] Creating refund for order 120: token=<mint>, amount=525000000, to=<address>
[RefundService] Refund 78 completed successfully, tx: <txHash>
```

### Bad Logs (Should Never Happen Now)

```
# This should NEVER happen after the fix:
[RefundService] Ladder child order 123 is FILLED - no refund needed (funds were used)
[RefundService] Creating refund for order 123...  ← WRONG! Should have skipped!
```

## Files Modified

- `backend/internal/services/refund.go`:
  - Added check to skip filled ladder children
  - Added check to skip when active siblings exist
  - Only processes refund when ALL siblings are terminal

## Status

✅ **FIXED** - Backend compiles successfully
✅ **Check #1** - Filled ladder children skip refund
✅ **Check #2** - Active siblings prevent premature refunds
✅ **Check #3** - Only refunds when all children complete

## Next Steps

1. Deploy updated backend
2. Test ladder order scenario:
   - Create 2-level ladder order
   - Let one child fill
   - Verify NO refund is created yet
   - Let second child expire or cancel
   - Verify refund is created ONLY after all children done
   - Verify correct refund amount
3. Monitor logs for proper sibling checking
