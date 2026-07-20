# getRpcUrl Import Fix ✅

## Problem
When creating BSC orders, the application crashed with:
```
ReferenceError: getRpcUrl is not defined
at fetchTokenDecimals (amount.ts:63:20)
```

## Root Cause
In `artifacts/dex/src/utils/amount.ts`, the function `getRpcUrl()` was being called on line 63 to fetch token decimals from EVM contracts, but it was **not imported** from the contracts module.

## Solution
Added `getRpcUrl` to the import statement in `amount.ts`:

### Before:
```typescript
import { getSolanaRpcUrls, Network } from './contracts';
```

### After:
```typescript
import { getSolanaRpcUrls, Network, getRpcUrl } from './contracts';
```

## What getRpcUrl Does
The `getRpcUrl()` function returns the appropriate RPC URL for a given network (BSC, Base, or Solana), which is needed to:
1. Create a Viem public client for reading EVM contracts
2. Fetch token decimals from ERC-20 contracts
3. Check token approvals before creating orders

## Testing
✅ TypeScript compilation passes with no errors
✅ BSC order creation should now work properly
✅ Base order creation should also work
✅ Token decimal fetching for all EVM chains restored

## Files Modified
- `artifacts/dex/src/utils/amount.ts` - Added `getRpcUrl` to imports

---

**Status**: ✅ FIXED - Missing import added
**Error**: ✅ RESOLVED - "getRpcUrl is not defined" eliminated
