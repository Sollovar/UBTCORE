import { useState, useEffect, useRef } from "react";
import type { Network } from "@/hooks/useConnectedNetwork";

export interface ChainStats {
  gasGwei:     string | null;
  blockNumber: string | null;
}

type SupportedNetwork = Extract<Network, "bsc" | "base" | "solana">;

const EVM_RPC: Partial<Record<SupportedNetwork, string>> = {
  bsc:  "https://bsc-dataseed.defibit.io/",
  base: "https://mainnet.base.org",
};

const SOLANA_RPC = "https://mainnet.helius-rpc.com/?api-key=95e28282-bc25-4e16-a828-b64668d06d35";

const POLL_MS = 10_000;

async function ethCall(url: string, method: string, params: unknown[] = []): Promise<string> {
  const res = await fetch(url, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal:  AbortSignal.timeout(6000),
  });
  const json = await res.json();
  return json.result as string;
}

async function fetchEvm(rpc: string): Promise<ChainStats> {
  const [gasHex, blockHex] = await Promise.all([
    ethCall(rpc, "eth_gasPrice"),
    ethCall(rpc, "eth_blockNumber"),
  ]);

  const weiNum   = BigInt(gasHex);
  const gweiNum  = Number(weiNum) / 1e9;
  const gasGwei  = gweiNum < 1
    ? gweiNum.toFixed(2)
    : gweiNum < 10
      ? gweiNum.toFixed(1)
      : Math.round(gweiNum).toString();

  const blockNum = Number(BigInt(blockHex));
  const blockStr = blockNum >= 1_000_000
    ? (blockNum / 1_000_000).toFixed(1) + "M"
    : blockNum.toLocaleString();

  return { gasGwei, blockNumber: blockStr };
}

async function fetchSolana(): Promise<ChainStats> {
  const res = await fetch(SOLANA_RPC, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getSlot", params: [] }),
    signal:  AbortSignal.timeout(6000),
  });
  const json = await res.json();
  const slot = json.result as number;
  const blockStr = slot >= 1_000_000
    ? (slot / 1_000_000).toFixed(1) + "M"
    : slot.toLocaleString();
  return { gasGwei: null, blockNumber: blockStr };
}

export function useChainStats(network: Network): ChainStats {
  const [stats, setStats] = useState<ChainStats>({ gasGwei: null, blockNumber: null });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const net = network as SupportedNetwork;

    async function poll() {
      try {
        const rpc = EVM_RPC[net];
        const next = rpc ? await fetchEvm(rpc) : await fetchSolana();
        setStats(next);
      } catch {
        // silently keep last known values
      }
    }

    setStats({ gasGwei: null, blockNumber: null });
    poll();
    timerRef.current = setInterval(poll, POLL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [network]);

  return stats;
}
