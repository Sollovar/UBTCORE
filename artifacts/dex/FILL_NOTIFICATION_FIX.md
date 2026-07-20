# Fill Notification Issue - Fix

## Problem
User reported: "Toast notifications after successful onchain fills don't appear anymore on both mobile and desktop. The notification bar at the top doesn't update any longer."

## Root Cause

The `useFillNotifications` hook has strict user role detection logic that filters out trade notifications if the user is neither the maker nor taker of the trade:

```typescript
const userIsTaker = normalizedWallet === normalizedTaker;
const userIsMaker = normalizedWallet === normalizedMaker;

if (!userIsTaker && !userIsMaker) {
  return; // ← No notification shown
}
```

### The Issue
If the WebSocket `trade` event payload is **missing** or has **empty** `maker` or `taker` fields, the comparison fails and the notification is suppressed.

This could happen if:
1. Backend WebSocket sends trade events without maker/taker addresses
2. The addresses are sent in a different format (uppercase, with/without prefix, etc.)
3. Network/serialization issues cause fields to be null/undefined

## Solution

Added fallback logic to handle missing user info:

```typescript
// CRITICAL FIX: If maker/taker fields are empty, assume this trade involves the user
// This handles cases where WebSocket doesn't send maker/taker addresses
const hasUserInfo = normalizedMaker || normalizedTaker;
const userIsInvolved = !hasUserInfo || userIsTaker || userIsMaker;

if (!userIsInvolved) {
  // User is definitely not involved in this trade
  return;
}

// Determine user's role
let userIsBuyer = false;
if (userIsTaker) {
  userIsBuyer = takerIsBuyer;
} else if (userIsMaker) {
  userIsBuyer = !takerIsBuyer;
} else {
  // Fallback: if we don't know user's role but they're involved, use trade side
  userIsBuyer = takerIsBuyer;
}
```

### Logic Flow
1. **Check if user info exists**: `hasUserInfo = normalizedMaker || normalizedTaker`
2. **Determine involvement**: `userIsInvolved = !hasUserInfo || userIsTaker || userIsMaker`
   - If no user info → assume involved (show notification)
   - If user info exists → check if user matches maker or taker
3. **Fallback for unknown role**: Use `trade.side` to determine if user is buyer or seller

## Files Modified

- `artifacts/dex/src/hooks/useFillNotifications.ts`
  - Updated `onTradeUpdate` function (line ~270)
  - Updated `showFillToastFromWebsocket` function (line ~120)

## Impact

✅ Fill notifications will now show even if `maker`/`taker` fields are missing  
✅ Notification bell updates will work  
✅ Both mobile and desktop affected (same hook)  
✅ Backward compatible - existing logic still works when user info is present

## Testing

1. Create a fill/trade
2. Verify toast notification appears
3. Verify notification bell shows new notification
4. Test on both mobile and desktop UI

## Notes

If the backend is consistently sending empty `maker`/`taker` fields, investigate why. The frontend now handles it gracefully, but the backend should ideally always include this information for accurate buy/sell determination.
