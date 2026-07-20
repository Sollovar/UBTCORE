import { useState, useEffect, useCallback, useRef } from 'react';
import { useStore } from '../stores/useStore';
import { getOpenOrders, getHistoryOrders } from '../services/orderbook';
import type { Order, OrderWithPair } from '../types';

export function useUserOrders(address?: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { userOrders, setUserOrders } = useStore();
  const lastFetchTimeRef = useRef<number>(0);
  const pendingRefetchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchUserOrders = useCallback(async (force = false) => {
    if (!address) return;
    
    try {
      setLoading(true);
      const orders = await getOpenOrders(address);
      // Convert OrderWithPair[] to Order[] by extracting and transforming the order property
      const convertedOrders = (orders.data || []).map((orderWithPair: OrderWithPair) => {
        const backendOrder = orderWithPair.order;
        return {
          id: backendOrder.id.toString(),
          orderHash: backendOrder.order_hash,
          userId: backendOrder.user_id,
          network: backendOrder.network,
          pairId: backendOrder.pair_id,
          side: backendOrder.side,
          orderType: backendOrder.order_type,
          price: parseFloat(backendOrder.price),
          amount: parseFloat(backendOrder.amount),
          filledAmount: parseFloat(backendOrder.filled_amount),
          amountIn: parseFloat(backendOrder.amount_in),
          amountOutMin: parseFloat(backendOrder.amount_out_min),
          tokenIn: backendOrder.token_in,
          tokenOut: backendOrder.token_out,
          status: backendOrder.status,
          isLadder: backendOrder.is_ladder,
          maker: backendOrder.maker,
          nonce: backendOrder.nonce,
          ladderLevels: backendOrder.ladder_levels,
          ladderPriceStart: backendOrder.ladder_price_start ? parseFloat(backendOrder.ladder_price_start) : undefined,
          ladderPriceEnd: backendOrder.ladder_price_end ? parseFloat(backendOrder.ladder_price_end) : undefined,
          ladderParentId: backendOrder.ladder_parent_id,
          triggerPrice: backendOrder.trigger_price ? parseFloat(backendOrder.trigger_price) : undefined,
          isPostOnly: backendOrder.is_post_only,
          reduceOnly: backendOrder.reduce_only,
          timeInForce: backendOrder.time_in_force,
          stopLossType: backendOrder.stop_loss_type,
          createdAt: backendOrder.created_at,
          updatedAt: backendOrder.updated_at,
        };
      });
      setUserOrders(convertedOrders);
      lastFetchTimeRef.current = Date.now();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, [address, setUserOrders]);

  // Aggressive refetch for immediate updates
  const aggressiveRefetch = useCallback(async () => {
    if (pendingRefetchRef.current) {
      clearTimeout(pendingRefetchRef.current);
    }
    
    // If last fetch was recent (< 300ms), debounce
    const timeSinceLastFetch = Date.now() - lastFetchTimeRef.current;
    if (timeSinceLastFetch < 300) {
      pendingRefetchRef.current = setTimeout(() => {
        fetchUserOrders();
      }, 300 - timeSinceLastFetch);
    } else {
      // Fetch immediately if enough time has passed
      await fetchUserOrders();
    }
  }, [fetchUserOrders]);

  // Force immediate update
  const forceImmediateUpdate = useCallback(() => {
    fetchUserOrders(true);
  }, [fetchUserOrders]);

  // Initial fetch and periodic polling
  useEffect(() => {
    if (address) {
      fetchUserOrders();
      
      // Poll every 2 seconds for user orders
      const interval = setInterval(() => {
        fetchUserOrders();
      }, 2000);
      
      return () => {
        clearInterval(interval);
        if (pendingRefetchRef.current) {
          clearTimeout(pendingRefetchRef.current);
        }
      };
    }
  }, [address, fetchUserOrders]);

  return {
    userOrders,
    loading,
    error,
    refetch: fetchUserOrders,
    aggressiveRefetch,
    forceImmediateUpdate,
  };
}