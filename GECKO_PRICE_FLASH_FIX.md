# Gecko Price Color Flashing Fix

## Problem
The Gecko prices (CoinGecko/GeckoTerminal market prices) were showing stuck on red color and not properly flashing green when prices went up or red when prices went down. The color was only based on the 24h change percentage, not real-time price movements.

## Locations Fixed

### Mobile UI
1. **Chart UI (MobilePairHeader.tsx)** - Price at top right with sparkline
2. **Trade Page (MobileTradeView.tsx)** - Fiat price at top right (first price, not exchange price)

### Desktop UI
1. **Trade Page (TradingPairHeader.tsx)** - Main Gecko price display at top

## Solution

### Created New Hook: `useGeckoPriceFlash.ts`
A dedicated hook that tracks Gecko price changes in real-time and provides flash directions (up/down/null) for color animations. This is separate from exchange price flashing.

**Features:**
- Tracks previous Gecko price values per pair
- Detects when price increases (flash up/green) or decreases (flash down/red)
- Flash lasts 700ms before returning to base color
- Automatically cleans up timers on unmount

### Updated Components

**Color Logic:**
- **Flash up (price rising)**: Bright green `#00ff7f` with glow effect
- **Flash down (price falling)**: Bright red `#ff4d6a` with glow effect
- **Base state up (24h positive)**: Green `#00c853` or `#00c8a0`
- **Base state down (24h negative)**: Red `#ff1744` or `#ff4d6a`

**Visual Effects:**
- Added `textShadow` glow when flashing: `0 0 8px ${color}99`
- Smooth color transitions: `transition: color 0.15s ease`
- Flash is separate for Gecko prices vs Exchange prices

## Technical Details

The fix separates **Gecko price flashing** from **Exchange price flashing**:
- **Exchange prices** (pair.price) update from `price_update` WebSocket events (sub-second fills)
- **Gecko prices** (pair.geckoPrice) update from `ticker` WebSocket events (cache refresh every 30s)

Previously, both used the same flash state which caused issues. Now:
- `useRealtimePairs` flash → Exchange price movements
- `useGeckoPriceFlash` → Gecko price movements (market reference)

## Files Modified
1. ✅ `artifacts/dex/src/hooks/useGeckoPriceFlash.ts` (NEW)
2. ✅ `artifacts/dex/src/mobile/components/MobilePairHeader.tsx`
3. ✅ `artifacts/dex/src/mobile/components/MobileTradeView.tsx`
4. ✅ `artifacts/dex/src/desktop/components/TradingPairHeader.tsx`

## Testing
Watch the Gecko prices (market prices, not exchange prices) in:
- Mobile chart header (top right)
- Mobile trade page (first price at top right)
- Desktop trade page (main price display)

When Gecko prices update from the ticker WebSocket events, you should see:
- Green flash when price increases
- Red flash when price decreases
- Smooth return to base color after 700ms
