# Price Flash Animation - Visual Flow Diagram

## Before Fix (Broken) ❌

```
WebSocket Message Arrives
         ↓
Parse new gecko_price
         ↓
Capture old price (WRONG - already updated!)
         ↓
Compare: new vs old (comparing same values)
         ↓
Flash direction = null (no change detected)
         ↓
❌ NO FLASH SHOWN
```

## After Fix (Working) ✅

```
WebSocket Message Arrives
         ↓
✨ Capture OLD price FIRST (from store)
         ↓
Parse new gecko_price from message
         ↓
Compare: new vs old (actual comparison)
         ↓
If different → Flash direction = 'up' or 'down'
         ↓
Update Zustand store with new price
         ↓
Trigger flash with direction
         ↓
✅ FLASH SHOWN (bright color + glow)
         ↓
Wait 700ms
         ↓
Flash resets to null
         ↓
✨ Smooth fade back to normal color
```

## Flash State Timeline

```
Time:    0ms          100ms         700ms         1400ms
         │             │             │             │
Flash:   null    →    'up'    →    'up'    →    null
Color:   #f5f5f5 →  #00c853  →  #00c853  → #f5f5f5
Effect:  none     →   glow    →    glow    →   none
Trans:   none     →   instant →   instant →   700ms
```

## Component Integration

```
┌─────────────────────────────────────────┐
│  useRealtimePairs (WebSocket Handler)   │
│  • Listens to "ticker" & "price_update" │
│  • Captures old prices FIRST            │
│  • Determines flash direction           │
│  • Updates flashMap                     │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  FlashMap State (Zustand-like)          │
│  {                                      │
│    "pair-123": "up" | "down" | null    │
│    "pair-456": "up" | "down" | null    │
│  }                                      │
└────────────────┬────────────────────────┘
                 │
                 ├──────────────┬──────────────┐
                 ▼              ▼              ▼
        ┌────────────┐  ┌──────────┐  ┌──────────┐
        │ Markets    │  │ Selector │  │ Header   │
        │ Page       │  │ Panel    │  │ Display  │
        └────────────┘  └──────────┘  └──────────┘
             │               │              │
             ▼               ▼              ▼
        flash="up"      flash="down"   flash=null
        color=#00c853   color=#ff1744  color=normal
        glow=8px        glow=8px       glow=none
```

## useGeckoPriceFlash Flow

```
Component receives new geckoPrice prop
         ↓
useEffect([pairId, geckoPrice]) triggers
         ↓
Is geckoPrice valid? (> 0, not null)
         │
         ├─ No → Return (skip)
         │
         └─ Yes → Continue
                  ↓
Is this the first price?
         │
         ├─ Yes (prevPrice.current === undefined)
         │       ↓
         │  Store price, no flash
         │
         └─ No → Continue
                  ↓
Calculate priceDiff = |new - old|
         ↓
Is priceDiff > epsilon (0.0000001)?
         │
         ├─ No → Return (no significant change)
         │
         └─ Yes → Continue
                  ↓
Determine direction: new > old ? 'up' : 'down'
         ↓
setFlash(direction)
         ↓
Start 700ms timer
         ↓
After 700ms: setFlash(null)
```

## Visual Effect CSS Logic

```typescript
// Conditional styling based on flash state

if (flash === 'up') {
  color = '#00c853'          // Bright green
  transition = 'none'        // Instant change
  textShadow = '0 0 8px #00c853'  // Green glow
}
else if (flash === 'down') {
  color = '#ff1744'          // Bright red  
  transition = 'none'        // Instant change
  textShadow = '0 0 8px #ff1744'  // Red glow
}
else {
  color = normalColor        // Gray/white
  transition = 'color 700ms ease-out'  // Smooth fade
  textShadow = 'none'        // No glow
}
```

## Key Insight: Two-Phase Transition

```
PHASE 1: Flash Appears (0ms)
┌────────────────────────────┐
│ transition: none           │ ← Instant change
│ color: bright flash color  │ ← Immediately visible
│ textShadow: glow effect    │ ← Extra emphasis
└────────────────────────────┘

PHASE 2: Flash Fades (after 700ms)
┌────────────────────────────┐
│ transition: 700ms ease-out │ ← Smooth fade
│ color: normal color        │ ← Gradual return
│ textShadow: none           │ ← Glow disappears
└────────────────────────────┘
```

This creates the "pop" effect: instant attention grab, gentle release.

## Price Update Sources

```
┌──────────────────────────────────────────┐
│  Price Update Source Hierarchy           │
├──────────────────────────────────────────┤
│                                          │
│  1. price_update (WebSocket)            │ ← Fastest
│     • Fired on every fill               │   (sub-second)
│     • Updates exchange price only       │
│     • Flash based on trade price        │
│                                          │
│  2. ticker (WebSocket)                  │ ← Medium
│     source: "fill"                      │   (seconds)
│     • After fill settlement             │
│     • Updates exchange + gecko prices   │
│     • Flash based on exchange price     │
│                                          │
│  3. ticker (WebSocket)                  │ ← Slowest
│     source: "cache"                     │   (30 seconds)
│     • After GeckoTerminal refresh       │
│     • Updates gecko prices only         │
│     • Flash based on gecko price        │
│                                          │
└──────────────────────────────────────────┘
```

## Comparison: Before vs After

```
┌─────────────────┬──────────────────┬─────────────────┐
│ Aspect          │ Before ❌        │ After ✅        │
├─────────────────┼──────────────────┼─────────────────┤
│ Flash Detection │ Race condition   │ Proper timing   │
│ Price Capture   │ After update     │ Before update   │
│ Comparison      │ Strict equality  │ Epsilon-based   │
│ First Price     │ Never flashes    │ Properly skipped│
│ Visual Effect   │ Subtle fade      │ Bright flash    │
│ Transition      │ 0.15s both ways  │ Instant + 700ms │
│ Glow Effect     │ None             │ 8px shadow      │
│ Noticeability   │ Barely visible   │ Very obvious    │
└─────────────────┴──────────────────┴─────────────────┘
```

---

**Result:** Price flashes are now **instant, bright, and impossible to miss!** ✨
