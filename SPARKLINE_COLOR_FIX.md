# Sparkline Chart Color Fix ✅

## Problem
In the desktop pair selector panel, the 7-day mini sparkline charts were using various colors (purple, blue, orange, etc.) from the `symbolColor()` function instead of the standard green/red based on price change.

## Solution
Changed the sparkline color to use green for positive price change and red for negative price change, matching standard trading UI conventions.

### Before
```typescript
<Sparkline 
  data={pair.spark7d} 
  color={pair.color}  // ❌ Random color (purple, blue, orange, etc.)
  w={62} 
  h={20} 
/>
```

### After
```typescript
<Sparkline 
  data={pair.spark7d} 
  color={pair.change24h >= 0 ? "#00c853" : "#ff1744"}  // ✅ Green or red
  w={62} 
  h={20} 
/>
```

## Color Logic

**Green (`#00c853`)**: Used when `change24h >= 0` (positive or zero change)
**Red (`#ff1744`)**: Used when `change24h < 0` (negative change)

This matches the color scheme used everywhere else in the app:
- Price change percentages
- Price displays
- Order book
- Chart indicators

## Visual Example

### Before
```
┌───────────────────────────┐
│ BTC/USDT  $45,123  +2.5% │
│ [Purple sparkline] 📈     │ ❌ Purple doesn't indicate up/down
│                           │
│ ETH/USDT  $2,345  -1.2%  │
│ [Blue sparkline] 📉       │ ❌ Blue doesn't indicate up/down
│                           │
│ SOL/USDT  $98.45  +5.3%  │
│ [Orange sparkline] 📈     │ ❌ Orange doesn't indicate up/down
└───────────────────────────┘
```

### After
```
┌───────────────────────────┐
│ BTC/USDT  $45,123  +2.5% │
│ [Green sparkline] 📈      │ ✅ Green = positive
│                           │
│ ETH/USDT  $2,345  -1.2%  │
│ [Red sparkline] 📉        │ ✅ Red = negative
│                           │
│ SOL/USDT  $98.45  +5.3%  │
│ [Green sparkline] 📈      │ ✅ Green = positive
└───────────────────────────┘
```

## Benefits

✅ **Instant Recognition**: Users immediately know if price went up (green) or down (red)
✅ **Consistency**: Matches the color scheme used throughout the app
✅ **Standard Practice**: Follows trading platform conventions (Binance, Coinbase, etc.)
✅ **Better UX**: No need to mentally map random colors to price direction

## Technical Details

- Color is determined by `pair.change24h` (24-hour price change percentage)
- Green: `#00c853` (same as positive price changes throughout app)
- Red: `#ff1744` (same as negative price changes throughout app)
- Gradient opacity remains the same (0.24 to 0)
- Stroke width remains the same (1.4px)

---

**Status**: ✅ FIXED - Sparklines now use green/red only
**File Modified**: `desktop/components/PairSelectorPanel.tsx`
**Color Logic**: Based on `change24h >= 0` (green) or `< 0` (red)
