# Chain Persistence Test Cases

## Test Case 1: Fresh Load - No Wallet Connected

**Setup:**
- Clear localStorage: `localStorage.clear()`
- Close all wallet extensions
- Open UI in fresh incognito window

**Steps:**
1. Load the app
2. Open DevTools → Console
3. Observe which pairs load
4. Check localStorage value

**Expected Results:**
- Pairs loaded: **BSC pairs (19)**
- Console log: `[useConnectedNetwork] Using stored network (default): bsc`
- localStorage `cexdex-v2-network`: `bsc`
- ✅ PASS: If BSC pairs load with stored network = 'bsc'
- ❌ FAIL: If any other chain loads or error occurs

**Evidence to Capture:**
- Screenshot of pairs count
- Screenshot of console output
- Screenshot of localStorage value

---

## Test Case 2: Connect MetaMask to BSC

**Setup:**
- MetaMask installed and logged in
- Ensure MetaMask is on BSC network (chainId: 56)
- App already has BSC loaded from TC1

**Steps:**
1. Click "Connect Wallet" button
2. Select MetaMask
3. Approve connection
4. Observe pairs and console

**Expected Results:**
- Connection successful
- Pairs loaded: **BSC pairs (19)** (should stay same)
- Console log: `[useConnectedNetwork] Detected network from browser provider: bsc`
- localStorage `cexdex-v2-network`: `bsc`
- ✅ PASS: If BSC pairs load correctly
- ❌ FAIL: If pairs switch to wrong chain or error occurs

---

## Test Case 3: Disconnect MetaMask

**Setup:**
- MetaMask connected from TC2
- BSC pairs showing

**Steps:**
1. Click profile/disconnect button
2. Confirm disconnection
3. Observe pairs and console

**Expected Results:**
- Wallet disconnected
- Pairs loaded: **BSC pairs (19)** (MUST stay the same!)
- Console log: `[useConnectedNetwork] Wallet disconnected, restoring stored network: bsc`
- localStorage `cexdex-v2-network`: `bsc` (unchanged)
- ✅ PASS: If BSC pairs remain (critical test!)
- ❌ FAIL: If pairs change to another chain or Solana

**Why This Test is Critical:**
This was the main bug - after disconnect, pairs would randomly switch to Solana!

---

## Test Case 4: Phantom Installed But NOT Connected

**Setup:**
- Phantom wallet installed but NOT connected to app
- MetaMask disconnected from TC3
- BSC pairs currently showing

**Steps:**
1. Open DevTools → Console
2. Refresh the page
3. Observe pairs and console logs

**Expected Results:**
- No wallet connected
- Pairs loaded: **BSC pairs (19)** (NOT Solana!)
- Console log should show: `[useConnectedNetwork] No connected wallet provider detected`
- Then: `[useConnectedNetwork] Using stored network (default): bsc`
- ✅ PASS: If BSC pairs load (this is the core fix!)
- ❌ FAIL: If Solana pairs load or any other chain

**Why This Test Matters:**
This tests the specific bug fix for `getSolanaProvider()` checking `isConnected` status.

---

## Test Case 5: Connect Solana Wallet (Phantom)

**Setup:**
- Phantom wallet installed
- Phantom NOT connected yet
- Test from TC4 passed

**Steps:**
1. Open Phantom wallet extension
2. Click "Connect"
3. Go back to app
4. Observe pairs and console
5. Wait 2-3 seconds for detection

**Expected Results:**
- Phantom connected
- Pairs loaded: **Solana pairs (20)** (different count than BSC)
- Console log: `[useConnectedNetwork] Detected connected Solana wallet`
- Then: `[useConnectedNetwork] Detected network from browser provider: solana`
- localStorage `cexdex-v2-network`: `solana`
- ✅ PASS: If Solana pairs load (20 pairs instead of 19)
- ❌ FAIL: If BSC pairs still showing or error occurs

---

## Test Case 6: Disconnect Solana Wallet

**Setup:**
- Phantom connected from TC5
- Solana pairs showing

**Steps:**
1. Open Phantom wallet
2. Click "Disconnect"
3. Go back to app
4. Observe pairs and console

**Expected Results:**
- Phantom disconnected
- Pairs loaded: **BSC pairs (19)** (restores to last EVM chain)
- Console log: `[useConnectedNetwork] Wallet disconnected, restoring stored network: solana`
- Wait a moment: `[useConnectedNetwork] Using stored network (default): solana`
  OR if Solana wasn't default: `[useConnectedNetwork] No connected wallet provider detected`
  Then: `[useConnectedNetwork] Using stored network (default): bsc`
- ✅ PASS: If pairs change correctly based on stored network
- ❌ FAIL: If pairs don't restore properly or show error

---

## Test Case 7: Switch Chains in MetaMask

**Setup:**
- Connect MetaMask again (after TC6)
- MetaMask is on BSC (chainId: 56)
- BSC pairs showing

**Steps:**
1. Open MetaMask
2. Click network dropdown
3. Switch to "Base" (chainId: 8453)
4. Go back to app
5. Observe pairs and console

**Expected Results:**
- Chain switch successful
- Pairs loaded: **Different set than BSC** (Base pairs)
- Console log: `[useConnectedNetwork] Detected EVM chain: base`
- localStorage `cexdex-v2-network`: `base`
- ✅ PASS: If pairs update to Base pairs
- ❌ FAIL: If pairs stay as BSC or error occurs

---

## Test Case 8: Page Refresh Remembers Chain

**Setup:**
- From TC7 with Base connected
- Base pairs showing
- localStorage `cexdex-v2-network`: `base`

**Steps:**
1. Press F5 to refresh page
2. Don't interact with wallet
3. Observe pairs load
4. Check console

**Expected Results:**
- Page refreshes
- Pairs loaded: **Base pairs** (remembers from localStorage)
- Console log: `[useConnectedNetwork] Using stored network (default): base`
- ✅ PASS: If Base pairs load without reconnecting
- ❌ FAIL: If pairs change or shows default BSC

---

## Test Case 9: Multiple Chain Switches

**Setup:**
- From TC8 with Base still connected

**Steps:**
1. Switch MetaMask to Ethereum (chainId: 1)
2. Wait 1-2 seconds
3. Switch MetaMask to Arbitrum (chainId: 42161)
4. Wait 1-2 seconds
5. Switch MetaMask back to BSC (chainId: 56)
6. Observe console and pairs at each step

**Expected Results:**
- Step 1-2: Pairs update to Ethereum pairs, console: `Detected EVM chain: ethereum`
- Step 3-4: Pairs update to Arbitrum pairs, console: `Detected EVM chain: arbitrum`
- Step 5-6: Pairs update to BSC pairs, console: `Detected EVM chain: bsc`
- Each switch should be clean with no delays
- ✅ PASS: If all chains switch smoothly
- ❌ FAIL: If delays, wrong pairs, or duplicate fetches

---

## Test Case 10: Stress Test - Rapid Switches

**Setup:**
- MetaMask connected

**Steps:**
1. Rapidly click wallet connect/disconnect 5 times
2. Observe console
3. Observe pairs don't go random

**Expected Results:**
- No crashes or errors
- Pairs load correctly each time
- No random chain switches
- Console shows proper logic flow
- ✅ PASS: If stable under stress
- ❌ FAIL: If crashes, shows random chains, or hangs

---

## Console Log Verification

For each test, check that console logs include:

### Good Logs (Goal)
```
✅ [useConnectedNetwork] Using stored network (default): bsc
✅ [useConnectedNetwork] Detected network from browser provider: bsc
✅ [useConnectedNetwork] Wallet disconnected, restoring stored network: bsc
✅ [useConnectedNetwork] Detected connected Solana wallet
✅ [useConnectedNetwork] No connected wallet provider detected
```

### Bad Logs (Indicate Issues)
```
❌ [useConnectedNetwork] Error: Cannot read properties of undefined
❌ Uncaught error about network
❌ No logs at all (silent failure)
```

---

## LocalStorage Verification

After each critical test:

```javascript
// In DevTools Console:
console.log('Stored network:', localStorage.getItem('cexdex-v2-network'));

// Expected values:
// 'bsc'     → BSC Chain
// 'base'    → Base Network
// 'solana'  → Solana Network
// 'ethereum'→ Ethereum
// etc.

// Should NEVER be:
// null      (should default to 'bsc')
// undefined (invalid)
// random strings (invalid)
```

---

## Test Execution Summary

| TC # | Title | Status | Notes |
|------|-------|--------|-------|
| 1 | Fresh Load | [ ] | Must show BSC |
| 2 | Connect MetaMask | [ ] | Should stay BSC |
| 3 | Disconnect MetaMask | [ ] | **CRITICAL** - Must stay BSC |
| 4 | Phantom Not Connected | [ ] | **CRITICAL** - Must NOT load Solana |
| 5 | Connect Solana Wallet | [ ] | Should load Solana (20 pairs) |
| 6 | Disconnect Solana | [ ] | Should restore previous chain |
| 7 | Switch Chains | [ ] | Should update pairs instantly |
| 8 | Refresh Page | [ ] | Should remember chain |
| 9 | Multiple Switches | [ ] | All should work smoothly |
| 10 | Stress Test | [ ] | Should be stable |

**Overall Result:** [ ] PASS [ ] FAIL

---

## Debugging Tips

If a test fails:

1. **Check Console First**
   - Look for error messages
   - Trace the detection logic
   - Verify which priority was triggered

2. **Check localStorage**
   ```javascript
   localStorage.getItem('cexdex-v2-network')
   localStorage.getItem('cexdex-auth-token')
   ```

3. **Check Network Requests**
   - DevTools → Network tab
   - Look for `/api/v1/pairs?network=XXX` requests
   - Check if returning correct data

4. **Clear and Retry**
   ```javascript
   localStorage.clear()
   location.reload()
   ```

5. **Check Wallet Status**
   - Is MetaMask/Phantom actually connected?
   - Is the correct chain selected?
   - Are there any wallet errors?

---

## Sign-Off

- **Tester Name:** _______________
- **Date:** _______________
- **Browser:** _______________
- **Wallet Extensions:** _______________
- **Overall Result:** ✅ PASS / ❌ FAIL
- **Notes:** _______________
