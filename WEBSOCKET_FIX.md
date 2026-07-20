# WebSocket "Insufficient Resources" Error - FIXED ✅

## Problem
Error: `WebSocket connection to 'ws://localhost:5000/ws?pair=all' failed: Insufficient resources`

## Root Cause
**Multiple WebSocket connections** were being created because `useRealtimePairs()` was called in 3 different places:
1. MobileTradePage
2. MobileMarketSelectPanel  
3. PairSelectorPanel

Each call tried to create its own WebSocket connection, causing the "Insufficient resources" error.

## Solution
Created two separate hooks:

### 1. `useRealtimePairs()` - Creates WebSocket (Call ONCE)
```typescript
// Only call this in the top-level component (MobileTradePage)
const { flashMap, connected } = useRealtimePairs();
```

### 2. `useFlashMap()` - Just reads flashMap (Call anywhere)
```typescript
// Use this in child components that just need to display flash
const flashMap = useFlashMap();
```

## Changes Made

### Hook File (`useRealtimePairs.ts`)
```typescript
// New lightweight hook - just reads from global store
export function useFlashMap(): FlashMap {
  return useStore(s => s.flashMap);
}

// Existing hook - creates WebSocket connection
export function useRealtimePairs(): { flashMap: FlashMap; connected: boolean } {
  // ... WebSocket logic
}
```

### Component Updates

**MobileTradePage.tsx** - ✅ Keeps `useRealtimePairs()` (creates WebSocket)
```typescript
const { flashMap } = useRealtimePairs(); // ✅ Only place that creates WebSocket
```

**MobileMarketSelectPanel.tsx** - ✅ Changed to `useFlashMap()`
```typescript
const flashMap = useFlashMap(); // Just reads, no WebSocket
```

**PairSelectorPanel.tsx** - ✅ Changed to `useFlashMap()`
```typescript
const flashMap = useFlashMap(); // Just reads, no WebSocket
```

## Architecture

```
MobileTradePage (calls useRealtimePairs)
  ↓
Creates ONE WebSocket connection
  ↓
Updates global Zustand flashMap
  ↓
┌────────────────┬─────────────────────┐
↓                ↓                     ↓
MobileMarket   PairSelector    Other Components
SelectPanel      Panel
(useFlashMap)  (useFlashMap)   (useFlashMap)
  ↓                ↓                     ↓
All read from same global flashMap
```

## Benefits

✅ **Only ONE WebSocket connection** (no more "Insufficient resources" error)
✅ **Flash works globally** (all components see the same flash state)
✅ **Better performance** (less memory, fewer connections)
✅ **Simpler usage** (child components just call `useFlashMap()`)

## Usage Guide

### When to use `useRealtimePairs()`
- **Only once** in your app root or main page component
- Creates the WebSocket connection
- Returns both `flashMap` and `connected` status

### When to use `useFlashMap()`
- **Everywhere else** that needs to display flash colors
- Just reads from global store
- No WebSocket overhead
- Lighter weight

## Example

```typescript
// ❌ WRONG - Creates multiple WebSockets
function Component1() {
  const { flashMap } = useRealtimePairs(); // WebSocket #1
}
function Component2() {
  const { flashMap } = useRealtimePairs(); // WebSocket #2 ⚠️
}

// ✅ CORRECT - One WebSocket, multiple readers
function RootComponent() {
  const { flashMap } = useRealtimePairs(); // WebSocket (once)
}
function ChildComponent1() {
  const flashMap = useFlashMap(); // Just reads
}
function ChildComponent2() {
  const flashMap = useFlashMap(); // Just reads
}
```

---

**Status:** ✅ **FIXED**

No more "Insufficient resources" error!
Flash still works globally across all components!
