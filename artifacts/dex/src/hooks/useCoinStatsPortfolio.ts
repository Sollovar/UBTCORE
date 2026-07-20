import { useState, useEffect, useRef } from "react";
import type { Network } from "@/hooks/useConnectedNetwork";

export interface PortfolioHolding {
  symbol: string;
  name: string;
  icon: string;
  count: number;
  priceUsd: number;
  valueUsd: number;
  priceChange24h: number;
  unrealizedPnlUsd: number;
  unrealizedPnlPct: number;
  realizedPnlUsd: number;
  allTimePnlUsd: number;
  avgBuyPrice: number;
}

export interface PortfolioSummary {
  totalValueUsd: number;
  totalCostUsd: number;
  unrealizedPnlUsd: number;
  realizedPnlUsd: number;
  allTimePnlUsd: number;
  pnl24hUsd: number;
  pnl24hPct: number;
}

export interface CoinStatsPortfolioData {
  holdings: PortfolioHolding[];
  summary: PortfolioSummary;
  loading: boolean;
  syncing: boolean;
  error: string | null;
  refetch: () => void;
}

const EMPTY_SUMMARY: PortfolioSummary = {
  totalValueUsd: 0,
  totalCostUsd: 0,
  unrealizedPnlUsd: 0,
  realizedPnlUsd: 0,
  allTimePnlUsd: 0,
  pnl24hUsd: 0,
  pnl24hPct: 0,
};

const ZERION_API_KEY = "zk_7c524466af0c419f818079e013fd34ee";
const ZERION_API_BASE = "https://api.zerion.io";

// Map our network names to Zerion chain IDs
const NETWORK_TO_ZERION_CHAIN: Record<string, string> = {
  ethereum: "ethereum",
  bsc: "binance-smart-chain",
  base: "base",
  solana: "solana",
  arbitrum: "arbitrum",
  optimism: "optimism",
  polygon: "polygon",
  avalanche: "avalanche-c",
};

async function fetchPositionsFromZerion(address: string, network: string) {
  try {
    const chainId = NETWORK_TO_ZERION_CHAIN[network];
    
    if (!chainId) {
      console.log(`[Zerion] Network ${network} not supported`);
      return { data: [] };
    }
    
    console.log(`[Zerion] Fetching positions for ${network} (chain: ${chainId}), wallet: ${address}`);
    
    // Use Zerion's positions endpoint to get individual token holdings
    const url = `${ZERION_API_BASE}/v1/wallets/${address}/positions/?filter[positions]=only_simple&currency=usd&filter[chain_ids]=${chainId}&sort=value`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "accept": "application/json",
        "authorization": `Basic ${btoa(ZERION_API_KEY + ':')}`,
      },
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error(`[Zerion] API error ${response.status}:`, errorText);
      
      if (response.status === 429) {
        throw new Error(`Rate limit exceeded. Please try again later.`);
      }
      
      throw new Error(`Zerion API error: ${response.status}`);
    }

    const result = await response.json();
    const positionsCount = result?.data?.length ?? 0;
    
    console.log(`[Zerion] Success for ${network}, ${positionsCount} positions found`);
    
    return result;
  } catch (err: any) {
    console.error(`[Zerion] Failed to fetch positions for ${network}:`, err.message);
    throw err;
  }
}

function mapZerionPositions(raw: any): { holdings: PortfolioHolding[]; summary: PortfolioSummary } {
  const positions = raw?.data ?? [];
  
  let totalValue = 0;
  
  const holdings: PortfolioHolding[] = positions
    .map((position: any) => {
      const posAttrs = position.attributes ?? {};
      const fungible = posAttrs.fungible_info ?? {};
      const quantity = posAttrs.quantity ?? {};
      const changes = posAttrs.changes ?? {};
      
      const valueUsd = posAttrs.value ?? 0;
      totalValue += valueUsd;
      
      return {
        symbol: fungible.symbol ?? "?",
        name: fungible.name ?? fungible.symbol ?? "Unknown",
        icon: fungible.icon?.url ?? "",
        count: parseFloat(quantity.numeric ?? "0"),
        priceUsd: posAttrs.price ?? 0,
        valueUsd: valueUsd,
        priceChange24h: changes.percent_1d ?? 0,
        unrealizedPnlUsd: 0, // Not provided in positions endpoint
        unrealizedPnlPct: 0,
        realizedPnlUsd: 0,
        allTimePnlUsd: 0,
        avgBuyPrice: 0,
      };
    })
    .filter((h: PortfolioHolding) => h.valueUsd > 0.01) // Filter out dust
    .sort((a: PortfolioHolding, b: PortfolioHolding) => b.valueUsd - a.valueUsd);

  const summary: PortfolioSummary = {
    totalValueUsd: totalValue,
    totalCostUsd: 0, // Not provided
    unrealizedPnlUsd: 0,
    realizedPnlUsd: 0,
    allTimePnlUsd: 0,
    pnl24hUsd: 0,
    pnl24hPct: 0,
  };

  return { holdings, summary };
}

export function useCoinStatsPortfolio(
  address: string | null,
  network: Network,
  enabled: boolean = true  // ✅ NEW: Control whether to load portfolio
): CoinStatsPortfolioData {
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const cancelledRef = useRef(false);

  const refetch = () => setTick((t) => t + 1);

  useEffect(() => {
    // ✅ NEW: Don't load if disabled or no address
    if (!enabled || !address) {
      setHoldings([]);
      setSummary(EMPTY_SUMMARY);
      setLoading(false);
      setError(null);
      return;
    }

    cancelledRef.current = false;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        // Fetch positions (individual tokens) from Zerion
        const raw = await fetchPositionsFromZerion(address!, network);
        if (cancelledRef.current) return;

        const mapped = mapZerionPositions(raw);
        setHoldings(mapped.holdings);
        setSummary(mapped.summary);
        setError(null);
      } catch (err: any) {
        if (!cancelledRef.current) {
          console.error("Portfolio fetch error:", err);
          setError(err?.message ?? "Failed to load portfolio");
        }
      } finally {
        if (!cancelledRef.current) {
          setLoading(false);
          setSyncing(false);
        }
      }
    }

    load();

    return () => {
      cancelledRef.current = true;
    };
  }, [address, network, tick, enabled]);  // ✅ NEW: Added enabled to dependencies

  return { holdings, summary, loading, syncing, error, refetch };
}
