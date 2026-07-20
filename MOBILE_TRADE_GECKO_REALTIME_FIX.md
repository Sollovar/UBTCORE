# Mobile Trade View - Gecko Price Real-time Update Fix

## Problem
Mobile Trade View was showing **exchange price and price change** instead of **GeckoTerminal price and change**, and the sparkline was not updating in real-time when the price-worker updated gecko data.

## Root Cause
1. **MiniPriceChart** was using `market.price` and `market.change24h` (exchange data) instead of gecko data
2. **Sparkline** was tracking `priceHistory` from `market.price` instead of gecko price
3. **SparklineData** `useMemo` dependencies were correct but the displayed values were wrong

## Solution

### 1. Track Gecko Price History
```typescript
// OLD: Tracked exchange price
const [priceHistory, setPriceHistory] = useState<number[]>([market.price]);
useEffect(() => {
  setPriceHistory((h) => [...h, market.price].slice(-60));
}, [market.price]);

// NEW: Track gecko price for real-time updates
const geckoPrice = pair?.geckoPrice ?? pair?.price ?? market.price;
const [geckoPriceHistory, setGeckoPriceHistory] = useState<number[]>([geckoPrice]);

useEffect(() => {
  setGeckoPriceHistory((h) => [...h, geckoPrice].slice(-60));
}, [geckoPrice]); // ← Updates when price-worker updates gecko data
```

### 2. Update Sparkline Component
```typescript
// OLD: Used exchange price history
<Sparkline prices={priceHistory} color={sparkColor} w={60} h={22} />

// NEW: Use gecko price history
<Sparkline prices={geckoPriceHistory} color={sparkColor} w={60} h={22} />
```

### 3. Update MiniPriceChart (Toggle OFF Chart)
```typescript
// OLD: Used exchange data
<MiniPriceChart
  prices={sparklineData}
  currentPrice={market.price}        // ← Exchange price
  change24h={market.change24h}       // ← Exchange change
  isUp={priceUp}
  quoteLabel={quoteToken}
/>

// NEW: Use gecko data
<MiniPriceChart
  prices={sparklineData}
  currentPrice={geckoPriceValue}     // ← Gecko price
  change24h={geckoChange / 100}      // ← Gecko change (convert % to decimal)
  isUp={geckoUp}                     // ← Gecko direction
  quoteLabel={quoteToken}
/>
```

### 4. Rename Variable to Avoid Conflict
```typescript
// Renamed geckoPrice → geckoPriceValue to avoid conflict with local variable
const geckoPriceValue = pair?.geckoPrice ?? pair?.price ?? market.price;
const geckoFlash = useGeckoPriceFlash(pair?.id, geckoPriceValue);
```

### 5. Update Sparkline Color Logic
```typescript
// OLD: Based on exchange price history
const sparkColor = priceHistory.length >= 2 && priceHistory[priceHistory.length - 1] >= priceHistory[0]
  ? "#00c8a0" : "#ff4d6a";

// NEW: Based on gecko price history
const sparkColor = geckoPriceHistory.length >= 2 && geckoPriceHistory[geckoPriceHistory.length - 1] >= geckoPriceHistory[0]
  ? "#00c8a0" : "#ff4d6a";
```

## Real-time Update Flow

### Price-Worker Updates (Every 39 seconds)
```
1. price-worker fetches GeckoTerminal data
2. Updates DB: gecko_price, gecko_price_usd, gecko_price_change_24h
3. Backend cache refreshes (every 3s)
4. Frontend usePairs hook receives updated pair data
5. pair?.geckoPrice changes → triggers useEffect
6. geckoPriceHistory updates → sparkline re-renders
7. sparklineData useMemo recalculates → deterministic pattern updates
8. MiniPriceChart displays new gecko price and change
```

### What Updates in Real-time
✓ **Gecko price** - shows latest from GeckoTerminal  
✓ **Gecko price change %** - 24h change from GeckoTerminal  
✓ **Sparkline (toggle ON)** - real gecko price history trail  
✓ **MiniPriceChart (toggle OFF)** - deterministic pattern based on latest gecko data  
✓ **Price flash effect** - green/red flash when gecko price changes  

## Files Modified
- `artifacts/dex/src/mobile/components/MobileTradeView.tsx`

## Testing
1. Start price-worker: `npm run price-worker` (updates every 39s)
2. Open mobile trade view
3. Watch gecko price update in real-time
4. Sparkline should show price movement trail
5. Toggle OFF → MiniPriceChart shows deterministic pattern with current gecko price
6. Price change % should match gecko 24h change

## Result
✓ Mobile trade view now uses **GeckoTerminal price** consistently  
✓ Sparklines update in **real-time** as price-worker runs  
✓ Price and change % update **every 39 seconds** with gecko data  
✓ Matches professional DEX behavior (Uniswap, PancakeSwap)  

---
*Date: 2026-07-09*
*Status: FIXED & VERIFIED*
