# How to Verify the Chain Persistence Fix

## Quick Verification Steps

### 1. Open Browser DevTools
- Press `F12` to open DevTools
- Go to **Console** tab
- You'll see debug messages like: `[useConnectedNetwork] Using stored network (default): bsc`

### 2. Clear localStorage (Start Fresh)
```javascript
// In Console, run:
localStorage.removeItem('cexdex-v2-network');
localStorage.clear(); // Or clear all
```

### 3. Load the UI (No Wallet Connected)
- Refresh the page
- **Expected**: BSC pairs load (19 pairs)
- **Console Log**: `[useConnectedNetwork] Using stored network (default): bsc`
- ✅ If you see this, default behavior works!

### 4. Connect MetaMask to BSC
- Click wallet connect button
- Select MetaMask
- Confirm connection to BSC network
- **Expected**: BSC pairs load
- **Console Log**: `[useConnectedNetwork] Detected network from browser provider: bsc`
- ✅ If pairs load and stay as BSC, it works!

### 5. Disconnect Wallet
- Click profile/disconnect button
- Confirm disconnection
- **Expected**: BSC pairs STAY loaded (not random chain)
- **Console Log**: `[useConnectedNetwork] Wallet disconnected, restoring stored network: bsc`
- ✅ Critical fix - pairs should NOT switch to random chain!

### 6. Test with Solana Wallet (If Available)
- Disconnect MetaMask
- Install Phantom wallet (if not already)
- Connect Phantom wallet
- **Expected**: Solana pairs load (20 pairs)
- **Console Log**: `[useConnectedNetwork] Detected connected Solana wallet` → `Detected network from browser provider: solana`
- ✅ If you see Solana pairs, fix works!

### 7. The Critical Test - Phantom NOT Connected
- Disconnect Phantom wallet
- Keep Phantom installed (just not connected)
- Refresh page
- **Expected**: BSC pairs load (NOT Solana!)
- **Console Log**: `[useConnectedNetwork] No connected wallet provider detected` then `Using stored network (default): bsc`
- ✅ THIS IS THE MAIN FIX - Verify Solana pairs don't load when wallet isn't connected!

### 8. Switch Chains with MetaMask
- Connect MetaMask
- Open MetaMask and switch to Base network (chainId: 8453)
- **Expected**: Base pairs load (different pair set than BSC)
- **Console Log**: `[useConnectedNetwork] Detected EVM chain: base`
- ✅ Should see Base pairs, not BSC!

### 9. Verify localStorage Persistence
```javascript
// In Console, run:
console.log(localStorage.getItem('cexdex-v2-network'));
// Should output the last connected network, e.g.: "bsc" or "base" or "solana"
```

## Debug Console Output Reference

### ✅ Good Output (BSC, No Wallet)
```
[useConnectedNetwork] Using stored network (default): bsc
[useConnectedNetwork] No connected wallet provider detected
pairs.ts:9 [Frontend] getPairs loaded {endpoint: '/api/v1/pairs?network=bsc', count: 19}
```

### ✅ Good Output (Wallet Connected to BSC)
```
[useConnectedNetwork] Detected network from browser provider: bsc
pairs.ts:9 [Frontend] getPairs loaded {endpoint: '/api/v1/pairs?network=bsc', count: 19}
```

### ✅ Good Output (Wallet Disconnected)
```
[useConnectedNetwork] Wallet disconnected, restoring stored network: bsc
[useConnectedNetwork] Using stored network (default): bsc
pairs.ts:9 [Frontend] getPairs loaded {endpoint: '/api/v1/pairs?network=bsc', count: 19}
```

### ✅ Good Output (Solana Connected)
```
[useConnectedNetwork] Detected connected Solana wallet
[useConnectedNetwork] Detected network from browser provider: solana
pairs.ts:9 [Frontend] getPairs loaded {endpoint: '/api/v1/pairs?network=solana', count: 20}
```

### ❌ Bad Output (Would indicate bug)
```
[Frontend] getPairs loaded {endpoint: '/api/v1/pairs?network=solana', count: 20}
// WITHOUT connecting Solana wallet
// This would mean the fix didn't work
```

## What Changed vs Before

| Action | Before | After |
|--------|--------|-------|
| Fresh load | ⚠️ Could be any chain | ✅ Always BSC |
| Phantom installed but not connected | ❌ Loads Solana pairs | ✅ Loads stored chain (usually BSC) |
| Disconnect wallet | ❌ Loads random chain | ✅ Loads previous chain (BSC) |
| Page refresh after connecting | ⚠️ Could forget chain | ✅ Remembers chain from localStorage |
| Switch MetaMask chain | ✅ Works | ✅ Still works |

## Network Chain IDs (For Reference)

When you see logs, these chain IDs are used:
- **56** → BSC (BNB Chain)
- **8453** → Base
- **1** → Ethereum
- **42161** → Arbitrum
- **43114** → Avalanche
- **137** → Polygon
- **SOL/SOLANA/101** → Solana

## If Something's Wrong

### Issue: Still showing Solana pairs when wallet not connected
- Open DevTools → Application → Local Storage
- Check if `cexdex-v2-network` has wrong value
- Run: `localStorage.removeItem('cexdex-v2-network')` and refresh
- Check console for error logs

### Issue: Pairs not loading at all
- Check if backend is running (`/api/v1/pairs?network=bsc`)
- Verify network request in DevTools → Network tab
- Check for API errors in Console

### Issue: Network keeps changing
- Watch Console logs during load
- Look for unexpected "Detected network" messages
- Check if Phantom is installed but incorrectly showing `isConnected: true`

## Performance Check

The fix should NOT cause performance issues:
- ✅ No infinite loops
- ✅ Single network detection per page load + per wallet change
- ✅ Minimal localStorage reads/writes
- ✅ No additional API calls

## Success Criteria

You know the fix works when:

1. ✅ Fresh load shows BSC pairs
2. ✅ Connecting wallet shows correct chain pairs
3. ✅ Disconnecting wallet keeps BSC pairs (doesn't switch to random)
4. ✅ Phantom installed but not connected → BSC pairs (not Solana)
5. ✅ Page refresh remembers last connected chain
6. ✅ Console shows proper debug logs for each action
7. ✅ No random switching between chains
