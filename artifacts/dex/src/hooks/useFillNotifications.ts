import { useEffect, useRef, useCallback } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useStore } from '../stores/useStore';
import { useNotificationStore } from '../stores/useNotificationStore';
import { toast } from 'sonner';
import { getExplorerTxUrl, Network } from '../utils/contracts';
import { usePairWebsocket, TradeUpdatePayload, OrderUpdatePayload } from './usePairWebsocket';
import { playFillSound } from '../utils/sound';
import { useSettings } from '../contexts/SettingsContext';

interface Fill {
  id: number;
  tx_hash?: string;
  tx_hash_buy?: string;
  tx_hash_sell?: string;
  maker: string;
  taker: string;
  status: string;
  created_at: string;
  price: string;
  amount: string;
  amount_human: string;
  price_human: string;
  base_symbol: string;
  quote_symbol: string;
  pair_id?: string;   // e.g. "solana_HnhpJP..." — used to derive the correct explorer
  network?: string;   // e.g. "solana" | "bsc" | "base"
}

// Helper to manage fills seen via websocket (immediate, unconfirmed)
// CRITICAL: Use in-memory storage per browser tab/window to prevent cross-tab conflicts
// When multiple users trade from different tabs, each tab should show notifications
const websocketFillsCachePerSession = new Map<string, Set<number>>();

function getCachedWebsocketFills(walletAddress: string): Set<number> {
  const key = walletAddress.toLowerCase();
  if (!websocketFillsCachePerSession.has(key)) {
    websocketFillsCachePerSession.set(key, new Set());
  }
  return websocketFillsCachePerSession.get(key)!;
}

function setCachedWebsocketFills(walletAddress: string, ids: Set<number>) {
  const key = walletAddress.toLowerCase();
  websocketFillsCachePerSession.set(key, ids);
}

// Helper to track fills that have tx_hash from database
function getCachedFillsWithTxHash(walletAddress: string): Set<number> {
  try {
    const key = `cexdex-fills-with-txhash-${walletAddress.toLowerCase()}`;
    const stored = localStorage.getItem(key);
    return new Set(stored ? JSON.parse(stored) : []);
  } catch {
    return new Set();
  }
}

function setCachedFillsWithTxHash(walletAddress: string, ids: Set<number>) {
  try {
    const key = `cexdex-fills-with-txhash-${walletAddress.toLowerCase()}`;
    localStorage.setItem(key, JSON.stringify(Array.from(ids)));
  } catch (e) {
    console.error('Failed to save fills with tx_hash to localStorage:', e);
  }
}

function markFillHasTxHash(fillId: number, walletAddress: string) {
  const fillsWithTxHash = getCachedFillsWithTxHash(walletAddress);
  fillsWithTxHash.add(fillId);
  setCachedFillsWithTxHash(walletAddress, fillsWithTxHash);
}

// Helper to show fill notification toast with properly formatted price
function getTradeExplorerHash(trade: TradeUpdatePayload | Fill): string | undefined {
  return trade.tx_hash || trade.tx_hash_buy || trade.tx_hash_sell;
}

/** Derive the network from a fill/trade by inspecting pair_id or a network field. */
function networkFromFill(trade: TradeUpdatePayload | Fill, fallback: Network): Network {
  // TradeUpdatePayload has pair_id; Fill has pair_id too via the API response
  const pairId: string = (trade as any).pair_id || '';
  if (pairId.startsWith('solana_') || pairId.includes('solana')) return 'solana';
  if (pairId.startsWith('base_')   || pairId.includes('base'))   return 'base';
  if (pairId.startsWith('bsc_')    || pairId.includes('bsc'))    return 'bsc';
  // Also check a network field if present (fills API response includes it)
  const net: string = (trade as any).network || '';
  if (net === 'solana') return 'solana';
  if (net === 'base')   return 'base';
  if (net === 'bsc')    return 'bsc';
  return fallback;
}

function explorerLabel(network: Network): string {
  if (network === 'bsc')    return 'View on BscScan';
  if (network === 'base')   return 'View on BaseScan';
  if (network === 'solana') return 'View on SolScan';
  return 'View on Explorer';
}

function showFillToastFromWebsocket(trade: TradeUpdatePayload, fallbackNetwork: Network, walletAddress: string) {
  const priceDisplay = trade.price_human || trade.price;
  const amountDisplay = trade.amount_human || trade.amount;
  const pairId = trade.pair_id;
  const storePair = pairId ? useStore.getState().pairs.find((p) => p.id === pairId) : undefined;
  const baseSymbol = storePair?.baseToken?.symbol || trade.base_symbol || 'base';
  const quoteSymbol = storePair?.quoteToken?.symbol || trade.quote_symbol || 'quote';
  const fillNetwork = networkFromFill(trade, fallbackNetwork);
  const toastStyle = {
    background: '#050505',
    color: '#f7f7f8',
    border: '1px solid rgba(245, 197, 24, 0.28)',
    boxShadow: '0 18px 45px rgba(0, 0, 0, 0.5)',
  } as const;
  const className = 'border border-[#2a2a2a] text-white';

  // Determine if the current user is the buyer or seller
  const normalizedWallet = walletAddress.toLowerCase();
  const normalizedMaker = trade.maker?.toLowerCase() || '';
  const normalizedTaker = trade.taker?.toLowerCase() || '';
  
  // side field indicates what the taker did: "buy" means taker bought, "sell" means taker sold
  const takerIsBuyer = trade.side === 'buy';
  const userIsTaker = normalizedWallet === normalizedTaker;
  const userIsMaker = normalizedWallet === normalizedMaker;
  
  // CRITICAL FIX: If maker/taker fields are empty, assume this trade involves the user
  // This handles cases where WebSocket doesn't send maker/taker addresses
  const hasUserInfo = normalizedMaker || normalizedTaker;
  const userIsInvolved = !hasUserInfo || userIsTaker || userIsMaker;
  
  if (!userIsInvolved) {
    // User is definitely not involved in this trade
    return;
  }
  
  // Determine user's role: if they're the taker, use their side; if maker, use opposite side
  let userIsBuyer = false;
  if (userIsTaker) {
    userIsBuyer = takerIsBuyer;
  } else if (userIsMaker) {
    userIsBuyer = !takerIsBuyer; // Maker is opposite of taker
  } else {
    // Fallback: if we don't know user's role but they're involved, use trade side
    userIsBuyer = takerIsBuyer;
  }

  const buyHash  = trade.tx_hash_buy;
  const sellHash = trade.tx_hash_sell;
  const singleHash = trade.tx_hash;

  // Show only the appropriate toast based on user's role
  if (userIsBuyer) {
    const hash = buyHash || singleHash;
    if (hash) {
      toast.success('Buy order filled', {
        description: `Bought ${amountDisplay} ${baseSymbol} at ${priceDisplay} ${quoteSymbol}`,
        action: { label: explorerLabel(fillNetwork), onClick: () => window.open(getExplorerTxUrl(fillNetwork, hash), '_blank') },
        duration: 9000, style: toastStyle, className,
      });
    } else {
      toast.success('Buy order filled', {
        description: `Bought ${amountDisplay} ${baseSymbol} at ${priceDisplay} ${quoteSymbol} — tx pending`,
        duration: 7000, style: toastStyle, className,
      });
    }
  } else {
    // User is seller
    const hash = sellHash || singleHash;
    if (hash) {
      toast.success('Sell order filled', {
        description: `Sold ${amountDisplay} ${baseSymbol} at ${priceDisplay} ${quoteSymbol}`,
        action: { label: explorerLabel(fillNetwork), onClick: () => window.open(getExplorerTxUrl(fillNetwork, hash), '_blank') },
        duration: 9000, style: toastStyle, className,
      });
    } else {
      toast.success('Sell order filled', {
        description: `Sold ${amountDisplay} ${baseSymbol} at ${priceDisplay} ${quoteSymbol} — tx pending`,
        duration: 7000, style: toastStyle, className,
      });
    }
  }
}

function showFillToastWithTxHash(fill: Fill, fallbackNetwork: Network, walletAddress: string) {
  const fillNetwork = networkFromFill(fill, fallbackNetwork);
  const toastStyle = {
    background: '#050505',
    color: '#f7f7f8',
    border: '1px solid rgba(245, 197, 24, 0.28)',
    boxShadow: '0 18px 45px rgba(0, 0, 0, 0.5)',
  } as const;
  const className = 'border border-[#2a2a2a] text-white';

  // Determine if the current user is the buyer or seller
  const normalizedWallet = walletAddress.toLowerCase();
  const normalizedMaker = fill.maker?.toLowerCase() || '';
  const normalizedTaker = fill.taker?.toLowerCase() || '';
  
  const userIsTaker = normalizedWallet === normalizedTaker;
  const userIsMaker = normalizedWallet === normalizedMaker;
  
  if (!userIsTaker && !userIsMaker) {
    // User is neither maker nor taker, don't show notification
    return;
  }

  const buyHash  = fill.tx_hash_buy;
  const sellHash = fill.tx_hash_sell;
  const singleHash = fill.tx_hash;

  // Determine user's role based on maker/taker relationship
  // Note: We can't directly determine buy/sell from Fill without additional context
  // So we'll show appropriate message based on which hash is present for this user
  if (buyHash && userIsTaker) {
    // Taker with buy hash means they bought
    toast.success('Buy confirmed', {
      description: `Bought ${fill.amount_human} ${fill.base_symbol} at ${fill.price_human} ${fill.quote_symbol}`,
      action: { label: explorerLabel(fillNetwork), onClick: () => window.open(getExplorerTxUrl(fillNetwork, buyHash), '_blank') },
      duration: 10000, style: toastStyle, className,
    });
  } else if (sellHash && userIsTaker) {
    // Taker with sell hash means they sold
    toast.success('Sell confirmed', {
      description: `Sold ${fill.amount_human} ${fill.base_symbol} at ${fill.price_human} ${fill.quote_symbol}`,
      action: { label: explorerLabel(fillNetwork), onClick: () => window.open(getExplorerTxUrl(fillNetwork, sellHash), '_blank') },
      duration: 10000, style: toastStyle, className,
    });
  } else if (buyHash && userIsMaker) {
    // Maker with buy hash means they sold (opposite of taker)
    toast.success('Sell confirmed', {
      description: `Sold ${fill.amount_human} ${fill.base_symbol} at ${fill.price_human} ${fill.quote_symbol}`,
      action: { label: explorerLabel(fillNetwork), onClick: () => window.open(getExplorerTxUrl(fillNetwork, buyHash), '_blank') },
      duration: 10000, style: toastStyle, className,
    });
  } else if (sellHash && userIsMaker) {
    // Maker with sell hash means they bought (opposite of taker)
    toast.success('Buy confirmed', {
      description: `Bought ${fill.amount_human} ${fill.base_symbol} at ${fill.price_human} ${fill.quote_symbol}`,
      action: { label: explorerLabel(fillNetwork), onClick: () => window.open(getExplorerTxUrl(fillNetwork, sellHash), '_blank') },
      duration: 10000, style: toastStyle, className,
    });
  } else {
    // Fallback to single hash
    const hash = singleHash || buyHash || sellHash;
    if (!hash) return;
    toast.success('Transaction confirmed', {
      description: `${fill.amount_human} ${fill.base_symbol} at ${fill.price_human} ${fill.quote_symbol}`,
      action: { label: explorerLabel(fillNetwork), onClick: () => window.open(getExplorerTxUrl(fillNetwork, hash), '_blank') },
      duration: 10000, style: toastStyle, className,
    });
  }
}

function addCachedUserOrderHash(walletAddress: string, hash: string) {
  // No longer needed with database-backed approach
}

function addCachedUserOrderRef(walletAddress: string, ref: string) {
  // No longer needed with database-backed approach
}

export function useFillNotifications(network: Network) {
  const { primaryWallet, user } = useDynamicContext();
  const storeWalletAddress = useStore(s => s.walletAddress);
  const storeSelectedPairId = useStore(s => s.selectedPair?.id ?? null);
  const updateUserOrder = useStore(s => s.updateUserOrder);
  const seenWebsocketFillsRef = useRef<Set<number>>(new Set());
  const fillsWithTxHashRef = useRef<Set<number>>(new Set());
  const { soundEnabled } = useSettings();

  const walletAddress = primaryWallet?.address || storeWalletAddress || user?.verifiedCredentials?.[0]?.address;
  const addNotification = useNotificationStore((state) => state.addNotification);
  const orderNotificationStatusRef = useRef<Record<number, string>>({});

  const onTradeUpdate = useCallback((trade: TradeUpdatePayload) => {
    console.log('[useFillNotifications] onTradeUpdate called', { 
      trade, 
      walletAddress, 
      hasWallet: !!walletAddress 
    });
    
    if (!walletAddress) {
      console.log('[useFillNotifications] No wallet address, skipping notification');
      return;
    }
    
    const fillId = trade.id;
    const hasTxHash = !!trade.tx_hash;

    // CRITICAL: Check if we've already processed this fill BEFORE doing any validation
    // This prevents duplicate notifications when multiple WebSocket connections receive the same trade
    if (seenWebsocketFillsRef.current.has(fillId)) {
      console.log('[useFillNotifications] Fill already seen, skipping');
      return;
    }

    // Determine if the current user is the buyer or seller
    const normalizedWallet = walletAddress.toLowerCase();
    const normalizedMaker = trade.maker?.toLowerCase() || '';
    const normalizedTaker = trade.taker?.toLowerCase() || '';
    
    console.log('[useFillNotifications] User check', {
      normalizedWallet,
      normalizedMaker,
      normalizedTaker,
      side: trade.side
    });
    
    const takerIsBuyer = trade.side === 'buy';
    const userIsTaker = normalizedWallet === normalizedTaker;
    const userIsMaker = normalizedWallet === normalizedMaker;
    
    // CRITICAL FIX: If maker/taker fields are empty, assume this trade involves the user
    // This handles cases where WebSocket doesn't send maker/taker addresses
    const hasUserInfo = normalizedMaker || normalizedTaker;
    const userIsInvolved = !hasUserInfo || userIsTaker || userIsMaker;
    
    console.log('[useFillNotifications] Involvement check', {
      hasUserInfo,
      userIsTaker,
      userIsMaker,
      userIsInvolved
    });
    
    if (!userIsInvolved) {
      // User is definitely not involved in this trade
      console.log('[useFillNotifications] User not involved, skipping notification');
      return;
    }
    
    // Determine user's role
    let userIsBuyer = false;
    if (userIsTaker) {
      userIsBuyer = takerIsBuyer;
    } else if (userIsMaker) {
      userIsBuyer = !takerIsBuyer;
    } else {
      // Fallback: if we don't know user's role but they're involved, use trade side
      userIsBuyer = takerIsBuyer;
    }
    
    console.log('[useFillNotifications] User role determined', { userIsBuyer });
    console.log('[useFillNotifications] New fill, showing notification');
    
    // Mark as seen IMMEDIATELY before showing notification
    // This prevents race conditions when multiple handlers fire simultaneously
    seenWebsocketFillsRef.current.add(fillId);
    setCachedWebsocketFills(walletAddress, seenWebsocketFillsRef.current);
    
    // Play fill sound if enabled
    if (soundEnabled) {
      playFillSound();
    }

    showFillToastFromWebsocket(trade, network, walletAddress);

    // Also add to persistent notification bell
    const pairId = trade.pair_id;
    const storePair = pairId ? useStore.getState().pairs.find((p) => p.id === pairId) : undefined;
    const baseSymbol = storePair?.baseToken?.symbol || trade.base_symbol || 'base';
    const quoteSymbol = storePair?.quoteToken?.symbol || trade.quote_symbol || 'quote';
    const logoUrl = storePair?.baseToken?.logo ?? storePair?.logoUrl ?? '';
    const priceDisplay = trade.price_human || trade.price;
    const amountDisplay = trade.amount_human || trade.amount;

    // Add only the appropriate notification based on user's role
    if (userIsBuyer) {
      addNotification({
        type: 'fill',
        title: 'Buy order filled',
        body: `Bought ${amountDisplay} ${baseSymbol} at ${priceDisplay} ${quoteSymbol}`,
        logoUrl,
      });
    } else {
      addNotification({
        type: 'fill',
        title: 'Sell order filled',
        body: `Sold ${amountDisplay} ${baseSymbol} at ${priceDisplay} ${quoteSymbol}`,
        logoUrl,
      });
    }
    
    console.log('[useFillNotifications] Notification added successfully');

    if (hasTxHash && !fillsWithTxHashRef.current.has(fillId)) {
      fillsWithTxHashRef.current.add(fillId);
      setCachedFillsWithTxHash(walletAddress, fillsWithTxHashRef.current);
    }
  }, [walletAddress, network, soundEnabled, addNotification]);

  const onOrderUpdate = useCallback((order: OrderUpdatePayload) => {
    if (!walletAddress) return;
    
    updateUserOrder(order.id as any, {
      filledAmount: parseFloat(order.filled_amount),
      status: order.status as any,
    });

    // Check if this order belongs to the current user
    const normalizedWallet = walletAddress.toLowerCase();
    const normalizedOrderMaker = order.maker?.toLowerCase() || '';
    
    if (normalizedWallet !== normalizedOrderMaker) {
      // This order doesn't belong to the current user, don't show notification
      return;
    }

    const prevStatus = orderNotificationStatusRef.current[order.id];
    if (order.status !== prevStatus && ['filled', 'cancelled', 'expired'].includes(order.status)) {
      const storePair = useStore.getState().pairs.find((p) => p.id === order.pair_id);
      const base = storePair?.baseToken?.symbol ?? '';
      const quote = storePair?.quoteToken?.symbol ?? '';
      const logoUrl = storePair?.baseToken?.logo ?? storePair?.logoUrl ?? '';
      // Use the human-readable filled amount if available, otherwise raw
      const amount = order.filled_amount || order.amount;
      const isBuy = order.side === 'buy';

      // Only add notifications for cancelled and expired orders
      // Fill notifications are handled by onTradeUpdate to avoid duplicates
      if (order.status === 'cancelled') {
        const side = isBuy ? 'Buy' : 'Sell';
        addNotification({
          type: 'cancel',
          title: 'Order Cancelled',
          body: `${side} ${amount} ${base}/${quote} was cancelled`,
          logoUrl,
        });
      } else if (order.status === 'expired') {
        const side = isBuy ? 'Buy' : 'Sell';
        addNotification({
          type: 'cancel',
          title: 'Order Expired',
          body: `${side} ${amount} ${base}/${quote} expired`,
          logoUrl,
        });
      }

      orderNotificationStatusRef.current[order.id] = order.status;
    }
  }, [walletAddress, updateUserOrder, addNotification]);

  usePairWebsocket(storeSelectedPairId, { onTradeUpdate, onOrderUpdate });
  usePairWebsocket('all', { onTradeUpdate, onOrderUpdate });

  useEffect(() => {
    if (!walletAddress) return;

    let intervalId: ReturnType<typeof setInterval> | undefined;
    let isActive = true;

    const pollFillsForTxHash = async () => {
      if (!isActive) return;
      try {
        const response = await fetch(`/api/v1/fills/address/${walletAddress}?limit=50`);
        if (!response.ok) return;
        const data = await response.json();
        const fills: Fill[] = data.data || [];

        for (const fill of fills) {
          if (fill.tx_hash && !fillsWithTxHashRef.current.has(fill.id)) {
            showFillToastWithTxHash(fill, network, walletAddress);
            fillsWithTxHashRef.current.add(fill.id);
            setCachedFillsWithTxHash(walletAddress, fillsWithTxHashRef.current);
          }
        }
      } catch {
        // silently ignore
      }
    };

    fillsWithTxHashRef.current = getCachedFillsWithTxHash(walletAddress);
    seenWebsocketFillsRef.current = getCachedWebsocketFills(walletAddress);

    pollFillsForTxHash();
    // Poll at 5s to detect when a tx_hash appears on confirmed fills.
    intervalId = setInterval(pollFillsForTxHash, 5_000);

    return () => {
      isActive = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [network, walletAddress]);
}

// Export for use in order creation flow
export { addCachedUserOrderHash, addCachedUserOrderRef };
