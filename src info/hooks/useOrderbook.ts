import { useState, useEffect, useCallback, useRef } from 'react';
import type { Orderbook } from '../types';
import { getOrderbook } from '../services/orderbook';
import { useStore } from '../stores/useStore';

export function useOrderbook(pairId: string | null) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { orderbook, setOrderbook } = useStore();
  const lastFetchTimeRef = useRef<number>(0);
  const pendingRefetchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const immediateUpdateRef = useRef<boolean>(false);

  const fetchOrderbook = useCallback(async (force = false) => {
    if (!pairId) return;
    
    try {
      setLoading(true);
      const data = await getOrderbook(pairId);
      setOrderbook(data);
      lastFetchTimeRef.current = Date.now();
      immediateUpdateRef.current = false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orderbook');
    } finally {
      setLoading(false);
    }
  }, [pairId, setOrderbook]);

  // Aggressive refetch - fetch immediately with debounce
  const aggressiveRefetch = useCallback(async () => {
    if (pendingRefetchRef.current) {
      clearTimeout(pendingRefetchRef.current);
    }
    
    // If last fetch was recent (< 200ms), debounce
    const timeSinceLastFetch = Date.now() - lastFetchTimeRef.current;
    if (timeSinceLastFetch < 200) {
      pendingRefetchRef.current = setTimeout(() => {
        fetchOrderbook();
      }, 200 - timeSinceLastFetch);
    } else {
      // Fetch immediately if enough time has passed
      await fetchOrderbook();
    }
  }, [fetchOrderbook]);

  // Force immediate update
  const forceImmediateUpdate = useCallback(() => {
    if (!immediateUpdateRef.current) {
      immediateUpdateRef.current = true;
      fetchOrderbook(true);
    }
  }, [fetchOrderbook]);

  useEffect(() => {
    fetchOrderbook();
    // Poll every 500ms instead of 1 second for faster updates
    const interval = setInterval(() => {
      fetchOrderbook();
    }, 500);
    return () => {
      clearInterval(interval);
      if (pendingRefetchRef.current) {
        clearTimeout(pendingRefetchRef.current);
      }
    };
  }, [fetchOrderbook]);

  return { orderbook, loading, error, refetch: fetchOrderbook, aggressiveRefetch, forceImmediateUpdate };
}