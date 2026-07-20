import { useState, useEffect, useRef } from "react";
import { useStore } from "../stores/useStore";
import { useOrderbook } from "./useOrderbook";
import { usePairWebsocket } from "./usePairWebsocket";

export interface OrderBookRow {
  price: number;
  size: number;
  total: number;
  depth: number;
  flash?: "up" | "down" | null;
}

export interface LiveMarketState {
  price: number;
  prevPrice: number;
  markPrice: number;
  indexPrice: number;
  change24h: number;
  volume24h: number;
  openInterest: number;
  fundingRate: number;
  fundingCountdown: string;
  asks: OrderBookRow[];
  bids: OrderBookRow[];
  lastTradeDir: "up" | "down";
  latencyMs: number;
}

function toOrderBookRows(
  levels: { price: number | string; amount: number | string; total: number | string }[]
): OrderBookRow[] {
  if (!levels || levels.length === 0) return [];
  const rows: OrderBookRow[] = levels.map((l) => ({
    price: typeof l.price === "string" ? parseFloat(l.price) : (l.price as number),
    size: typeof l.amount === "string" ? parseFloat(l.amount) : (l.amount as number),
    total: typeof l.total === "string" ? parseFloat(l.total) : (l.total as number),
    depth: 0,
    flash: null,
  }));
  const maxSize = Math.max(...rows.map((r) => r.size), 0);
  return rows.map((r) => ({
    ...r,
    depth: maxSize > 0 ? (r.size / maxSize) * 90 : 0,
  }));
}

function buildCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function useLiveMarket(): LiveMarketState {
  const selectedPair = useStore((s) => s.selectedPair);
  const pairs = useStore((s) => s.pairs);
  const activePair = selectedPair ?? pairs[0] ?? null;

  const prevPriceRef = useRef<number>(activePair?.price ?? 0);
  const countdownRef = useRef(6776);

  const [prevPrice, setPrevPrice] = useState<number>(activePair?.price ?? 0);
  const [fundingCountdown, setFundingCountdown] = useState(buildCountdown(countdownRef.current));

  const { orderbook, aggressiveRefetch } = useOrderbook(activePair?.id ?? null);

  const { connected } = usePairWebsocket(activePair?.id ?? null, {
    onOrderbookUpdate: aggressiveRefetch,
  });

  const currentPrice = activePair?.price ?? 0;
  useEffect(() => {
    if (currentPrice !== 0 && currentPrice !== prevPriceRef.current) {
      setPrevPrice(prevPriceRef.current);
      prevPriceRef.current = currentPrice;
    }
  }, [currentPrice]);

  useEffect(() => {
    const id = setInterval(() => {
      countdownRef.current = countdownRef.current <= 0 ? 28800 : countdownRef.current - 1;
      setFundingCountdown(buildCountdown(countdownRef.current));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const asks = orderbook ? toOrderBookRows(orderbook.asks) : [];
  const bids = orderbook ? toOrderBookRows(orderbook.bids) : [];

  const price = activePair?.price ?? 0;
  const change24h = (activePair?.priceChange24h ?? 0) / 100;
  const volume24h = activePair?.volume24hUSD ?? activePair?.volume24h ?? 0;

  return {
    price,
    prevPrice,
    markPrice: orderbook?.midPrice ?? price,
    indexPrice: price,
    change24h,
    volume24h,
    openInterest: 0,
    fundingRate: 0,
    fundingCountdown,
    asks,
    bids,
    lastTradeDir: price >= prevPrice ? "up" : "down",
    latencyMs: connected ? 12 : 0,
  };
}
