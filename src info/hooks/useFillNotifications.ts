import { useEffect, useRef } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useStore } from '../stores/useStore';
import { useToast } from '../components/common/Toast';
import { getExplorerTxUrl, Network } from '../utils/contracts';
import { usePairWebsocket, TradeUpdatePayload, OrderUpdatePayload } from './usePairWebsocket';

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
}

// Helper to manage fills seen via websocket (immediate, unconfirmed)
function getCachedWebsocketFills(walletAddress: string): Set<number> {
  try {
    const key = `cexdex-ws-fills-${walletAddress.toLowerCase()}`;
    const stored = localStorage.getItem(key);
    return new Set(stored ? JSON.parse(stored) : []);
  } catch {
    return new Set();
  }
}

function setCachedWebsocketFills(walletAddress: string, ids: Set<number>) {
  try {
    const key = `cexdex-ws-fills-${walletAddress.toLowerCase()}`;
    localStorage.setItem(key, JSON.stringify(Array.from(ids)));
  } catch (e) {
    console.error('Failed to save websocket fills to localStorage:', e);
  }
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

function showFillToastFromWebsocket(
  trade: TradeUpdatePayload,
  network: Network,
  showToast: any
) {
  const priceDisplay = trade.price_human || trade.price;
  const amountDisplay = trade.amount_human || trade.amount;
  const pairId = trade.pair_id;
  const storePair = pairId ? useStore.getState().pairs.find((p) => p.id === pairId) : undefined;
  const baseSymbol = storePair?.baseToken?.symbol || 'base';
  const quoteSymbol = storePair?.quoteToken?.symbol || 'quote';

  let description: string;
  let linkUrl: string | null = null;
  let linkLabel: string | null = null;
  const hash = getTradeExplorerHash(trade);

  if (hash) {
    linkUrl = getExplorerTxUrl(network, hash);
    linkLabel = network === 'bsc'
      ? 'View on BscScan'
      : network === 'base'
        ? 'View on BaseScan'
        : 'View on Solana Explorer';
    description = `Filled ${amountDisplay} ${baseSymbol} at ${priceDisplay} ${quoteSymbol}. View transaction on the explorer.`;
  } else {
    description = `Filled ${amountDisplay} ${baseSymbol} at ${priceDisplay} ${quoteSymbol}. Transaction is being processed...`;
  }

  showToast({
    title: hash ? 'Transaction confirmed' : 'Order filled',
    description,
    linkUrl,
    linkLabel,
    variant: 'success',
  });
}

// Helper to show confirmed fill notification with blockchain link
function showFillToastWithTxHash(
  fill: Fill,
  network: Network,
  showToast: any
) {
  const hash = getTradeExplorerHash(fill);
  const linkUrl = hash ? getExplorerTxUrl(network, hash) : null;
  const linkLabel = network === 'bsc'
    ? 'View on BscScan'
    : network === 'base'
      ? 'View on BaseScan'
      : 'View on Solana Explorer';
  const description = `Your fill is now confirmed on blockchain. Filled ${fill.amount_human} ${fill.base_symbol} at ${fill.price_human} ${fill.quote_symbol}. View transaction on the explorer.`;

  showToast({
    title: 'Transaction confirmed',
    description,
    linkUrl,
    linkLabel,
    variant: 'success',
  });
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
  const storeSelectedPairId = useStore(s => s.selectedPairId);
  const updateUserOrder = useStore(s => s.updateUserOrder);
  const { showToast } = useToast();
  const seenWebsocketFillsRef = useRef<Set<number>>(new Set());
  const fillsWithTxHashRef = useRef<Set<number>>(new Set());

  const walletAddress = primaryWallet?.address || storeWalletAddress || user?.verifiedCredentials?.[0]?.address;

   // Track trade updates received via websocket
   const onTradeUpdate = (trade: TradeUpdatePayload) => {
     if (!walletAddress) return;

     const fillId = trade.id;
     const hasTxHash = !!trade.tx_hash;

     if (!seenWebsocketFillsRef.current.has(fillId)) {
       showFillToastFromWebsocket(trade, network, showToast);
       seenWebsocketFillsRef.current.add(fillId);
       setCachedWebsocketFills(walletAddress, seenWebsocketFillsRef.current);
     }

     if (hasTxHash && !fillsWithTxHashRef.current.has(fillId)) {
       fillsWithTxHashRef.current.add(fillId);
       setCachedFillsWithTxHash(walletAddress, fillsWithTxHashRef.current);
     }
   };

   // Handle order updates from websocket to update data columns in real-time
   const onOrderUpdate = (order: OrderUpdatePayload) => {
     // Convert backend order ID (number) to string to match frontend Order type
     const orderIdStr = String(order.id);
     updateUserOrder(parseInt(orderIdStr) as any, {
       filledAmount: parseFloat(order.filled_amount),
       status: order.status as any,
     });
   };

  // Use websocket for immediate fill notifications on selected pair
  usePairWebsocket(storeSelectedPairId, {
    onTradeUpdate,
    onOrderUpdate,
  });

  // Also subscribe to the global feed so users receive fill notifications
  // even when they're not viewing the specific pair page.
  usePairWebsocket('all', {
    onTradeUpdate,
    onOrderUpdate,
  });

  // Poll database periodically for tx_hash confirmations (much less frequently)
  useEffect(() => {
    if (!walletAddress) {
      return;
    }

    let intervalId: ReturnType<typeof setInterval> | undefined;
    let isActive = true;

    const pollFillsForTxHash = async () => {
      if (!isActive) return;
      try {
        const response = await fetch(`/api/v1/fills/address/${walletAddress}?limit=50`);
        if (!response.ok) {
          console.error('Failed to fetch fills:', response.statusText);
          return;
        }

        const data = await response.json();
        const fills: Fill[] = data.data || [];

        // Check for fills that now have tx_hash
        for (const fill of fills) {
          const hasTxHash = !!fill.tx_hash;
          const previouslyHadTxHashFlag = fillsWithTxHashRef.current.has(fill.id);

          if (hasTxHash && !previouslyHadTxHashFlag) {
            // Show updated toast with tx_hash
            showFillToastWithTxHash(fill, network, showToast);
            fillsWithTxHashRef.current.add(fill.id);
            setCachedFillsWithTxHash(walletAddress, fillsWithTxHashRef.current);
          }
        }
      } catch (error) {
        console.error('🔔 Failed to poll fills for tx_hash:', error);
      }
    };

    // Load cached tx_hash fills immediately
    const initialFillsWithTxHash = getCachedFillsWithTxHash(walletAddress);
    fillsWithTxHashRef.current = initialFillsWithTxHash;

    // Load cached websocket fills
    const initialWebsocketFills = getCachedWebsocketFills(walletAddress);
    seenWebsocketFillsRef.current = initialWebsocketFills;

    // Poll for tx_hash confirmations every 5 seconds (much faster than before)
    pollFillsForTxHash();
    intervalId = setInterval(pollFillsForTxHash, 5000);

    return () => {
      isActive = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [network, walletAddress, showToast]);
}

// Export for use in order creation flow
export { addCachedUserOrderHash, addCachedUserOrderRef };
