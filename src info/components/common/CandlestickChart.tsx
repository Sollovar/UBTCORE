import { useEffect, useRef, useState } from 'react';
import { type Time } from 'lightweight-charts';
import { OpenAlgoChart } from './OpenAlgoChart';
import { useStore } from '../../stores/useStore';

interface Candle {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface CandlestickChartProps {
  pair: string;
  quoteTokenSymbol?: string;
  quoteTokenAddress?: string;
  price?: number;
  poolAddress?: string;
  network?: string;
}

function normalizeTimestamp(value: unknown): Time {
  const timestamp = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : 0;
  if (!Number.isFinite(timestamp)) return 0 as Time;
  const normalized = timestamp > 1_000_000_000_000 ? Math.floor(timestamp / 1000) : Math.floor(timestamp);
  return normalized as Time;
}

function parseNumeric(value: unknown): number {
  const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseCandles(json: unknown): Candle[] {
  if (!Array.isArray(json)) return [];
  const seen = new Set<number>();
  return json
    .map((item: any) => ({
      time: normalizeTimestamp(item.time),
      open: parseNumeric(item.open),
      high: parseNumeric(item.high),
      low: parseNumeric(item.low),
      close: parseNumeric(item.close),
      volume: parseNumeric(item.volume),
    }))
    .sort((a, b) => Number(a.time) - Number(b.time))
    // Deduplicate by timestamp — lightweight-charts throws on duplicate times
    .filter((c) => {
      const t = Number(c.time);
      if (seen.has(t)) return false;
      seen.add(t);
      return true;
    });
}

export function CandlestickChart({ pair, quoteTokenSymbol, quoteTokenAddress, price, poolAddress, network }: CandlestickChartProps) {
  const [data, setData] = useState<Candle[]>([]);
  // initialLoading is true only until the very first successful fetch for this pair
  const [initialLoading, setInitialLoading] = useState(true);
  const [resolution, setResolution] = useState('1m');
  const isFirstFetchRef = useRef(true);
  const theme = useStore((s) => s.theme);
  const isLightMode = theme === 'light';
  const bgColor = isLightMode ? '#ffffff' : '#12121a';

  useEffect(() => {
    if (!pair) return;

    // On pair change: clear data and show spinner.
    // On resolution change: keep existing data visible (no spinner) — just swap in new data silently.
    const isPairChange = isFirstFetchRef.current;
    if (isPairChange) {
      setInitialLoading(true);
    }

    let isMounted = true;

    const apiUrl = (import.meta as any).env?.VITE_API_URL;
    if (!apiUrl) {
      console.error('[CandlestickChart] VITE_API_URL is not set — chart data will not load');
    }
    const baseUrl = apiUrl || 'http://localhost:8080';

    const loadData = async () => {
      try {
        const response = await fetch(
          `${baseUrl}/api/v1/pairs/${pair}/candles?resolution=${resolution}&limit=1000`
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const json = await response.json();
        const candles = parseCandles(json);

        if (!isMounted) return;

        if (isFirstFetchRef.current) {
          // Very first load for this pair — replace everything and clear the spinner
          setData(candles);
          setInitialLoading(false);
          isFirstFetchRef.current = false;
        } else {
          // Resolution change or polling update — replace data silently, no spinner
          setData(candles);
        }
      } catch (error) {
        console.error('[CandlestickChart] Failed to load candles:', error);
        if (isMounted && isFirstFetchRef.current) {
          setData([]);
          setInitialLoading(false);
          isFirstFetchRef.current = false;
        }
      }
    };

    loadData();
    const interval = setInterval(loadData, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [pair, resolution]);

  // Reset first-fetch flag when the pair changes so the spinner shows for the new pair
  useEffect(() => {
    isFirstFetchRef.current = true;
    setInitialLoading(true);
    setData([]);
  }, [pair]);

  return (
    <div
      className="w-full h-full min-h-[400px] rounded-xl overflow-hidden relative"
      style={{ backgroundColor: bgColor }}
    >
      {initialLoading ? (
        <div
          className="absolute inset-0 flex items-center justify-center text-xs z-20 backdrop-blur-sm"
          style={{
            backgroundColor: isLightMode ? 'rgba(255,255,255,0.85)' : 'rgba(18,18,26,0.85)',
            color: isLightMode ? '#334155' : '#cbd5e1',
          }}
        >
          Loading chart data...
        </div>
      ) : (
        <OpenAlgoChart
          data={data}
          resolution={resolution}
          quoteTokenSymbol={quoteTokenSymbol}
          quoteTokenAddress={quoteTokenAddress}
          network={network}
          onResolutionChange={setResolution}
        />
      )}
    </div>
  );
}
