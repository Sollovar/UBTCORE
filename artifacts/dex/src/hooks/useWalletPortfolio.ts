import { useState, useEffect, useRef } from "react";
import type { Network } from "@/hooks/useConnectedNetwork";

export interface PortfolioData {
  balance:        string;   // e.g. "0.4231"
  balanceUsd:     string;   // e.g. "253.48"
  changePercent:  number;   // 24h change %, e.g. 2.4 or -1.8
  symbol:         string;   // "BNB" | "ETH" | "SOL"
  loading:        boolean;
  error:          boolean;
}

type SupportedNetwork = Extract<Network, "bsc" | "base" | "solana">;

const EVM_RPC: Partial<Record<SupportedNetwork, string>> = {
  bsc:  "https://bsc-dataseed.binance.org/",
  base: "https://mainnet.base.org",
};

const SOLANA_RPC = "https://api.mainnet-beta.solana.com";

const TOKEN_META: Record<SupportedNetwork, { symbol: string; geckoId: string }> = {
  bsc:    { symbol: "BNB", geckoId: "binancecoin" },
  base:   { symbol: "ETH", geckoId: "ethereum"    },
  solana: { symbol: "SOL", geckoId: "solana"      },
};

const POLL_MS = 30_000;

async function fetchEvmBalance(rpc: string, address: string): Promise<number> {
  const res = await fetch(rpc, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [address, "latest"] }),
    signal:  AbortSignal.timeout(6000),
  });
  const { result } = await res.json();
  return Number(BigInt(result)) / 1e18;
}

async function fetchSolBalance(address: string): Promise<number> {
  const res = await fetch(SOLANA_RPC, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getBalance", params: [address] }),
    signal:  AbortSignal.timeout(6000),
  });
  const { result } = await res.json();
  return (result?.value ?? 0) / 1e9;
}

async function fetchPrice(geckoId: string): Promise<{ usd: number; usd_24h_change: number }> {
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${geckoId}&vs_currencies=usd&include_24hr_change=true`,
    { signal: AbortSignal.timeout(8000) }
  );
  const json = await res.json();
  return {
    usd:            json[geckoId]?.usd            ?? 0,
    usd_24h_change: json[geckoId]?.usd_24h_change ?? 0,
  };
}

export function useWalletPortfolio(
  address: string | null,
  network: Network
): PortfolioData {
  const [data, setData] = useState<PortfolioData>({
    balance: "—", balanceUsd: "—", changePercent: 0,
    symbol: "BNB", loading: true, error: false,
  });

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!address) {
      setData(d => ({ ...d, loading: false }));
      return;
    }

    const net = network as SupportedNetwork;
    const meta = TOKEN_META[net] ?? TOKEN_META["bsc"];

    let cancelled = false;

    async function load() {
      setData(d => ({ ...d, loading: true, error: false }));
      try {
        // Fetch balance and price in parallel
        const balancePromise = net === "solana"
          ? fetchSolBalance(address!)
          : fetchEvmBalance(EVM_RPC[net]!, address!);

        const pricePromise = fetchPrice(meta.geckoId);

        const [rawBalance, priceData] = await Promise.all([balancePromise, pricePromise]);

        if (cancelled) return;

        const usdValue = rawBalance * priceData.usd;

        setData({
          balance:       rawBalance < 0.0001 ? "0.0000" : rawBalance.toFixed(rawBalance < 0.01 ? 6 : 4),
          balanceUsd:    usdValue.toFixed(2),
          changePercent: Number(priceData.usd_24h_change.toFixed(2)),
          symbol:        meta.symbol,
          loading:       false,
          error:         false,
        });
      } catch {
        if (!cancelled) setData(d => ({ ...d, loading: false, error: true }));
      }
    }

    load();
    const id = setInterval(load, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [address, network]);

  return data;
}
