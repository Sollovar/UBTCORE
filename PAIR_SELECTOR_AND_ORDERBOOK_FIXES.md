# Pair Selector & Order Book Mid Price Fixes

## Problems Fixed

### 1. **Desktop Pair Selector Not Sorted by Volume** ❌
- Pairs were shown in random/API order
- High-volume pairs were buried in the list
- Mobile markets page sorts by volume by default, but desktop didn't

### 2. **Order Book Mid Price Permanent Color** ❌
- Desktop: Mid price was always red or green based on direction
- Mobile: Mid price was always red or green based on direction
- Should be **neutral white** with **green/red flash effect** when price changes

## Solutions Implemented

### Fix 1: Desktop Pair Selector - Sort by Volume

**File:** `artifacts/dex/src/desktop/components/PairSelectorPanel.tsx`

**Before:**
```typescript
const displayed = useMemo(() => {
  let list = filtered;
  if (filterTab === "Favorites") list = list.filter((p) => p.starred);
  if (filterTab === "Gainers") list = list.filter((p) => p.change24h > 0);
  if (filterTab === "Losers") list = list.filter((p) => p.change24h < 0);
  if (filterTab === "Volume") list = [...list].sort((a, b) => b.volumeUSD - a.volumeUSD);
  if (filterTab === "Trending") list = [...list].sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h));
  // "All" tab had NO sorting - random order ❌
  return list;
}, [filtered, filterTab]);
```

**After:**
```typescript
const displayed = useMemo(() => {
  let list = filtered;
  if (filterTab === "Favorites") list = list.filter((p) => p.starred);
  if (filterTab === "Gainers") list = list.filter((p) => p.change24h > 0);
  if (filterTab === "Losers") list = list.filter((p) => p.change24h < 0);
  if (filterTab === "Volume") list = [...list].sort((a, b) => b.volumeUSD - a.volumeUSD);
  if (filterTab === "Trending") list = [...list].sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h));
  // Default sort for "All" tab: sort by volume DESC (highest first) ✓
  if (filterTab === "All") list = [...list].sort((a, b) => b.volumeUSD - a.volumeUSD);
  return list;
}, [filtered, filterTab]);
```

**Result:**
- "All" tab now shows highest-volume pairs first
- Matches mobile markets page behavior
- Professional DEX standard (Uniswap, PancakeSwap style)

---

### Fix 2: Order Book Mid Price Flash Effect

#### Desktop Order Book

**File:** `artifacts/dex/src/desktop/components/OrderBook.tsx`

**Added Import:**
```typescript
import { useGeckoPriceFlash } from "@/hooks/useGeckoPriceFlash";
```

**Before:**
```typescript
const priceUp = market.price >= market.prevPrice;
const priceColor = priceUp ? "#00c853" : "#ff1744"; // ❌ Always colored
const arrow = priceUp ? "↑" : "↓";
```

**After:**
```typescript
// Price flash effect - neutral white with green/red flash
const priceFlash = useGeckoPriceFlash(pairId ?? null, market.price);
const flashUpColor = "#00ff7f";
const flashDownColor = "#ff4d6a";
const neutralColor = "#f5f5f5"; // White/neutral when not flashing

const midPriceColor = priceFlash === "up" ? flashUpColor
                    : priceFlash === "down" ? flashDownColor
                    : neutralColor; // ✓ Neutral white by default

const priceUp = market.price >= market.prevPrice;
const arrow = priceUp ? "↑" : "↓";
```

**Mid Price Display (Before):**
```tsx
<span className="text-[14px]" style={{ color: priceColor }}>
  {fmtPrice(market.price)}
  <span className="text-[10px] ml-1.5">{arrow}</span>
</span>
```

**Mid Price Display (After):**
```tsx
<span 
  className="text-[14px]" 
  style={{ 
    color: midPriceColor, // ✓ Flash-aware color
    transition: priceFlash ? "none" : "color 700ms ease-out",
    textShadow: priceFlash ? `0 0 8px ${priceFlash === 'up' ? flashUpColor : flashDownColor}` : "none"
  }}
>
  {fmtPrice(market.price)}
  <span className="text-[10px] ml-1.5">{arrow}</span>
</span>
```

#### Mobile Trade Page

**File:** `artifacts/dex/src/mobile/components/MobileTradeView.tsx`

Mobile already had `geckoColor` defined (line 708), which is the flash-aware color. Just needed to use it instead of the permanent color.

**Before:**
```tsx
<span 
  className="font-bold tabular-nums text-[12px] leading-none" 
  style={{ color: priceUp ? "#00c8a0" : "#ff4d6a" }} // ❌ Always colored
>
  {fmtCompactPrice(market.price)}
</span>
```

**After:**
```tsx
<span 
  className="font-bold tabular-nums text-[12px] leading-none" 
  style={{ 
    color: geckoColor, // ✓ Use flash-aware color
    transition: geckoFlash ? "none" : "color 700ms ease-out",
    textShadow: geckoFlash ? `0 0 6px ${geckoFlash === 'up' ? flashUpColor : flashDownColor}` : "none"
  }}
>
  {fmtCompactPrice(market.price)}
</span>
```

---

## Flash Effect Behavior

### Color States:
1. **Neutral (Default):** `#f5f5f5` (white) - when price is stable
2. **Flash Up:** `#00ff7f` (bright green) - instant flash when price increases
3. **Flash Down:** `#ff4d6a` (bright red) - instant flash when price decreases
4. **Fade Out:** 700ms transition back to neutral white

### Flash Trigger:
- Price changes detected by `useGeckoPriceFlash` hook
- Flash duration: ~300ms (controlled by hook)
- Fade transition: 700ms ease-out
- Text shadow: Glowing effect during flash

---

## Visual Comparison

### Desktop Order Book Mid Price

**Before:**
```
Price: $1.234  ← Always green (if up) or red (if down)
```

**After:**
```
Price: $1.234  ← White normally
       ↓ flash
Price: $1.234  ← GREEN flash (300ms) when price goes up
       ↓ fade
Price: $1.234  ← Back to white (700ms transition)
```

### Mobile Trade Page Mid Price Pill

**Before:**
```
┌──────────────┐
│ 0.001830  ▲ │ ← Always green
│ ≈ $1.234    │
└──────────────┘
```

**After:**
```
┌──────────────┐
│ 0.001830  ▲ │ ← White normally, GREEN flash on increase
│ ≈ $1.234    │
└──────────────┘
```

---

## Testing

### Test Pair Selector Volume Sort
1. Open desktop pair selector (click pair name)
2. Default "All" tab should show pairs sorted by volume
3. Highest volume pairs at the top
4. Matches mobile markets page order

### Test Order Book Mid Price Flash
1. **Desktop:**
   - Open any pair on desktop
   - Watch order book mid price (center between asks/bids)
   - Price should be white normally
   - Flash green when price increases
   - Flash red when price decreases
   - Fade back to white after flash

2. **Mobile:**
   - Open trade page
   - Toggle to show order book
   - Mid price pill should be white normally
   - Flash green when price increases
   - Flash red when price decreases
   - Fade back to white after flash

## Files Modified

1. **Desktop Pair Selector:** `artifacts/dex/src/desktop/components/PairSelectorPanel.tsx`
2. **Desktop Order Book:** `artifacts/dex/src/desktop/components/OrderBook.tsx`
3. **Mobile Trade View:** `artifacts/dex/src/mobile/components/MobileTradeView.tsx`

## Result

✓ **Desktop pair selector sorted by volume** - High-volume pairs show first  
✓ **Order book mid price neutral white** - Professional appearance  
✓ **Flash effect on price changes** - Clear visual feedback  
✓ **Consistent behavior** - Desktop and mobile match  
✓ **Industry standard** - Matches Binance, Coinbase, Uniswap style  

---
*Date: 2026-07-09*
*Status: FIXED & VERIFIED*
