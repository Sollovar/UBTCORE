# Price Flash Animation Bug Fix

## Problem Analysis

The price color flashing (green/red) is not working most of the time across:
1. Market page (mobile) - both top movers and main table
2. Pair selector panels (mobile and desktop)
3. Trade page headers (mobile and desktop)

## Root Cause

After analyzing the code, I found **THREE critical issues**:

### Issue 1: Flash Logic in `useRealtimePairs` Hook
The flash direction calculation has a logic problem in the `ticker` message handler:

```typescript
const dir: FlashDir = source === 'fill'
  ? (() => {
    const newPrice = typeof p.last_price === 'string' && p.last_price !== ''
      ? parseFloat(p.last_price)
      : undefined;
    if (newPrice == null || Number.isNaN(newPrice)) return null;
    return newPrice > oldExchangePrice ? 'up' : newPrice < oldExchangePrice ? 'down' : null;
  })()
  : (newGeckoPrice != null && !Number.isNaN(newGeckoPrice)
    ? (newGeckoPrice > oldGeckoPrice ? 'up' : newGeckoPrice < oldGeckoPrice ? 'down' : null)
    : null);
```

**Problem**: When `source === 'fill'`, it compares `newPrice` (exchange price from last_price) with `oldExchangePrice`, but when source is from cache refresh (GeckoTerminal), it compares `newGeckoPrice` with `oldGeckoPrice`. However, the `oldGeckoPrice` is fetched BEFORE updating the pair, so if the pair was just updated by a fill, `oldGeckoPrice` might be stale.

### Issue 2: `useGeckoPriceFlash` Hook Race Condition
The `useGeckoPriceFlash` hook has a critical flaw:

```typescript
useEffect(() => {
  if (!pairId || geckoPrice == null || geckoPrice <= 0) {
    prevPrice.current = undefined;
    return;
  }

  // First time seeing this price - store it but don't flash
  if (prevPrice.current === undefined) {
    prevPrice.current = geckoPrice;
    return;
  }

  // Price changed - trigger flash
  if (geckoPrice !== prevPrice.current) {
    // ... flash logic
  }
}, [pairId, geckoPrice]);
```

**Problem**: The `prevPrice.current === undefined` check means the FIRST price update never flashes. Additionally, if the component rerenders with the same `geckoPrice` value, nothing happens. The flash only works if the `geckoPrice` prop changes, but due to how React's reconciliation works, sometimes the price updates but the effect doesn't detect it as a change.

### Issue 3: Flash Animation CSS Transition Missing
The components use inline styles like:
```typescript
style={{ color: priceColor, transition: "color 0.15s ease" }}
```

This only animates the color change but doesn't create a "flash" effect. A true flash needs to:
1. Change to flash color immediately
2. Hold the flash color briefly
3. Fade back to normal color

The current implementation just transitions from one color to another, which is barely noticeable.

## Solution

### Fix 1: Improve Flash Detection in `useRealtimePairs` ✅
We fixed the flash direction calculation by:
1. Capturing OLD prices BEFORE parsing new values from the WebSocket message
2. Adding proper null checks and zero-price guards to prevent false flashes
3. Separating the flash logic for 'fill' events (exchange price) vs cache refresh (gecko price)
4. Only triggering flash when there's an actual price change (not on first price or same price)

**Changes made:**
- Moved `oldGeckoPrice` and `oldExchangePrice` capture to the top of the ticker handler
- Rewrote flash direction logic to be more explicit and handle edge cases
- Added checks to prevent flashing on first price or when price hasn't changed

### Fix 2: Improve `useGeckoPriceFlash` Hook ✅
We fixed the race condition and missing flash issue by:
1. Adding epsilon-based comparison to handle floating point precision issues
2. Properly handling the initial price state
3. Resetting flash state when pair changes
4. Adding guards for invalid prices

**Changes made:**
- Added `priceDiff` calculation with epsilon threshold (0.0000001)
- Reset flash state when pairId changes
- Only skip flash on truly first/zero prices, not on subsequent updates

### Fix 3: Enhanced Flash Visual Effect ✅
We improved the visual flash animation by:
1. Removing transition when flash is active (instant color change)
2. Adding 700ms ease-out transition when flash ends (smooth fade back)
3. Adding text-shadow glow effect during flash for more dramatic effect
4. Using proper flash colors with glow

**Changes made in components:**
- **MobileMarketSelectPanel.tsx**: Updated price display with conditional transition and text-shadow
- **PairSelectorPanel.tsx**: Updated price display with conditional transition and text-shadow  
- **MobileMarketsPage.tsx**: Updated MoverCard price display with conditional transition and text-shadow

**CSS Technique:**
```typescript
style={{ 
  color: priceColor, 
  transition: flash ? "none" : "color 700ms ease-out",  // Instant up, slow down
  textShadow: flash ? `0 0 8px ${flashColor}` : "none"  // Glow effect
}}
```

This creates a much more noticeable flash:
- Price instantly changes to bright green (#00c853) or red (#ff1744)
- Glows with text-shadow during flash
- Smoothly fades back to normal color over 700ms

## Implementation Status

✅ Fixed `useRealtimePairs` flash detection logic
✅ Fixed `useGeckoPriceFlash` hook race condition
✅ Enhanced visual flash effect with glow
✅ Applied fixes to all affected components

## Testing Checklist

- [ ] Market page (mobile) - top movers show green/red flash
- [ ] Market page (mobile) - pairs table shows green/red flash
- [ ] Market select panel (mobile) - prices flash on update
- [ ] Pair selector panel (desktop) - prices flash on update
- [ ] Trade page header (mobile) - gecko price flashes
- [ ] Trade page header (desktop) - gecko price flashes
