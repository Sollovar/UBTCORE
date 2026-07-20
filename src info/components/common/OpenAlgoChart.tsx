import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  Time,
  CandlestickSeries,
  HistogramSeries,
  AreaSeries,
} from 'lightweight-charts';
import { useStore } from '../../stores/useStore';
import { formatPrice } from '../../utils/formatters';
import { useTokenPrices } from '../../hooks/useTokenUSDPrice';

interface Candle {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface OpenAlgoChartProps {
  data: Candle[];
  resolution: string;
  onResolutionChange: (res: string) => void;
  quoteTokenSymbol?: string;
  quoteTokenAddress?: string;
  network?: string;
}

const RESOLUTIONS = [
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '1h', value: '1h' },
  { label: '4h', value: '4h' },
  { label: '1D', value: '1d' },
];

// Fix #1 — dynamic precision based on actual price magnitude
function getPricePrecision(price: number): { precision: number; minMove: number } {
  if (price === 0) return { precision: 8, minMove: 0.00000001 };
  if (price >= 10000)  return { precision: 2, minMove: 0.01 };
  if (price >= 1000)   return { precision: 2, minMove: 0.01 };
  if (price >= 100)    return { precision: 3, minMove: 0.001 };
  if (price >= 1)      return { precision: 4, minMove: 0.0001 };
  if (price >= 0.01)   return { precision: 6, minMove: 0.000001 };
  if (price >= 0.0001) return { precision: 8, minMove: 0.00000001 };
  return { precision: 10, minMove: 0.0000000001 };
}

// Fixed bar spacing — same as TradingView default. Never computed from candle count.
const DEFAULT_BAR_SPACING = 6;

// Volume formatter for the legend
function formatVolume(vol: number): string {
  if (vol >= 1e9) return (vol / 1e9).toFixed(2) + 'B';
  if (vol >= 1e6) return (vol / 1e6).toFixed(2) + 'M';
  if (vol >= 1e3) return (vol / 1e3).toFixed(2) + 'K';
  if (vol >= 1)   return vol.toFixed(2);
  return vol.toFixed(4);
}

export function OpenAlgoChart({ data, resolution, onResolutionChange, quoteTokenSymbol, quoteTokenAddress, network }: OpenAlgoChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const lineSeriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const [hoverData, setHoverData] = useState<Candle | null>(null);
  const [chartType, setChartType] = useState<'candles' | 'line'>('candles');
  // Track container dimensions via ResizeObserver so the canvas always matches
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  // Track whether the initial fitContent has been done — never reset zoom after that
  const initialFitDoneRef = useRef(false);
  // Track the resolution that was active when data was last loaded — reset zoom on resolution change
  const lastFitResolutionRef = useRef<string>('');
  const theme = useStore((s) => s.theme);
  const isLightMode = theme === 'light';

  const normalizedQuoteTokenSymbol = quoteTokenSymbol ? quoteTokenSymbol.toUpperCase() : 'USD';
  const stableUsdSymbols = new Set(['USD', 'USDC', 'USDT', 'DAI', 'BUSD', 'USDP', 'USDD', 'USDX', 'TUSD', 'GUSD']);
  const quoteLabel = stableUsdSymbols.has(normalizedQuoteTokenSymbol) ? 'USD' : normalizedQuoteTokenSymbol;
  const availableUnits = quoteLabel === 'USD' ? ['USD'] : [quoteLabel, 'USD'];
  const [selectedUnit, setSelectedUnit] = useState<string>(quoteLabel === 'USD' ? 'USD' : quoteLabel);

  const effectiveNetwork = network || 'ethereum';
  const { prices: tokenPrices } = useTokenPrices(
    quoteTokenAddress && quoteTokenAddress.trim() && network ? [quoteTokenAddress] : [],
    effectiveNetwork
  );

  const normalizeTokenAddress = useCallback((address: string): string => {
    return effectiveNetwork === 'solana' ? address.trim() : address.trim().toLowerCase();
  }, [effectiveNetwork]);

  const quoteTokenUsdPrice = quoteTokenAddress && tokenPrices
    ? tokenPrices[normalizeTokenAddress(quoteTokenAddress)] || null
    : null;
  const usdPriceAvailable = quoteTokenUsdPrice !== null && quoteTokenUsdPrice > 0;

  // Fix #2 — usdSeriesData now also carries USD-converted volume for consistency
  const usdSeriesData = usdPriceAvailable
    ? data.map((candle) => ({
        time: candle.time,
        open: candle.open * quoteTokenUsdPrice,
        high: candle.high * quoteTokenUsdPrice,
        low: candle.low * quoteTokenUsdPrice,
        close: candle.close * quoteTokenUsdPrice,
        volume: candle.volume * quoteTokenUsdPrice,
      }))
    : data;

  const chartSeriesData = selectedUnit === 'USD' && usdPriceAvailable ? usdSeriesData : data;

  // Fix #6 — reset selectedUnit when available units change (pair switch)
  useEffect(() => {
    if (!availableUnits.includes(selectedUnit)) {
      setSelectedUnit(availableUnits[0]);
    }
  }, [availableUnits.join(',')]);

  const latestCandle = data[data.length - 1];

  // ResizeObserver — keeps canvas exactly in sync with the flex container at all times,
  // including on first mount when clientHeight is 0 (flex layout not yet painted).
  useEffect(() => {
    const el = chartContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        setContainerSize({ width, height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Sync chart canvas size whenever the container resizes — never touch barSpacing here,
  // that is set once on initial load and left to the user to control via scroll/pinch.
  useEffect(() => {
    if (!chartRef.current || containerSize.width === 0 || containerSize.height === 0) return;
    chartRef.current.applyOptions({
      width: containerSize.width,
      height: containerSize.height,
    });
  }, [containerSize]);

  // Derive precision from the active series reference price
  const referencePrice = chartSeriesData[0]?.close ?? 0;
  const priceFormat = getPricePrecision(referencePrice);

  // Create chart once (re-create only when theme changes)
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const w = containerSize.width  || chartContainerRef.current.clientWidth  || 600;
    const h = containerSize.height || chartContainerRef.current.clientHeight || 400;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: isLightMode ? '#ffffff' : '#12121a' },
        textColor: isLightMode ? '#334155' : '#cbd5e1',
        fontSize: 12,
        fontFamily: 'Inter, sans-serif',
      },
      grid: {
        vertLines: { color: isLightMode ? '#e2e8f0' : '#1a1a25' },
        horzLines: { color: isLightMode ? '#e2e8f0' : '#1a1a25' },
      },
      rightPriceScale: {
        borderColor: isLightMode ? '#e2e8f0' : '#2e2e3a',
        autoScale: true,
        scaleMargins: { top: 0.08, bottom: 0.22 },
      },
      timeScale: {
        borderColor: isLightMode ? '#e2e8f0' : '#2e2e3a',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 12,
        fixRightEdge: false,
        barSpacing: 6,
        minBarSpacing: 1,
        tickMarkMaxCharacterLength: 8,
      },
      crosshair: {
        mode: 1,
        vertLine: { labelBackgroundColor: '#2563eb', color: '#2563eb55' },
        horzLine: { labelBackgroundColor: '#2563eb', color: '#2563eb55' },
      },
      width: w,
      height: h,
    });

    // Candlestick series
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: true,
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickVisible: true,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
      priceLineVisible: false,
      priceFormat: {
        type: 'price',
        precision: priceFormat.precision,
        minMove: priceFormat.minMove,
      },
    });

    // Area / line series — smooth gradient fill like Uniswap / Binance line mode
    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: '#6366f1',
      topColor: 'rgba(99, 102, 241, 0.25)',
      bottomColor: 'rgba(99, 102, 241, 0.0)',
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      crosshairMarkerBorderColor: '#6366f1',
      crosshairMarkerBackgroundColor: '#6366f1',
      priceLineVisible: false,
      priceFormat: {
        type: 'price',
        precision: priceFormat.precision,
        minMove: priceFormat.minMove,
      },
    });

    // Volume histogram
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#22c55e44',
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;
    lineSeriesRef.current = areaSeries;
    volumeSeriesRef.current = volumeSeries;
    // Reset fit flag so the first data load after a theme change re-fits
    initialFitDoneRef.current = false;
    lastFitResolutionRef.current = '';

    return () => {
      chart.remove();
    };
  }, [isLightMode]);

  // Update series data + price format whenever data or unit changes
  useEffect(() => {
    if (!seriesRef.current || !lineSeriesRef.current || !volumeSeriesRef.current || !chartRef.current || data.length === 0) return;

    const refPrice = chartSeriesData[0]?.close ?? 0;
    const fmt = getPricePrecision(refPrice);

    // Update price format on both series
    seriesRef.current.applyOptions({
      priceFormat: { type: 'price', precision: fmt.precision, minMove: fmt.minMove },
    });
    lineSeriesRef.current.applyOptions({
      priceFormat: { type: 'price', precision: fmt.precision, minMove: fmt.minMove },
    });

    // Feed candlestick data
    seriesRef.current.setData(chartSeriesData);

    // Feed area/line data — uses close price as the value
    const lineData = chartSeriesData.map((d) => ({ time: d.time, value: d.close }));
    lineSeriesRef.current.setData(lineData);

    // Show only the active series, hide the other
    seriesRef.current.applyOptions({ visible: chartType === 'candles' });
    lineSeriesRef.current.applyOptions({ visible: chartType === 'line' });

    // Volume
    const volumeMultiplier = selectedUnit === 'USD' && usdPriceAvailable ? quoteTokenUsdPrice! : 1;
    const volumeData = data.map((d) => ({
      time: d.time,
      value: d.volume * volumeMultiplier,
      color: d.close >= d.open ? '#22c55e44' : '#ef444444',
    }));
    volumeSeriesRef.current.setData(volumeData);

    // Only set spacing + scroll to latest candle on first load or resolution change.
    // Polling updates must NEVER touch the viewport — leave zoom where the user left it.
    const isResolutionChange = lastFitResolutionRef.current !== resolution;
    if (!initialFitDoneRef.current || isResolutionChange) {
      // Set a fixed bar spacing — never compute from candle count.
      // fitContent() is intentionally NOT used: it squeezes all candles into view
      // which makes them tiny. Instead we set a fixed spacing and scroll to the right edge.
      chartRef.current.applyOptions({ timeScale: { barSpacing: DEFAULT_BAR_SPACING } });
      chartRef.current.timeScale().scrollToRealTime();
      initialFitDoneRef.current = true;
      lastFitResolutionRef.current = resolution;
    }
  }, [chartSeriesData, data, selectedUnit, usdPriceAvailable, quoteTokenUsdPrice, chartType, resolution]);

  // Crosshair — Fix #8: removed setHoverPoint entirely
  useEffect(() => {
    if (!chartRef.current || !seriesRef.current) return;

    const chart = chartRef.current;
    const series = seriesRef.current;

    const handleCrosshairMove = (param: any) => {
      if (
        param.point === undefined ||
        !param.time ||
        param.point.x < 0 ||
        param.point.x > (chartContainerRef.current?.clientWidth || 0) ||
        param.point.y < 0 ||
        param.point.y > (chartContainerRef.current?.clientHeight || 0)
      ) {
        setHoverData(null);
      } else {
        const activeTime = param.time;
        const hoveredCandle =
          data.find((c) => c.time === activeTime) ||
          (param.seriesData.get(series) as Candle) ||
          null;
        setHoverData(hoveredCandle);
      }
    };

    chart.subscribeCrosshairMove(handleCrosshairMove);
    return () => chart.unsubscribeCrosshairMove(handleCrosshairMove);
  }, [data]);

  // ── Derived display values ──────────────────────────────────────────────────
  const activeCandle = hoverData || latestCandle;
  const activeCandleUsd = activeCandle && usdPriceAvailable
    ? {
        open:   activeCandle.open   * quoteTokenUsdPrice!,
        high:   activeCandle.high   * quoteTokenUsdPrice!,
        low:    activeCandle.low    * quoteTokenUsdPrice!,
        close:  activeCandle.close  * quoteTokenUsdPrice!,
        volume: activeCandle.volume * quoteTokenUsdPrice!,
      }
    : null;

  const activeOpen  = activeCandle ? (selectedUnit === 'USD' && activeCandleUsd ? activeCandleUsd.open  : activeCandle.open)  : 0;
  const activeHigh  = activeCandle ? (selectedUnit === 'USD' && activeCandleUsd ? activeCandleUsd.high  : activeCandle.high)  : 0;
  const activeLow   = activeCandle ? (selectedUnit === 'USD' && activeCandleUsd ? activeCandleUsd.low   : activeCandle.low)   : 0;
  const activeClose = activeCandle ? (selectedUnit === 'USD' && activeCandleUsd ? activeCandleUsd.close : activeCandle.close) : 0;
  // Fix #10 — volume for the hovered candle, in the active unit
  const activeVolume = activeCandle
    ? (selectedUnit === 'USD' && activeCandleUsd ? activeCandleUsd.volume : activeCandle.volume)
    : 0;

  let candleChange = 0;
  let candleChangePct = 0;
  if (activeCandle && data.length > 0) {
    const activeIndex = data.findIndex((c) => c.time === activeCandle.time);
    const prevCandle = activeIndex > 0 ? data[activeIndex - 1] : null;

    let basePrice: number;
    if (prevCandle) {
      basePrice = selectedUnit === 'USD' && usdPriceAvailable
        ? prevCandle.close * quoteTokenUsdPrice!
        : prevCandle.close;
    } else {
      basePrice = selectedUnit === 'USD' && usdPriceAvailable
        ? activeCandle.open * quoteTokenUsdPrice!
        : activeCandle.open;
    }

    candleChange = activeClose - basePrice;
    candleChangePct = basePrice !== 0 ? (candleChange / basePrice) * 100 : 0;
  }

  const isChangePositive = candleChange >= 0;
  const changeSign = isChangePositive ? '+' : '';
  const changeColorClass = isChangePositive
    ? 'text-emerald-500 dark:text-emerald-400 font-semibold'
    : 'text-rose-500 dark:text-rose-400 font-semibold';

  // High/low sentiment coloring
  const highColor  = activeHigh > activeOpen  ? '#10b981' : '#ef4444';
  const lowColor   = activeLow  < activeOpen  ? '#ef4444' : '#10b981';

  // Fix #11 — clean OHLC display: quote mode shows just the quote price, no inline USD
  const fmtO = formatPrice(activeOpen);
  const fmtH = formatPrice(activeHigh);
  const fmtL = formatPrice(activeLow);
  const fmtC = formatPrice(activeClose);

  return (
    <div
      className="w-full h-full min-h-[400px] relative rounded-xl overflow-hidden"
      style={{ backgroundColor: isLightMode ? '#ffffff' : '#12121a' }}
    >

      {/* ── Top overlay: two rows on mobile, one row on desktop ── */}
      <div
        className="absolute top-0 left-0 right-0 z-20 pointer-events-none"
        style={{ backgroundColor: isLightMode ? '#ffffff' : '#12121a' }}
      >

        {/* Row 1: controls — unit (far left) + chart type + resolutions (far right) */}
        <div className="flex items-center justify-between px-3 pt-3 pb-1 pointer-events-auto">

          {/* Unit toggle — far left, plain text */}
          <div className="flex items-center gap-3">
            {availableUnits.length > 1 && availableUnits.map((unit) => {
              const isActive = selectedUnit === unit;
              const disabled = unit === 'USD' && !usdPriceAvailable;
              return (
                <button
                  key={unit}
                  onClick={() => !disabled && setSelectedUnit(unit)}
                  disabled={disabled}
                  title={disabled ? 'USD price unavailable' : undefined}
                  className="text-xs font-semibold transition-colors"
                  style={{
                    color: isActive
                      ? (isLightMode ? '#0f172a' : '#f1f5f9')
                      : (isLightMode ? '#94a3b8' : '#64748b'),
                    opacity: disabled ? 0.4 : 1,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                  }}
                >
                  {unit}
                </button>
              );
            })}
          </div>

          {/* Chart type + resolutions — far right, plain text */}
          <div className="flex items-center gap-3">

            {/* Chart type toggle */}
            <button
              onClick={() => setChartType('candles')}
              title="Candlestick"
              className="transition-colors"
              style={{ color: chartType === 'candles' ? (isLightMode ? '#0f172a' : '#f1f5f9') : (isLightMode ? '#94a3b8' : '#64748b') }}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <rect x="1" y="3" width="3" height="7" rx="0.5" fill="currentColor" />
                <line x1="2.5" y1="1" x2="2.5" y2="3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                <line x1="2.5" y1="10" x2="2.5" y2="12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                <rect x="9" y="5" width="3" height="4" rx="0.5" fill="currentColor" />
                <line x1="10.5" y1="2" x2="10.5" y2="5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                <line x1="10.5" y1="9" x2="10.5" y2="11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </button>
            <button
              onClick={() => setChartType('line')}
              title="Line"
              className="transition-colors"
              style={{ color: chartType === 'line' ? (isLightMode ? '#0f172a' : '#f1f5f9') : (isLightMode ? '#94a3b8' : '#64748b') }}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <polyline points="1,10 4,6 7,8 10,3 12,4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            </button>

            {/* Divider */}
            <span style={{ color: isLightMode ? '#e2e8f0' : '#2e2e3a' }}>|</span>

            {/* Resolution tabs — plain text */}
            {RESOLUTIONS.map((res) => {
              const isActive = resolution === res.value;
              return (
                <button
                  key={res.value}
                  onClick={() => onResolutionChange(res.value)}
                  className="text-xs font-semibold transition-colors"
                  style={{
                    color: isActive
                      ? (isLightMode ? '#0f172a' : '#f1f5f9')
                      : (isLightMode ? '#94a3b8' : '#64748b'),
                  }}
                >
                  {res.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: OHLC legend — compact on mobile */}
        <div className="px-3 pb-1 pointer-events-auto">
          {activeCandle ? (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
              {/* Close price + change — most important, always first */}
              <span style={{ color: isLightMode ? '#0f172a' : '#f1f5f9' }} className="font-semibold">
                {fmtC}
              </span>
              <span className={changeColorClass}>
                {changeSign}{candleChangePct.toFixed(2)}%
              </span>
              {/* O/H/L — secondary info, dimmer */}
              <span style={{ color: isLightMode ? '#94a3b8' : '#64748b' }} className="hidden sm:inline">
                O <span style={{ color: isLightMode ? '#475569' : '#94a3b8' }}>{fmtO}</span>
              </span>
              <span style={{ color: highColor }} className="opacity-80">
                H <span className="font-medium">{fmtH}</span>
              </span>
              <span style={{ color: lowColor }} className="opacity-80">
                L <span className="font-medium">{fmtL}</span>
              </span>
              {/* Vol — hidden on very small screens */}
              <span style={{ color: isLightMode ? '#94a3b8' : '#64748b' }} className="hidden sm:inline">
                Vol <span style={{ color: isLightMode ? '#475569' : '#94a3b8' }}>
                  {selectedUnit === 'USD' ? '$' : ''}{formatVolume(activeVolume)}
                </span>
              </span>
            </div>
          ) : (
            <span className="text-xs text-slate-400 dark:text-slate-500">No data</span>
          )}
        </div>
      </div>

      {/* Chart canvas — offset from top to clear the overlay rows */}
      <div ref={chartContainerRef} className="absolute inset-0 top-[58px]" />
    </div>
  );
}
