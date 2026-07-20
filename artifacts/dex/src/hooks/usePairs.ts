import { useState, useEffect, useRef } from 'react';
import { getPairs } from '../services/pairs';
import { useStore } from '../stores/useStore';
import { useConnectedNetwork } from './useConnectedNetwork';

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS        = 30;

export function usePairs() {
  const { pairs, pairsLoaded, pairsNetwork, setPairs, setPairsLoaded } = useStore();

  // Resolve the network: connected wallet → fallback 'bsc'
  const connectedNetwork = useConnectedNetwork();
  const network = connectedNetwork || 'bsc';

  // Pairs are considered stale when the network changed since last fetch
  const needsFetch = !pairsLoaded || pairsNetwork !== network;

  const [loading, setLoading] = useState(() => needsFetch);
  const [error, setError]     = useState<string | null>(null);

  const pollCount = useRef(0);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Already have pairs for this network — nothing to do
    if (!needsFetch) {
      setLoading(false);
      return;
    }

    // Mark stale immediately so UI shows loading on network switch
    setLoading(true);
    setError(null);
    pollCount.current = 0;

    let cancelled = false;

    async function fetchPairs() {
      try {
        const data = await getPairs(network);
        if (cancelled) return;

        if (data.length > 0) {
          setPairs(data, network);   // sets pairsLoaded + pairsNetwork
          setLoading(false);
          pollCount.current = 0;
          return;
        }

        // Empty — backend cache may still be warming up. Keep polling.
        if (pollCount.current < MAX_POLLS) {
          pollCount.current += 1;
          timerRef.current = setTimeout(fetchPairs, POLL_INTERVAL_MS);
        } else {
          // Gave up — store empty list so UI shows "no pairs"
          setPairs([], network);
          setLoading(false);
        }
      } catch (err) {
        if (cancelled) return;
        if (pollCount.current < MAX_POLLS) {
          pollCount.current += 1;
          timerRef.current = setTimeout(fetchPairs, POLL_INTERVAL_MS);
        } else {
          setError(err instanceof Error ? err.message : 'Failed to fetch pairs');
          setLoading(false);
        }
      }
    }

    fetchPairs();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // Re-run when the effective network changes (wallet connect/switch triggers this)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [network, pairsLoaded, pairsNetwork]);

  return { pairs, loading, error, network };
}
