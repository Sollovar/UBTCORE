# Quick Reference: Chart Fixes

## TL;DR - What's Fixed

| Issue | Before | After | Status |
|-------|--------|-------|--------|
| Price change on timeframe switch | Stayed at 24h value | Updates to reflect timeframe | ✅ |
| Mobile timeframes | 5m, 1h, D (3 only) | 5m, 15m, 1h, 4h, 1D, 1W (6) | ✅ |
| Price change calculation | Previous-to-current bar | First candle open to last close | ✅ |
| Cursor tracking | Stagnant | Updates on cursor move | ✅ |
| High/Low on cursor | Not updating | Updates when cursor moves | ✅ |

---

## Files Modified

### 1. src/mobile/components/MobileChartView.tsx
```diff
- const TIMEFRAMES = ["5m", "1h", "D"];
+ const TIMEFRAMES = ["5m", "15m", "1h", "4h", "1D", "1W"];

+ const normalizeTimeframeForChart = (value: string): string => {
+   // Returns: 5m, 15m, 1h, 4h, 1D, 1W
+ };

+ const normalizedTf = normalizeTimeframeForChart(tf);

- <CandlestickChart timeframe={tf} key={`${pairId}-${tf}`} />
+ <CandlestickChart timeframe={normalizedTf} />
```

### 2. src/desktop/components/CandlestickChart.tsx
```diff
- const [displayCandles, setDisplayCandles] = useState<ChartCandle[]>([]);
+ const [displayCandles, setDisplayCandles] = useState<ChartCandle[]>([]);
+ const [cursorPrice, setCursorPrice] = useState<number | null>(null);
+ const [cursorHigh, setCursorHigh] = useState<number | null>(null);
+ const [cursorLow, setCursorLow] = useState<number | null>(null);

+ // Add cursor tracking
+ chart.subscribeCrosshairMove((param) => {
+   if (!param.point || !param.time) { reset cursor; return; }
+   const candle = candleDataArray.find((c) => c.time === param.time);
+   if (candle) { set cursor values to candle.high/low/close; }
+ });

- const priceChangeValue = displayCandles.length > 1 ? candleChange : 0;
- const priceChangePercent = displayCandles.length > 1 ? candleChangePct : ((priceChange24h != null && Number.isFinite(priceChange24h)) ? priceChange24h : 0);
+ const priceChangeValue = timeframeChange;
+ const priceChangePercent = timeframeChangePct;
```

---

## How to Test

### Quick Test (30 seconds)
```
1. Desktop: Click different timeframe buttons (5m, 1h, 4h, 1D)
   → Price change % should be DIFFERENT for each
   
2. Mobile: Swipe to see all 6 timeframes (previously only 3)

3. Cursor: Move mouse over desktop chart
   → High/Low values should change with cursor
```

### Full Test (5 minutes)
```
1. Mobile chart:
   - All 6 timeframes visible
   - Each timeframe loads different data
   - Price change % different for each

2. Desktop chart:
   - Timeframe buttons work (5m, 15m, 1h, 4h, 1D, 1W)
   - Price change updates on button click
   - Cursor tracking works
   - High/Low update with cursor
   - Real-time price updates work

3. Data accuracy:
   - Calculate manually: (last_close - first_open) / first_open * 100
   - Compare to displayed value
   - Should match
```

---

## Key Variables

### Mobile
```typescript
const TIMEFRAMES = ["5m", "15m", "1h", "4h", "1D", "1W"];
const normalizedTf = "5m" | "15m" | "1h" | "4h" | "1D" | "1W";
```

### Desktop
```typescript
const lastCandle: ChartCandle     // Current timeframe's last candle
const firstCandle: ChartCandle    // Current timeframe's first candle
const timeframeChange: number     // lastCandle.close - firstCandle.open
const timeframeChangePct: number  // Percentage change for this timeframe
```

---

## Data Flow (Simplified)

```
Timeframe button click
        ↓
useCandles fetches new resolution
        ↓
realCandles updated with new bars
        ↓
price change recalculated from first-to-last
        ↓
display updates ✅
```

---

## Backend (No Changes Needed)

Already supports:
- 1m, 5m, 15m, 1h, 4h, 12h, 1d, 1w
- Maps strings to seconds: "5m" → 300, "1h" → 3600, etc.
- Returns OHLCV data for any resolution

---

## Potential Issues & Solutions

| Issue | Solution |
|-------|----------|
| Price change not updating | Clear browser cache (Ctrl+Shift+R) |
| Only 3 timeframes visible on mobile | Rebuild or refresh page |
| Cursor tracking doesn't work | Check if chart is fully loaded |
| High/Low frozen | Verify cursor is over chart area |
| Charts show old data | Check network requests for correct resolution param |

---

## One-Line Summary

**Price change now correctly reflects the selected timeframe instead of always showing 24h data, mobile has all 6 timeframes, and cursor tracking works on desktop.**
