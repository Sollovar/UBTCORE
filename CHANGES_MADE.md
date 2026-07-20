# Exact Changes Made

## Overview
Two files modified to fix chart system issues.

---

## File 1: Mobile Chart View
**Path:** `artifacts/dex/src/mobile/components/MobileChartView.tsx`

### Change 1: Timeframes Array (Line 12)
```diff
- const TIMEFRAMES = ["5m", "1h", "D"];
+ const TIMEFRAMES = ["5m", "15m", "1h", "4h", "1D", "1W"];
```
**Reason:** Added missing timeframes 15m, 4h, 1W to match desktop

### Change 2: Normalization Function (Lines 90-96)
```diff
  // Normalize timeframe for the chart
  const normalizeTimeframeForChart = (value: string): string => {
    const normalized = (value ?? "").trim().toLowerCase();
    if (["5m", "5", "5min"].includes(normalized)) return "5m";
+   if (["15m", "15", "15min"].includes(normalized)) return "15m";
-   if (["1h", "1hr", "1hour", "hour", "h"].includes(normalized)) return "1h";
+   if (["1h", "1hr", "1hour", "hour", "h", "60"].includes(normalized)) return "1h";
+   if (["4h", "4hr", "4hour"].includes(normalized)) return "4h";
-   if (["d", "1d", "1day", "day", "daily"].includes(normalized)) return "1D";
-   return "1h"; // default
+   if (["d", "1d", "1day", "day", "daily"].includes(normalized)) return "1D";
+   if (["w", "1w", "1week", "week", "weekly"].includes(normalized)) return "1W";
+   return "1h"; // default
  };
```
**Reason:** Enhanced to handle all 6 timeframe variants

### Change 3: Chart Component Props (Line 207)
```diff
  <CandlestickChart 
    livePrice={livePrice} 
    showToolbar={false} 
    pairId={pairId} 
-   timeframe={tf}
-   key={`${pairId}-${tf}`}
+   timeframe={normalizedTf}
  />
```
**Reason:** Use normalized timeframe, remove unnecessary key

---

## File 2: Desktop Candlestick Chart
**Path:** `artifacts/dex/src/desktop/components/CandlestickChart.tsx`

### Change 1: Add Cursor State Variables (Lines 115-118)
```diff
  const [activeTimeframe, setActiveTimeframe] = useState("1D");
  const [chartUnit, setChartUnit] = useState<"quote" | "usd">("quote");
  const [displayCandles, setDisplayCandles] = useState<ChartCandle[]>([]);
+ const [cursorPrice, setCursorPrice] = useState<number | null>(null);
+ const [cursorHigh, setCursorHigh] = useState<number | null>(null);
+ const [cursorLow, setCursorLow] = useState<number | null>(null);
  
  // If timeframe is passed as prop, use it; otherwise use local state
  const effectiveTf = timeframe ? normalizeTimeframe(timeframe) : normalizeTimeframe(activeTimeframe);
```
**Reason:** Track cursor position for chart

### Change 2: Remove Undefined Variable Reference (Line 283)
```diff
  // ── Load mock data when no pairId ──────────────────────────────────────────
  useEffect(() => {
    if (!useMock) return;
    const series = candleRef.current;
-   const vol    = volRef.current;
-   if (!series || !vol) return;
+   if (!series) return;
    
    const mockData = generateMockData();
```
**Reason:** Removed reference to undefined `volRef.current`

### Change 3: Cursor Tracking Implementation (Lines 220-247)
```diff
  const ro = new ResizeObserver(() => {
    if (containerRef.current) {
      chart.applyOptions({
        width:  containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
    }
  });
  ro.observe(containerRef.current);
+
+   // ── Cursor tracking: update high/low when cursor moves over candles ────
+   chart.subscribeCrosshairMove((param) => {
+     if (!param.point || !param.time) {
+       setCursorPrice(null);
+       setCursorHigh(null);
+       setCursorLow(null);
+       return;
+     }
+
+     const candleDataArray = candleDataRef.current;
+     const time = typeof param.time === "number" ? param.time : (param.time as any);
+     
+     // Find the candle at this time
+     const candle = candleDataArray.find((c) => c.time === time);
+     
+     if (candle) {
+       setCursorPrice(candle.close);
+       setCursorHigh(candle.high);
+       setCursorLow(candle.low);
+     } else {
+       // If exact time not found, get the closest candle
+       const closest = candleDataArray.reduce((prev, curr) => {
+         return Math.abs((curr.time as any) - time) < Math.abs((prev.time as any) - time) ? curr : prev;
+       });
+       if (closest) {
+         setCursorPrice(closest.close);
+         setCursorHigh(closest.high);
+         setCursorLow(closest.low);
+       }
+     }
+   });
```
**Reason:** Listen to cursor movements and update display values

### Change 4: Reset Cursor on Data Load (Lines 308-311)
```diff
  // ── Load real candles when pairId / timeframe changes ─────────────────────
  useEffect(() => {
    if (useMock || realCandles.length === 0) return;
    const series = candleRef.current;
    if (!series) return;

+   // Reset cursor tracking when new data loads
+   setCursorPrice(null);
+   setCursorHigh(null);
+   setCursorLow(null);

    const transformed = transformCandles(realCandles, chartUnit, conversionFactor);
```
**Reason:** Clear cursor values when switching timeframes

### Change 5: Unit Change Handling (Lines 360-365)
```diff
  useEffect(() => {
    if (chartUnit === "usd" && conversionFactor == null) {
      setChartUnit("quote");
    }
+   // Reset cursor when unit changes
+   setCursorPrice(null);
+   setCursorHigh(null);
+   setCursorLow(null);
  }, [chartUnit, conversionFactor]);
```
**Reason:** Reset cursor when switching between Quote/USD

### Change 6: Add Timeframe Click Handler (Lines 370-372)
```diff
  }, [timeframe]);

+ // Update activeTimeframe when local buttons are clicked (desktop view)
+ const handleTimeframeClick = (tf: string) => {
+   setActiveTimeframe(tf);
+ };
```
**Reason:** Handle local toolbar button clicks

### Change 7: Update Toolbar Button Handler (Line 416)
```diff
  {TIMEFRAMES.map((tf) => (
    <button
      key={tf}
-     onClick={() => setActiveTimeframe(tf)}
+     onClick={() => handleTimeframeClick(tf)}
      className={`px-2 py-0.5 transition-colors ${
        normalizeTimeframe(activeTimeframe).toLowerCase() === normalizeTimeframe(tf).toLowerCase() ? "text-[#f5c518]" : "hover:text-white"
      }`}
    >
      {tf}
    </button>
  ))}
```
**Reason:** Use handler function for cleaner code

### Change 8: Price Change Calculation (Lines 355-377)
```diff
  const lastCandle = displayCandles[displayCandles.length - 1];
- const previousCandle = displayCandles.length > 1 ? displayCandles[displayCandles.length - 2] : null;
+ const firstCandle = displayCandles.length > 0 ? displayCandles[0] : null;
  let candleChange = 0;
- let candleChangePct = 0;
+ let timeframeChange = 0;
+ let timeframeChangePct = 0;

- if (lastCandle && previousCandle) {
-   candleChange = lastCandle.close - previousCandle.close;
-   candleChangePct = previousCandle.close !== 0 ? (candleChange / previousCandle.close) * 100 : 0;
+ if (lastCandle && firstCandle) {
+   timeframeChange = lastCandle.close - firstCandle.open;
+   timeframeChangePct = firstCandle.open !== 0 ? (timeframeChange / firstCandle.open) * 100 : 0;
  }

  // Use cursor values if available, otherwise use last candle
  const summaryPrice = cursorPrice ?? lastCandle?.close ?? livePrice ?? 0;
  const summaryHigh  = cursorHigh ?? lastCandle?.high ?? summaryPrice;
  const summaryLow   = cursorLow ?? lastCandle?.low ?? summaryPrice;
  
- // Use timeframe-based change if available, fallback to 24h change
- const priceChangeValue = displayCandles.length > 0 ? candleChange : 0;
- const priceChangePercent = displayCandles.length > 0 ? candleChangePct : ((priceChange24h != null && Number.isFinite(priceChange24h)) ? priceChange24h : 0);
+ // Use timeframe-based change (calculated from chart data, not 24h)
+ const priceChangeValue = timeframeChange;
+ const priceChangePercent = timeframeChangePct;
```
**Reason:** Calculate change from first-to-last candle (full timeframe) instead of previous-to-current (one bar)

### Change 9: Update MA Legend (Lines 438-445)
```diff
  <span className="text-[#555]">
    C <span className="text-[#ff1744] ml-0.5">
-     {livePrice > 0 ? livePrice.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 8 }) : "—"}
+     {summaryPrice > 0 ? formatPriceForChart(summaryPrice) : "—"}
    </span>
  </span>
```
**Reason:** Show correct price (includes cursor position and unit conversion)

---

## Summary of Changes

| File | Lines Changed | Purpose |
|------|------------------|---------|
| MobileChartView.tsx | 12, 90-96, 207 | Add timeframes, normalization |
| CandlestickChart.tsx | 115-118, 220-247, 283, 308-311, 360-365, 370-372, 416, 355-377, 438-445 | Add cursor tracking, fix price change |

**Total:** ~100 lines changed across 2 files

---

## Verification

To verify changes were applied:

### Mobile
```bash
grep "const TIMEFRAMES = " artifacts/dex/src/mobile/components/MobileChartView.tsx
# Should show: const TIMEFRAMES = ["5m", "15m", "1h", "4h", "1D", "1W"];
```

### Desktop - Cursor State
```bash
grep -n "cursorPrice\|cursorHigh\|cursorLow" artifacts/dex/src/desktop/components/CandlestickChart.tsx | head -5
# Should show state variable declarations
```

### Desktop - Cursor Listener
```bash
grep -n "subscribeCrosshairMove" artifacts/dex/src/desktop/components/CandlestickChart.tsx
# Should show listener implementation
```

### Desktop - Price Change
```bash
grep -n "firstCandle.open\|timeframeChange\|timeframeChangePct" artifacts/dex/src/desktop/components/CandlestickChart.tsx
# Should show new price change logic
```

---

## No Other Files Modified

✅ No other files were modified
✅ No configuration changes
✅ No package.json changes
✅ No environment variable changes
✅ No database changes
✅ No backend changes

Only the two chart files were updated.
