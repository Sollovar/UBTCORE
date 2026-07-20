import { useEffect, useRef, useState } from 'react';
import { useStore } from '../stores/useStore';

export interface TradeUpdatePayload {
  id: number;
  pair_id?: string;
  price: string;
  price_human?: string;
  amount: string;
  amount_human?: string;
  side: string;
  time: number;
  tx_hash?: string;
  tx_hash_buy?: string;
  tx_hash_sell?: string;
  decimals?: number;
  order_id?: number;
  taker_order_id?: number;
}

export interface OrderUpdatePayload {
  id: number;
  price: string;
  amount: string;
  filled_amount: string;
  status: string;
  side: string;
  pair_id: string;
  amount_in?: string;
  amount_out_min?: string;
}

export interface TickerUpdatePayload {
  pair_id: string;
  last_price: string;
  price_change_24h: string;
  volume_24h: string;
  volume_24h_usd?: string;
  price_usd?: string;
  price_high_24h?: string;
  price_low_24h?: string;
  liquidity?: string;
  liquidity_usd?: string;
}

function calculateTrendingScore(volume24h: number, liquidity: number, priceChange24h: number): number {
  const volumeScore = Math.min(Math.log10(Math.max(volume24h, 1)) * 10, 50);
  const liquidityScore = Math.min(Math.log10(Math.max(liquidity, 1)) * 8, 30);
  const priceChangeScore = Math.max(-10, Math.min(20, priceChange24h * 0.5));
  const totalScore = volumeScore + liquidityScore + priceChangeScore;
  return Math.max(0, Math.min(100, totalScore));
}

type WebsocketMessage = {
  type: 'orderbook' | 'trade' | 'ticker' | string;
  pair_id?: string;
  payload?: unknown;
};

const buildWebSocketUrl = (pairId?: string) => {
  const explicitWsUrl = import.meta.env.VITE_WS_URL;
  if (explicitWsUrl) {
    const url = new URL(explicitWsUrl);
    if (pairId) {
      url.searchParams.set('pair', pairId);
    }
    return url.toString();
  }

  // In development, connect directly to backend (Vite proxy doesn't work well with websockets)
  // In production, use the current origin
  const isDev = import.meta.env.DEV;
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

  let wsBase: string;
  if (isDev) {
    wsBase = `${protocol}//localhost:8080`;
  } else {
    wsBase = `${protocol}//${window.location.host}`;
  }

  const url = new URL(`${wsBase}/ws`);
  if (pairId) {
    url.searchParams.set('pair', pairId);
  }

  return url.toString();
};

export function usePairWebsocket(
  pairId: string | null,
  handlers?: {
    onOrderbookUpdate?: () => void;
    onTradeUpdate?: (trade: TradeUpdatePayload) => void;
    onTickerUpdate?: (ticker: TickerUpdatePayload) => void;
    onOrderUpdate?: (order: OrderUpdatePayload) => void;
  }
) {
  const [connected, setConnected] = useState(false);
  const updatePair = useStore((state) => state.updatePair);
  // helper to access current store snapshot for recomputing scores
  const getStore = useStore.getState;
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!pairId) return;

    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let shouldReconnect = true;

    const connect = () => {
      const socketUrl = buildWebSocketUrl(pairId);
      ws = new WebSocket(socketUrl);

      ws.onopen = () => {
        setConnected(true);
        ws?.send(JSON.stringify({ type: 'subscribe', pairId }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data.toString()) as WebsocketMessage;
          if (!message.type) return;

          if (message.type === 'orderbook') {
            handlersRef.current?.onOrderbookUpdate?.();
            return;
          }

          if (message.type === 'trade' && message.payload) {
            const trade = message.payload as TradeUpdatePayload;
            trade.pair_id = message.pair_id;
            handlersRef.current?.onTradeUpdate?.(trade);
            return;
          }

          if (message.type === 'ticker' && message.payload) {
            const ticker = message.payload as TickerUpdatePayload;
            handlersRef.current?.onTickerUpdate?.(ticker);

            const volume24h = parseFloat(ticker.volume_24h) || 0;
            const liquidity = ticker.liquidity ? parseFloat(ticker.liquidity) : 0;
            const priceChange24h = parseFloat(ticker.price_change_24h) || 0;
            const high24h = ticker.price_high_24h ? parseFloat(ticker.price_high_24h) : undefined;
            const low24h = ticker.price_low_24h ? parseFloat(ticker.price_low_24h) : undefined;
            const updates: Record<string, unknown> = {
              price: parseFloat(ticker.last_price) || 0,
              priceChange24h: priceChange24h,
              volume24h: volume24h,
              liquidity: liquidity,
              priceHigh24h: high24h,
              priceLow24h: low24h,
              trendingScore: calculateTrendingScore(volume24h, liquidity, priceChange24h),
            };

            if (ticker.volume24h_usd != null && ticker.volume24h_usd !== '') {
              const parsedVolumeUsd = parseFloat(ticker.volume24h_usd);
              if (!Number.isNaN(parsedVolumeUsd)) {
                updates.volume24hUSD = parsedVolumeUsd;
              } else {
                updates.volume24hUSD = undefined;
              }
            } else {
              updates.volume24hUSD = undefined;
            }

            if (ticker.price_usd != null && ticker.price_usd !== '') {
              const parsedPriceUsd = parseFloat(ticker.price_usd);
              if (!Number.isNaN(parsedPriceUsd)) {
                updates.priceUSD = parsedPriceUsd;
              } else {
                updates.priceUSD = undefined;
              }
            }

            if (ticker.liquidity_usd != null && ticker.liquidity_usd !== '') {
              const parsedLiquidityUsd = parseFloat(ticker.liquidity_usd);
              if (!Number.isNaN(parsedLiquidityUsd)) {
                updates.liquidityUSD = parsedLiquidityUsd;
              } else {
                updates.liquidityUSD = undefined;
              }
            } else {
              updates.liquidityUSD = undefined;
            }

            updatePair(ticker.pair_id, updates as any);
          }

          // Handle order update for real-time filled amount updates
          if (message.type === 'order_update' && message.payload) {
            handlersRef.current?.onOrderUpdate?.(message.payload as OrderUpdatePayload);
          }

          // Handle liquidity update for real-time liquidity updates
          if (message.type === 'liquidity' && message.payload) {
            const liquidityPayload = message.payload as { liquidity: string; liquidity_usd?: string };
            const liquidity = parseFloat(liquidityPayload.liquidity) || 0;
            const updates: Record<string, unknown> = {
              liquidity: liquidity,
            };
            if (liquidityPayload.liquidity_usd != null && liquidityPayload.liquidity_usd !== '') {
              const parsedLiquidityUsd = parseFloat(liquidityPayload.liquidity_usd);
              if (!Number.isNaN(parsedLiquidityUsd)) {
                updates.liquidityUSD = parsedLiquidityUsd;
              }
            }

            // Recompute trending score when liquidity changes so the Score column updates in real time
            if (message.pair_id) {
              const store = getStore();
              const currentPair = store.pairs.find(p => p.id === message.pair_id);
              const volume24h = currentPair ? currentPair.volume24h : 0;
              const priceChange24h = currentPair ? currentPair.priceChange24h : 0;
              updates.trendingScore = calculateTrendingScore(volume24h, liquidity, priceChange24h);
              updatePair(message.pair_id, updates as any);
            }
          }
        } catch (error) {
          console.error('WebSocket parse error:', error);
        }
      };

      ws.onerror = (event) => {
        console.error('[WebSocket] ✗ Connection error:', event);
        setConnected(false);
      };

      ws.onclose = (event) => {
        setConnected(false);

        if (shouldReconnect) {
          reconnectTimeout = window.setTimeout(() => {
            connect();
          }, 3000);
        }
      };
    };

    connect();

    return () => {
      shouldReconnect = false;
      if (reconnectTimeout !== null) {
        window.clearTimeout(reconnectTimeout);
      }
      // Only close if the connection is actually open; don't close while connecting
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [pairId, updatePair]);

  return { connected };
}
