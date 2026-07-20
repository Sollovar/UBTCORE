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
  maker?: string;
  taker?: string;
  base_symbol?: string;
  quote_symbol?: string;
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
  maker?: string;
}

export interface TickerUpdatePayload {
  pair_id: string;
  source?: string;
  last_price: string;
  price_change_24h: string;
  volume_24h: string;
  volume_24h_usd?: string;
  price_usd?: string;
  price_high_24h?: string;
  price_low_24h?: string;
  liquidity?: string;
  liquidity_usd?: string;
  gecko_price?: string;
  gecko_price_usd?: string;
  gecko_price_change_24h?: string;
  gecko_high_24h?: string;
  gecko_low_24h?: string;
  gecko_liquidity?: string;
  gecko_liquidity_usd?: string;
  gecko_market_cap?: string;
  gecko_market_cap_usd?: string;
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

  // Always use current origin — in dev the Vite proxy forwards /ws to the Go backend
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsBase = `${protocol}//${window.location.host}`;

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
    let reconnectTimeout: number | null = null;
    let shouldReconnect = true;

    const connect = () => {
      const socketUrl = buildWebSocketUrl(pairId);
      console.log('[usePairWebsocket] Connecting to:', socketUrl);
      ws = new WebSocket(socketUrl);

      ws.onopen = () => {
        console.log('[usePairWebsocket] Connected! Subscribing to pairId:', pairId);
        setConnected(true);
        ws?.send(JSON.stringify({ type: 'subscribe', pairId }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data.toString()) as WebsocketMessage;
          if (!message.type) return;

          console.log('[usePairWebsocket] Received message type:', message.type, 'pairId:', message.pair_id);

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

          // price_update: immediate fill price before full ticker stats are ready
          if (message.type === 'price_update' && message.payload) {
            const pu = message.payload as { pair_id: string; last_trade_price: string };
            const pairId = message.pair_id ?? pu.pair_id;
            const newPrice = parseFloat(pu.last_trade_price);
            if (pairId && !isNaN(newPrice)) {
              updatePair(pairId, { price: newPrice });
            }
            return;
          }

          if (message.type === 'ticker' && message.payload) {
            const ticker = message.payload as TickerUpdatePayload;
            handlersRef.current?.onTickerUpdate?.(ticker);

            const isCacheRefresh = ticker.source === 'cache_refresh';
            const isFill = ticker.source === 'fill';
            const volume24h = parseFloat(ticker.volume_24h) || 0;
            const liquidity = ticker.liquidity ? parseFloat(ticker.liquidity) : 0;
            const priceChange24h = parseFloat(ticker.price_change_24h) || 0;
            const high24h = ticker.price_high_24h ? parseFloat(ticker.price_high_24h) : undefined;
            const low24h = ticker.price_low_24h ? parseFloat(ticker.price_low_24h) : undefined;
            const updates: Record<string, unknown> = {};

            if (!isCacheRefresh) {
              updates.price = parseFloat(ticker.last_price) || 0;
              
              // Only update priceChange24h when source is 'fill' (actual backend calculation)
              // This is the EXCHANGE price change, not gecko price change
              if (isFill && priceChange24h !== 0) {
                updates.priceChange24h = priceChange24h;
              }
              
              // Only update volume24h if we have a valid non-zero value
              // Otherwise preserve the existing cached volume from the API
              if (volume24h > 0) {
                updates.volume24h = volume24h;
              }
              // Only update liquidity if we have a valid non-zero value
              // Otherwise preserve the existing cached liquidity from the orderbook
              if (liquidity > 0) {
                updates.liquidity = liquidity;
              }
              updates.priceHigh24h = high24h;
              updates.priceLow24h = low24h;
              // Get current pair's volume and liquidity for trending score calculation
              const store = getStore();
              const currentPair = store.pairs.find(p => p.id === ticker.pair_id);
              const effectiveVolume = volume24h > 0 ? volume24h : (currentPair?.volume24h ?? 0);
              const effectiveLiquidity = liquidity > 0 ? liquidity : (currentPair?.liquidity ?? 0);
              // Use the appropriate price change for trending score
              const currentPriceChange = isFill && priceChange24h !== 0 ? priceChange24h : (currentPair?.priceChange24h ?? 0);
              updates.trendingScore = calculateTrendingScore(effectiveVolume, effectiveLiquidity, currentPriceChange);
            }

            if (ticker.volume_24h_usd != null && ticker.volume_24h_usd !== '' && !isCacheRefresh) {
              const parsedVolumeUsd = parseFloat(ticker.volume_24h_usd);
              if (!Number.isNaN(parsedVolumeUsd) && parsedVolumeUsd > 0) {
                updates.volume24hUSD = parsedVolumeUsd;
              }
              // If 0 or missing, leave volume24hUSD unchanged (don't overwrite with 0)
            }

            if (ticker.price_usd != null && ticker.price_usd !== '' && !isCacheRefresh) {
              const parsedPriceUsd = parseFloat(ticker.price_usd);
              if (!Number.isNaN(parsedPriceUsd)) {
                updates.priceUSD = parsedPriceUsd;
              } else {
                updates.priceUSD = undefined;
              }
            }

            if (ticker.liquidity_usd != null && ticker.liquidity_usd !== '' && !isCacheRefresh) {
              const parsedLiquidityUsd = parseFloat(ticker.liquidity_usd);
              if (!Number.isNaN(parsedLiquidityUsd) && parsedLiquidityUsd > 0) {
                updates.liquidityUSD = parsedLiquidityUsd;
              }
              // If 0 or missing, leave liquidityUSD unchanged
            }

            const geckoPrice = ticker.gecko_price != null && ticker.gecko_price !== ''
              ? parseFloat(ticker.gecko_price)
              : undefined;
            const geckoPriceUSD = ticker.gecko_price_usd != null && ticker.gecko_price_usd !== ''
              ? parseFloat(ticker.gecko_price_usd)
              : undefined;
            const geckoPriceChange24h = ticker.gecko_price_change_24h != null && ticker.gecko_price_change_24h !== ''
              ? parseFloat(ticker.gecko_price_change_24h)
              : undefined;
            const geckoHigh24h = ticker.gecko_high_24h != null && ticker.gecko_high_24h !== ''
              ? parseFloat(ticker.gecko_high_24h)
              : undefined;
            const geckoLow24h = ticker.gecko_low_24h != null && ticker.gecko_low_24h !== ''
              ? parseFloat(ticker.gecko_low_24h)
              : undefined;
            const geckoLiquidity = ticker.gecko_liquidity != null && ticker.gecko_liquidity !== ''
              ? parseFloat(ticker.gecko_liquidity)
              : undefined;
            const geckoLiquidityUSD = ticker.gecko_liquidity_usd != null && ticker.gecko_liquidity_usd !== ''
              ? parseFloat(ticker.gecko_liquidity_usd)
              : undefined;
            const geckoMarketCap = ticker.gecko_market_cap != null && ticker.gecko_market_cap !== ''
              ? parseFloat(ticker.gecko_market_cap)
              : undefined;
            const geckoMarketCapUSD = ticker.gecko_market_cap_usd != null && ticker.gecko_market_cap_usd !== ''
              ? parseFloat(ticker.gecko_market_cap_usd)
              : undefined;

            if (geckoPrice != null && !Number.isNaN(geckoPrice)) updates.geckoPrice = geckoPrice;
            if (geckoPriceUSD != null && !Number.isNaN(geckoPriceUSD)) updates.geckoPriceUSD = geckoPriceUSD;
            if (geckoPriceChange24h != null && !Number.isNaN(geckoPriceChange24h)) updates.geckoPriceChange24h = geckoPriceChange24h;
            if (geckoHigh24h != null && !Number.isNaN(geckoHigh24h)) updates.geckoHigh24h = geckoHigh24h;
            if (geckoLow24h != null && !Number.isNaN(geckoLow24h)) updates.geckoLow24h = geckoLow24h;
            if (geckoLiquidity != null && !Number.isNaN(geckoLiquidity)) updates.geckoLiquidity = geckoLiquidity;
            if (geckoLiquidityUSD != null && !Number.isNaN(geckoLiquidityUSD)) updates.geckoLiquidityUSD = geckoLiquidityUSD;
            if (geckoMarketCap != null && !Number.isNaN(geckoMarketCap)) {
              updates.geckoMarketCap = geckoMarketCap;
              updates.marketCap = geckoMarketCap;
            }
            if (geckoMarketCapUSD != null && !Number.isNaN(geckoMarketCapUSD)) {
              updates.geckoMarketCapUSD = geckoMarketCapUSD;
              updates.marketCapUSD = geckoMarketCapUSD;
            }

            if (Object.keys(updates).length > 0) {
              updatePair(ticker.pair_id, updates as any);
            }
          }

          // Handle order update for real-time filled amount updates
          if (message.type === 'order_update' && message.payload) {
            console.log('[usePairWebsocket] Calling onOrderUpdate handler with:', message.payload);
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
