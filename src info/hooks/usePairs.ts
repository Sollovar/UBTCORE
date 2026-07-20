import { useState, useEffect } from 'react';
import type { Pair } from '../types';
import { getTrendingPairs } from '../services/pairs';
import { useStore } from '../stores/useStore';
import { useConnectedNetwork } from './useConnectedNetwork';

export function usePairs() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { pairs, setPairs } = useStore();
  const connectedNetwork = useConnectedNetwork();

  useEffect(() => {
    async function fetchPairs() {
      try {
        setLoading(true);
        const data = await getTrendingPairs(connectedNetwork);
        setPairs(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch pairs');
      } finally {
        setLoading(false);
      }
    }

    fetchPairs();
  }, [setPairs, connectedNetwork]);

  return { pairs, loading, error };
}
