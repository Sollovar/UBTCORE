# Fill Notification Debugging Guide

## Changes Made

### 1. Restored Gecko Price Separation ✅
**Problem**: You removed the gecko price logic, causing:
- Components couldn't find `geckoPrice` field (would show stale data)
- Ticker events were overwriting exchange prices with gecko prices
- Price separation was completely lost

**Fix**: Restored proper separation in both files:
- `usePairWebsocket.ts`: Ticker events now update `geckoPrice`, `geckoPriceUSD`, `geckoPriceChange24h`
- `useRealtimePairs.ts`: Same logic restored
- `price_update` events still only update `price` (exchange price)

### 2. Added Comprehensive Logging ✅
Added console logs at every step of the notification flow:
- WebSocket trade event reception
- Handler invocation check
- Wallet address validation
- User role determination
- Notification creation

## How to Debug

### Step 1: Open Browser Console
Open DevTools (F12) and go to Console tab

### Step 2: Make a Trade
Execute a buy or sell order

### Step 3: Check Console Logs
You should see logs in this order:

```
[usePairWebsocket] Trade event received { pairId: "...", trade: {...}, hasHandler: true }
[useFillNotifications] onTradeUpdate called { trade: {...}, walletAddress: "0x...", hasWallet: true }
[useFillNotifications] User check { normalizedWallet: "0x...", normalizedMaker: "0x...", normalizedTaker: "0x...", side: "buy" }
[useFillNotifications] Involvement check { hasUserInfo: true, userIsTaker: true, userIsMaker: false, userIsInvolved: true }
[useFillNotifications] User role determined { userIsBuyer: true }
[useFillNotifications] New fill, showing notification
[useFillNotifications] Notification added successfully
```

### Step 4: Identify the Problem

#### Problem 1: No logs at all
**Cause**: WebSocket not connected or not receiving trade events  
**Check**:
- Backend is running
- WebSocket connection is established (check Network tab → WS)
- Trade was actually executed on backend

#### Problem 2: Logs stop at "No wallet address"
**Cause**: Wallet not connected or address not detected  
**Check**:
- `walletAddress` in the log - should be "0x..." not null
- Dynamic wallet is connected
- Check `useStore` → `walletAddress` field

#### Problem 3: Logs stop at "User not involved"
**Cause**: Wallet address doesn't match maker or taker  
**Check**:
- `normalizedWallet` vs `normalizedMaker` and `normalizedTaker`
- Are they the same address?
- Is the address format consistent (lowercase, with/without 0x)?

#### Problem 4: Logs reach "Notification added" but no toast
**Cause**: Sonner toaster issue or toast configuration  
**Check**:
- `<Sonner />` component is mounted in App.tsx
- No CSS hiding the toast
- Try manually calling `toast.success('test')` in console

#### Problem 5: "Fill already seen"
**Cause**: Fill ID is cached in localStorage  
**Fix**: Clear localStorage or remove specific key:
```javascript
// In browser console:
localStorage.removeItem('cexdex-ws-fills-YOUR_ADDRESS_HERE');
```

## Common Issues & Solutions

### Issue: Handler not being called
**Symptom**: `hasHandler: false` in logs  
**Cause**: Hook not passing handlers correctly  
**Fix**: Check where `useFillNotifications` is called - ensure it's in the component tree

### Issue: Wrong wallet address
**Symptom**: Wallet address in logs doesn't match your actual wallet  
**Cause**: Multiple wallets connected or store not updated  
**Fix**: Disconnect all wallets and reconnect

### Issue: Maker/taker both empty
**Symptom**: `normalizedMaker: ""` and `normalizedTaker: ""`  
**Cause**: Backend not sending these fields  
**Effect**: Notification will still show (fallback logic handles it)  
**Backend Fix**: Ensure trade events include maker and taker addresses

## Backend Requirements

For notifications to work properly, the WebSocket `trade` event must include:

```typescript
{
  id: number,                    // Unique fill ID
  side: "buy" | "sell",          // REQUIRED: Trade side
  maker: "0x...",                // Maker address (RECOMMENDED)
  taker: "0x...",                // Taker address (RECOMMENDED)
  price_human: "1.234",          // Human-readable price
  amount_human: "100",           // Human-readable amount
  base_symbol: "ETH",            // Token symbols
  quote_symbol: "USDT",
  tx_hash: "0x..." | undefined,  // Transaction hash (optional, shows later)
  pair_id: "bsc_0x..."          // Pair identifier
}
```

## Testing After Fix

1. **Clear cache**: `localStorage.clear()` in console
2. **Refresh page**: Hard refresh (Ctrl+Shift+R)
3. **Make a trade**: Execute a small test trade
4. **Check console**: Should see all debug logs
5. **Check toast**: Should see notification appear
6. **Check bell**: Notification should appear in bell menu

## Removing Debug Logs

Once notifications work, you can remove the console.log statements:
- Search for `console.log('[useFillNotifications]` 
- Search for `console.log('[usePairWebsocket]`
- Remove these lines

## Critical Code Paths

### WebSocket → Handler Flow
```
Backend sends trade event
  ↓
usePairWebsocket receives (line 128)
  ↓
Calls handlersRef.current?.onTradeUpdate?.(trade)
  ↓
useFillNotifications.onTradeUpdate executes (line 268)
  ↓
Validates wallet, user role, not duplicate
  ↓
Calls showFillToastFromWebsocket()
  ↓
Calls toast.success()
  ↓
Adds to notification store
```

### Dual WebSocket Subscriptions
The app subscribes to WebSocket TWICE in `useFillNotifications`:
1. `usePairWebsocket(storeSelectedPairId, ...)` - Current pair
2. `usePairWebsocket('all', ...)` - All pairs

Both receive trade events. The handler checks if it's already seen (via localStorage) to avoid duplicates.
