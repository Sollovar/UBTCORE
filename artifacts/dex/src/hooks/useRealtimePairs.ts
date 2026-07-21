/**
 * useRealtimePairs
 * ─────────────────
 * Opens a single WebSocket connection subscribed to pair="all" and keeps
 * every pair in the Zustand store up-to-date in real time.
 *
 * SINGLETON PATTERN: Only ONE WebSocket connection exists globally, regardless of
 * how many components mount/unmount. This prevents "Insufficient resources" errors.
 *
 * Price update sources (in order of latency):
 *   1. "price_update"  — fired immediately on every fill (sub-second)
 *   2. "ticker"        — fired after fill settlement + after every 30s cache refresh
 *                        (this is how GeckoTerminal / price-worker updates reach the UI)
 *
 * Flash directions are stored in the GLOBAL Zustand store, so any component
 * anywhere in the app can access flashMap and see price flashes in real time.
 * Flash resets to null after FLASH_MS milliseconds.
 *
 * Usage:
 *   const { flashMap } = useRealtimePairs();       // Creates/maintains WebSocket
 *   const flashMap = useFlashMap();                 // Just reads flashMap (no WebSocket)
 */

import { useEffect, useRef } from 'react';
import { useStore } from '../stores/useStore';

export type FlashDir = 'up' | 'down' | null;

const FLASH_MS      = 700;   // how long the flash colour stays on
const RECONNECT_MS  = 3000;  // reconnect delay on disconnect

function buildWsUrl(): string {
  const explicit = import.meta.env.VITE_WS_URL as string | undefined;
  if (explicit) {
    const u = new URL(explicit);
    u.searchParams.set('pair', 'all');
    return u.toString();
  }

  // Try to derive from API_BASE_URL
  const apiBaseUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (apiBaseUrl) {
    try {
      const u = new URL(apiBaseUrl);
      // Convert http to ws, https to wss
      const proto = u.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${proto}//${u.host}/ws?pair=all`;
      return wsUrl;
    } catch (e) {
      console.error('[WebSocket] Failed to parse VITE_API_URL:', e);
    }
  }

  // Fallback: use current origin (works for local dev with Vite proxy)
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws?pair=all`;
}

/** Map of pairId → current flash direction (stored globally in Zustand) */
export type FlashMap = Record<string, FlashDir>;

/**
 * Hook that reads flashMap from global store WITHOUT creating a WebSocket.
 * Use this in components that just need to display flash colors.
 */
export function useFlashMap(): FlashMap {
  return useStore(s => s.flashMap);
}

// ════════════════════════════════════════════════════════════════════════════
// SINGLETON WEBSOCKET MANAGER - Ensures only ONE connection exists globally
// ════════════════════════════════════════════════════════════════════════════

let globalWs: WebSocket | null = null;
let globalConnected = false;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let shouldReconnect = true;
const flashTimers: Record<string, ReturnType<typeof setTimeout>> = {};
let refCount = 0; // Track how many components are using the WebSocket

/**
 * Internal function to create and manage the WebSocket connection.
 * Called only when the first component mounts or after a disconnect.
 */
function createWebSocket() {
  if (globalWs && globalWs.readyState !== WebSocket.CLOSED) {
    console.log('[useRealtimePairs] WebSocket already exists, reusing connection');
    return;
  }

  console.log('[useRealtimePairs] Creating new singleton WebSocket...');
  shouldReconnect = true;

  const connect = () => {
    const getStoreState = useStore.getState;
    const { setFlash, updatePair } = getStoreState();

    const triggerFlash = (pairId: string, dir: FlashDir) => {
      if (!dir) return;
      const { setFlash } = useStore.getState();
      setFlash(pairId, dir);
      
      if (flashTimers[pairId]) clearTimeout(flashTimers[pairId]);
      flashTimers[pairId] = setTimeout(() => {
        const { setFlash } = useStore.getState();
        setFlash(pairId, null);
      }, FLASH_MS);
    };

    globalWs = new WebSocket(buildWsUrl());

    globalWs.onopen = () => {
      console.log('[useRealtimePairs] ✅ WebSocket connected (singleton)');
      globalConnected = true;
      globalWs!.send(JSON.stringify({ type: 'subscribe', pairId: 'all' }));
    };

    globalWs.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string) as {
          type: string;
          pair_id?: string;
          payload?: Record<string, unknown>;
        };
        if (!msg.type || !msg.pair_id) return;

        const pairId = msg.pair_id;
        const { pairs, updatePair } = useStore.getState();

        /* ── ticker — full stats update (from fill settlement or cache refresh) ── */
        if (msg.type === 'ticker' && msg.payload) {
          const p   = msg.payload as Record<string, unknown>;
          const source = typeof p.source === 'string' ? p.source : undefined;

          // ✨ CRITICAL: Capture OLD prices BEFORE parsing new values
          const currentPair = pairs.find(x => x.id === pairId);
          const oldGeckoPrice = currentPair?.geckoPrice ?? 0;
          const oldExchangePrice = currentPair?.price ?? 0;

          const newGeckoPrice = typeof p.gecko_price === 'string' && p.gecko_price !== ''
            ? parseFloat(p.gecko_price)
            : undefined;
          const newGeckoPriceUSD = typeof p.gecko_price_usd === 'string' && p.gecko_price_usd !== ''
            ? parseFloat(p.gecko_price_usd)
            : undefined;
          const newGeckoPriceChange = typeof p.gecko_price_change_24h === 'string' && p.gecko_price_change_24h !== ''
            ? parseFloat(p.gecko_price_change_24h)
            : undefined;
          const geckoHigh24h = typeof p.gecko_high_24h === 'string' && p.gecko_high_24h !== ''
            ? parseFloat(p.gecko_high_24h)
            : undefined;
          const geckoLow24h = typeof p.gecko_low_24h === 'string' && p.gecko_low_24h !== ''
            ? parseFloat(p.gecko_low_24h)
            : undefined;
          const geckoLiquidity = typeof p.gecko_liquidity === 'string' && p.gecko_liquidity !== ''
            ? parseFloat(p.gecko_liquidity)
            : undefined;
          const geckoLiquidityUSD = typeof p.gecko_liquidity_usd === 'string' && p.gecko_liquidity_usd !== ''
            ? parseFloat(p.gecko_liquidity_usd)
            : undefined;
          const geckoMarketCap = typeof p.gecko_market_cap === 'string' && p.gecko_market_cap !== ''
            ? parseFloat(p.gecko_market_cap)
            : undefined;
          const geckoMarketCapUSD = typeof p.gecko_market_cap_usd === 'string' && p.gecko_market_cap_usd !== ''
            ? parseFloat(p.gecko_market_cap_usd)
            : undefined;

          const updates: Record<string, unknown> = {};

          if (newGeckoPrice != null && !Number.isNaN(newGeckoPrice) && newGeckoPrice > 0) {
            updates.geckoPrice = newGeckoPrice;
          }
          if (newGeckoPriceUSD != null && !Number.isNaN(newGeckoPriceUSD)) {
            updates.geckoPriceUSD = newGeckoPriceUSD;
          }
          if (newGeckoPriceChange != null && !Number.isNaN(newGeckoPriceChange)) {
            updates.geckoPriceChange24h = newGeckoPriceChange;
          }
          if (geckoHigh24h != null && !Number.isNaN(geckoHigh24h)) {
            updates.geckoHigh24h = geckoHigh24h;
          }
          if (geckoLow24h != null && !Number.isNaN(geckoLow24h)) {
            updates.geckoLow24h = geckoLow24h;
          }
          if (geckoLiquidity != null && !Number.isNaN(geckoLiquidity)) {
            updates.geckoLiquidity = geckoLiquidity;
          }
          if (geckoLiquidityUSD != null && !Number.isNaN(geckoLiquidityUSD)) {
            updates.geckoLiquidityUSD = geckoLiquidityUSD;
          }
          if (geckoMarketCap != null && !Number.isNaN(geckoMarketCap)) {
            updates.geckoMarketCap = geckoMarketCap;
            updates.marketCap = geckoMarketCap;
          }
          if (geckoMarketCapUSD != null && !Number.isNaN(geckoMarketCapUSD)) {
            updates.geckoMarketCapUSD = geckoMarketCapUSD;
            updates.marketCapUSD = geckoMarketCapUSD;
          }

          if (source === 'fill') {
            const newPrice = typeof p.last_price === 'string' && p.last_price !== ''
              ? parseFloat(p.last_price)
              : undefined;
            const newPriceChange24h = typeof p.price_change_24h === 'string' && p.price_change_24h !== ''
              ? parseFloat(p.price_change_24h)
              : undefined;
            const newVolume24h = typeof p.volume_24h === 'string' && p.volume_24h !== ''
              ? parseFloat(p.volume_24h)
              : undefined;
            const newLiquidity = typeof p.liquidity === 'string' && p.liquidity !== ''
              ? parseFloat(p.liquidity)
              : undefined;
            const newPriceUSD = typeof p.price_usd === 'string' && p.price_usd !== ''
              ? parseFloat(p.price_usd)
              : undefined;
            const newLiquidityUSD = typeof p.liquidity_usd === 'string' && p.liquidity_usd !== ''
              ? parseFloat(p.liquidity_usd)
              : undefined;
            const newHigh24h = typeof p.price_high_24h === 'string' && p.price_high_24h !== ''
              ? parseFloat(p.price_high_24h)
              : undefined;
            const newLow24h = typeof p.price_low_24h === 'string' && p.price_low_24h !== ''
              ? parseFloat(p.price_low_24h)
              : undefined;

            if (newPrice != null && !Number.isNaN(newPrice) && newPrice > 0) {
              updates.price = newPrice;
              updates.lastTradePrice = newPrice;
            }
            if (newPriceChange24h != null && !Number.isNaN(newPriceChange24h)) {
              updates.priceChange24h = newPriceChange24h;
            }
            if (newVolume24h != null && !Number.isNaN(newVolume24h) && newVolume24h > 0) {
              updates.volume24h = newVolume24h;
            }
            if (newLiquidity != null && !Number.isNaN(newLiquidity) && newLiquidity > 0) {
              updates.liquidity = newLiquidity;
            }
            if (newPriceUSD != null && !Number.isNaN(newPriceUSD)) {
              updates.priceUSD = newPriceUSD;
            }
            if (newLiquidityUSD != null && !Number.isNaN(newLiquidityUSD) && newLiquidityUSD > 0) {
              updates.liquidityUSD = newLiquidityUSD;
            }
            if (newHigh24h != null && !Number.isNaN(newHigh24h)) {
              updates.priceHigh24h = newHigh24h;
            }
            if (newLow24h != null && !Number.isNaN(newLow24h)) {
              updates.priceLow24h = newLow24h;
            }
          }

          if (Object.keys(updates).length > 0) {
            updatePair(pairId, updates as any);
          }

          // ✨ Determine flash direction based on actual price changes
          const dir: FlashDir = (() => {
            if (source === 'fill') {
              // Exchange fill - compare exchange price
              const newPrice = typeof p.last_price === 'string' && p.last_price !== ''
                ? parseFloat(p.last_price)
                : undefined;
              if (newPrice == null || Number.isNaN(newPrice) || newPrice <= 0) return null;
              if (oldExchangePrice === 0) return null; // First price, don't flash
              if (newPrice === oldExchangePrice) return null; // No change
              return newPrice > oldExchangePrice ? 'up' : 'down';
            } else {
              // Cache refresh - compare gecko price
              if (newGeckoPrice == null || Number.isNaN(newGeckoPrice) || newGeckoPrice <= 0) return null;
              if (oldGeckoPrice === 0) return null; // First price, don't flash
              if (newGeckoPrice === oldGeckoPrice) return null; // No change
              return newGeckoPrice > oldGeckoPrice ? 'up' : 'down';
            }
          })();

          if (dir) triggerFlash(pairId, dir);
          return;
        }

        /* ── price_update — immediate lightweight flash on fill ── */
        if (msg.type === 'price_update' && msg.payload) {
          const p        = msg.payload;
          const newPrice = parseFloat(p.last_trade_price as string) || 0;
          if (newPrice <= 0) return;

          const currentPair = pairs.find(x => x.id === pairId);
          const oldPrice    = currentPair?.price ?? 0;
          const dir: FlashDir = newPrice > oldPrice ? 'up' : newPrice < oldPrice ? 'down' : null;

          // price_update comes from actual fills on our exchange
          // Update ONLY the exchange price (pair.price), NOT geckoPrice
          updatePair(pairId, { 
            price: newPrice,
            lastTradePrice: newPrice,
          });
          triggerFlash(pairId, dir);
          return;
        }
      } catch {
        // ignore malformed messages
      }
    };

    globalWs.onerror = () => { 
      console.error('[useRealtimePairs] WebSocket error');
      globalConnected = false; 
    };

    globalWs.onclose = () => {
      console.log('[useRealtimePairs] WebSocket closed');
      globalConnected = false;
      globalWs = null;
      
      if (shouldReconnect && refCount > 0) {
        console.log(`[useRealtimePairs] Reconnecting in ${RECONNECT_MS}ms... (${refCount} components active)`);
        reconnectTimer = setTimeout(connect, RECONNECT_MS);
      }
    };
  };

  connect();
}

/**
 * Hook that creates the WebSocket connection and manages real-time updates.
 * Uses a singleton pattern - only ONE WebSocket exists regardless of how many times this is called.
 */
export function useRealtimePairs(): { flashMap: FlashMap; connected: boolean } {
  const flashMap = useStore(s => s.flashMap);
  const connectedRef = useRef(globalConnected);

  useEffect(() => {
    // Increment reference count
    refCount++;
    console.log(`[useRealtimePairs] Component mounted. RefCount: ${refCount}`);

    // Create WebSocket only if it doesn't exist
    if (!globalWs || globalWs.readyState === WebSocket.CLOSED) {
      createWebSocket();
    }

    // Keep connectedRef in sync with globalConnected
    const interval = setInterval(() => {
      connectedRef.current = globalConnected;
    }, 500);

    return () => {
      // Decrement reference count
      refCount--;
      console.log(`[useRealtimePairs] Component unmounted. RefCount: ${refCount}`);

      clearInterval(interval);

      // Only close WebSocket when NO components are using it
      if (refCount === 0) {
        console.log('[useRealtimePairs] Last component unmounted, cleaning up...');
        shouldReconnect = false;
        
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
        
        if (globalWs && globalWs.readyState === WebSocket.OPEN) {
          globalWs.close();
        }
        
        // Clear all flash timers
        Object.values(flashTimers).forEach(clearTimeout);
        Object.keys(flashTimers).forEach(key => delete flashTimers[key]);
      }
    };
  }, []);

  return { flashMap, connected: connectedRef.current };
}
