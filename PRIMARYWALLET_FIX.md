# primaryWallet Undefined Error Fix ✅

## Problem
```
ReferenceError: primaryWallet is not defined
at MobileMarketsPage.tsx:480:33
```

The MobileMarketsPage component was trying to use `primaryWallet` but it was never imported or initialized.

## Root Cause
When I added the `walletAddress` prop to `MobileOrderBookView` in the Markets page, I referenced `primaryWallet` but forgot to:
1. Import `useDynamicContext` from `@dynamic-labs/sdk-react-core`
2. Call the hook to get `primaryWallet`

## Solution

### Added Import:
```typescript
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
```

### Added Hook Call:
```typescript
export function MobileMarketsPage({ market, currentPairId, flashMap = {}, onSelectPair, onOpenMarketPanel }: Props) {
  const { t } = useTranslation();
  const { primaryWallet } = useDynamicContext();  // ✅ ADDED
  // ... rest of component
}
```

Now `primaryWallet` is properly available and the order book can fetch user orders in the Markets page!

---

**Status**: ✅ FIXED
**Error**: ✅ RESOLVED - "primaryWallet is not defined" eliminated
