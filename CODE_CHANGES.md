# Code Changes - Line by Line

## File: `artifacts/dex/src/hooks/useConnectedNetwork.ts`

### Change #1: Fixed Solana Connection Detection (Lines 76-84)

**BEFORE (Buggy):**
```typescript
const getSolanaProvider = (): { isPhantom?: boolean; isSolflare?: boolean; publicKey?: { toString: () => string }; isConnected?: boolean } | null => {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as Record<string, unknown>;
  const sol = win.solana as Record<string, unknown> | undefined;
  if (!sol || typeof sol !== 'object') return null;
  if (sol.isPhantom || sol.isSolflare || sol.isConnected || sol.publicKey) {
    return sol as { isPhantom?: boolean; isSolflare?: boolean; publicKey?: { toString: () => string }; isConnected?: boolean };
  }
  return null;
};
```

**AFTER (Fixed):**
```typescript
const getSolanaProvider = (): { isPhantom?: boolean; isSolflare?: boolean; publicKey?: { toString: () => string }; isConnected?: boolean } | null => {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as Record<string, unknown>;
  const sol = win.solana as Record<string, unknown> | undefined;
  if (!sol || typeof sol !== 'object') return null;
  
  // Only return provider if it's actually CONNECTED (not just installed)
  // Check isConnected property or publicKey existence
  const isConnected = (sol.isConnected === true) || (sol.publicKey !== undefined && sol.publicKey !== null);
  if (isConnected && (sol.isPhantom || sol.isSolflare)) {
    return sol as { isPhantom?: boolean; isSolflare?: boolean; publicKey?: { toString: () => string }; isConnected?: boolean };
  }
  return null;
};
```

**What Changed:**
- ❌ Removed: `|| sol.isConnected || sol.publicKey` from condition (too loose)
- ✅ Added: Explicit check `const isConnected = (sol.isConnected === true) || (sol.publicKey !== undefined && sol.publicKey !== null)`
- ✅ Added: Require `isConnected && (sol.isPhantom || sol.isSolflare)` for connection check

**Why:** Ensures only connected wallets are detected, not just installed ones.

---

### Change #2: Updated Browser Provider Detection (Lines 116-146)

**BEFORE (Minimal logging):**
```typescript
const getNetworkFromBrowserProvider = async (): Promise<Network | undefined> => {
  const solanaProvider = getSolanaProvider();
  if (solanaProvider) return 'solana';

  const ethereum = getEthereumProvider();
  if (!ethereum) return undefined;

  try {
    const chainId = await ethereum.request({ method: 'eth_chainId' });
    const chainIdNum = parseInt(String(chainId).replace('0x', ''), 16);
    return chainIdToNetwork[String(chainIdNum)];
  } catch (err) {
    console.error('[useConnectedNetwork] Browser provider network lookup failed:', err);
    return undefined;
  }
};
```

**AFTER (With helpful logging):**
```typescript
const getNetworkFromBrowserProvider = async (): Promise<Network | undefined> => {
  // Only check Solana if it's actively connected
  const solanaProvider = getSolanaProvider();
  if (solanaProvider) {
    console.debug('[useConnectedNetwork] Detected connected Solana wallet');
    return 'solana';
  }

  // Then check EVM providers
  const ethereum = getEthereumProvider();
  if (!ethereum) {
    console.debug('[useConnectedNetwork] No connected wallet provider detected');
    return undefined;
  }

  try {
    const chainId = await ethereum.request({ method: 'eth_chainId' });
    const chainIdNum = parseInt(String(chainId).replace('0x', ''), 16);
    const network = chainIdToNetwork[String(chainIdNum)];
    if (network) {
      console.debug('[useConnectedNetwork] Detected EVM chain:', network, 'chainId:', chainIdNum);
    }
    return network;
  } catch (err) {
    console.error('[useConnectedNetwork] Browser provider network lookup failed:', err);
    return undefined;
  }
};
```

**What Changed:**
- ✅ Added: Comment explaining Solana check
- ✅ Added: Debug logs for each detection step
- ✅ Added: Comment explaining EVM check
- ✅ Added: More detailed chainId logging

**Why:** Better debugging and understanding of detection flow.

---

### Change #3: Added Wallet Disconnection Tracking (Line 149)

**BEFORE:**
```typescript
export function useConnectedNetwork(): Network {
  const [network, setNetwork] = useState<Network>(() => getStoredNetwork());
  const { primaryWallet, network: dynamicNetwork } = useDynamicContext();
  const isDetecting = useRef(false);
```

**AFTER:**
```typescript
export function useConnectedNetwork(): Network {
  const [network, setNetwork] = useState<Network>(() => getStoredNetwork());
  const { primaryWallet, network: dynamicNetwork } = useDynamicContext();
  const isDetecting = useRef(false);
  const prevWalletRef = useRef<any>(null);  // ✅ NEW: Track previous wallet state
```

**What Changed:**
- ✅ Added: `const prevWalletRef = useRef<any>(null);`

**Why:** Track when wallet was connected so we can restore chain on disconnect.

---

### Change #4: Improved Detect Network Logic (Lines 160-215)

**BEFORE:**
```typescript
  const detectNetwork = useCallback(async () => {
    if (isDetecting.current) return;
    isDetecting.current = true;
    
    try {
      if (dynamicNetwork) {
        const normalized = normalizeNetworkValue(dynamicNetwork);
        if (normalized) {
          setNetworkState(normalized);
          return;
        }
      }

      if (primaryWallet) {
        const walletDetected = await getNetworkFromWallet(primaryWallet);
        if (walletDetected) {
          setNetworkState(walletDetected);
          return;
        }
      }

      const browserDetected = await getNetworkFromBrowserProvider();
      if (browserDetected) {
        setNetworkState(browserDetected);
        return;
      }
    } catch (err) {
      console.error('[useConnectedNetwork] Error:', err);
    } finally {
      isDetecting.current = false;
    }
  }, [dynamicNetwork, primaryWallet]);
```

**AFTER:**
```typescript
  const detectNetwork = useCallback(async () => {
    if (isDetecting.current) return;
    isDetecting.current = true;
    
    try {
      // Priority 1: Dynamic network from connected wallet
      if (dynamicNetwork) {
        const normalized = normalizeNetworkValue(dynamicNetwork);
        if (normalized) {
          console.debug('[useConnectedNetwork] Detected network from dynamicNetwork:', normalized);
          setNetworkState(normalized);
          isDetecting.current = false;
          return;
        }
      }

      // Priority 2: Primary wallet connection
      if (primaryWallet) {
        const walletDetected = await getNetworkFromWallet(primaryWallet);
        if (walletDetected) {
          console.debug('[useConnectedNetwork] Detected network from primaryWallet:', walletDetected);
          setNetworkState(walletDetected);
          prevWalletRef.current = primaryWallet;  // ✅ Remember wallet was connected
          isDetecting.current = false;
          return;
        }
      }

      // Priority 3: Browser provider (MetaMask, etc.)
      const browserDetected = await getNetworkFromBrowserProvider();
      if (browserDetected) {
        console.debug('[useConnectedNetwork] Detected network from browser provider:', browserDetected);
        setNetworkState(browserDetected);
        isDetecting.current = false;
        return;
      }

      // Priority 4: If no wallet is connected now, but we had one before, use stored network
      // This handles the case where user disconnected their wallet
      if (!primaryWallet && prevWalletRef.current) {
        const stored = getStoredNetwork();
        console.debug('[useConnectedNetwork] Wallet disconnected, restoring stored network:', stored);
        setNetworkState(stored);
        prevWalletRef.current = null;
        isDetecting.current = false;
        return;
      }

      // Priority 5: Fallback to stored network (should always have a value, defaults to 'bsc')
      const stored = getStoredNetwork();
      console.debug('[useConnectedNetwork] Using stored network (default):', stored);
      setNetworkState(stored);
    } catch (err) {
      console.error('[useConnectedNetwork] Error during detection:', err);
      // On error, always fall back to stored network
      const stored = getStoredNetwork();
      console.debug('[useConnectedNetwork] Error fallback to stored network:', stored);
      setNetworkState(stored);
    } finally {
      isDetecting.current = false;
    }
  }, [dynamicNetwork, primaryWallet, setNetworkState]);
```

**What Changed:**
- ✅ Added: Priority comments (1-5)
- ✅ Added: `console.debug()` logs at each priority
- ✅ Added: `prevWalletRef.current = primaryWallet;` to remember wallet
- ✅ Added: Priority 4 check for wallet disconnection
- ✅ Added: `isDetecting.current = false;` before early returns
- ✅ Added: Error recovery with fallback to stored network
- ✅ Updated: Dependencies to include `setNetworkState`

**Why:** 
- Makes detection logic explicit and traceable
- Handles wallet disconnection properly
- Provides better error recovery
- Adds comprehensive logging for debugging

---

### Change #5: Simplified Initial Load (Lines 217-223)

**BEFORE:**
```typescript
  useEffect(() => {
    async function initNetwork() {
      if (dynamicNetwork) {
        const normalized = normalizeNetworkValue(dynamicNetwork);
        if (normalized) {
          setNetworkState(normalized);
          return;
        }
      }

      if (primaryWallet) {
        const walletDetected = await getNetworkFromWallet(primaryWallet);
        if (walletDetected) {
          setNetworkState(walletDetected);
          return;
        }
      }

      const browserDetected = await getNetworkFromBrowserProvider();
      if (browserDetected) {
        setNetworkState(browserDetected);
        return;
      }
      
      const stored = getStoredNetwork();
      setNetwork(stored);
    }
    
    initNetwork();
  }, [primaryWallet, dynamicNetwork]);
```

**AFTER:**
```typescript
  // Initial network load on mount
  useEffect(() => {
    const stored = getStoredNetwork();
    setNetwork(stored);
    detectNetwork();
  }, []);
```

**What Changed:**
- ❌ Removed: Complex async initNetwork function
- ✅ Added: Simple immediate stored network load
- ✅ Added: Call to detectNetwork() for wallet detection
- ✅ Changed: Empty dependency array (run once on mount)

**Why:** 
- Simpler and clearer
- Avoids code duplication
- Ensures stored network is loaded immediately
- Uses existing detectNetwork() logic

---

### Change #6: Cleaner Wallet Change Effect (Lines 225-228)

**BEFORE:**
```typescript
  useEffect(() => {
    if (primaryWallet || dynamicNetwork) {
      const timer = window.setTimeout(detectNetwork, 500);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [primaryWallet, dynamicNetwork, detectNetwork]);
```

**AFTER:**
```typescript
  // Detect network when wallet connection status changes
  useEffect(() => {
    detectNetwork();
  }, [primaryWallet, dynamicNetwork, detectNetwork]);
```

**What Changed:**
- ❌ Removed: Conditional check for primaryWallet/dynamicNetwork
- ❌ Removed: 500ms timeout delay
- ✅ Added: Direct detectNetwork() call
- ✅ Added: Comment explaining the effect

**Why:** 
- Cleaner and more direct
- detectNetwork() already has guard against re-detection
- No need for artificial delay
- Faster detection of wallet changes

---

### Change #7: Better Chain Change Listener (Lines 230-241)

**BEFORE:**
```typescript
  useEffect(() => {
    const ethereum = getEthereumProvider();
    if (!ethereum) return;

    const handleChainChange = () => {
      detectNetwork();
    };

    if (ethereum.on) {
      ethereum.on('chainChanged', handleChainChange);
    }

    return () => {
      ethereum.removeListener?.('chainChanged', handleChainChange);
    };
  }, [detectNetwork]);
```

**AFTER:**
```typescript
  // Listen for manual chain changes on browser provider
  useEffect(() => {
    const ethereum = getEthereumProvider();
    if (!ethereum) return;

    const handleChainChange = () => {
      detectNetwork();
    };

    if (ethereum.on) {
      ethereum.on('chainChanged', handleChainChange);
    }

    return () => {
      ethereum.removeListener?.('chainChanged', handleChainChange);
    };
  }, [detectNetwork]);
```

**What Changed:**
- ✅ Added: Comment explaining the effect

**Why:** Clarity and documentation.

---

### Change #8: Unchanged - Manual Change Listener (Lines 243-251)

**No changes made to this effect** - it was already good:

```typescript
  useEffect(() => {
    const handleManualChange = () => {
      const stored = getStoredNetwork();
      setNetwork(stored);
    };

    window.addEventListener('network-change', handleManualChange);
    return () => window.removeEventListener('network-change', handleManualChange);
  }, []);
```

---

## Summary of Changes

| Type | Count | Purpose |
|------|-------|---------|
| Logic fixes | 2 | Solana connection check, wallet tracking |
| Added logs | 8 | Debug output for troubleshooting |
| Refactored | 3 | cleaner code, better structure |
| Comments | 5 | Explain intent and priority |
| Total lines changed | ~50 | Minimal, focused changes |

## No Breaking Changes

- ✅ Function signatures unchanged
- ✅ Return types unchanged
- ✅ API compatibility maintained
- ✅ localStorage keys unchanged
- ✅ No new dependencies
- ✅ No environment variables needed

## Testing the Changes

**Before deploying:**
1. Build: `npm run build` (check for TypeScript errors)
2. Test: Follow `TEST_CASES.md`
3. Monitor: Check console logs during testing
4. Verify: Run all 10 test scenarios

**After deploying:**
1. Monitor user reports
2. Check browser console for errors
3. Verify chain persistence works
4. Remove debug logs if desired (optional)

---

## Rollback Plan (if needed)

If issues occur:
1. Revert `artifacts/dex/src/hooks/useConnectedNetwork.ts` to previous version
2. Redeploy
3. Test to confirm issue resolved
4. Report findings

The change is low-risk and easily reversible.
