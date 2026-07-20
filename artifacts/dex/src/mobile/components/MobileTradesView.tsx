import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { LiveMarketState } from "@/hooks/useLiveMarket";
import { usePairWebsocket, TradeUpdatePayload } from "@/hooks/usePairWebsocket";
import { getTrades, getUserFillsForPair, type UserFillTrade } from "@/services/orderbook";
import { getExplorerTxUrl } from "@/utils/contracts";
import type { Network } from "@/utils/contracts";
import { useStore } from "@/stores/useStore";
import { formatAmount } from "@/utils/amount";
import { useTranslation } from "@/i18n/i18n";

interface Props {
  market: LiveMarketState;
  pairId?: string;
}

interface Trade {
  id: string;
  price: number;
  size: number;
  isBuy: boolean;
  time: string;
  timeMs: number;
  txHash?: string;
  txHashBuy?: string;
  txHashSell?: string;
}

function fmtPrice(n: number) {
  if (!Number.isFinite(n)) return "0";
  // Better decimal handling for small prices (matches desktop)
  if (n >= 1000) {
    return n.toLocaleString("en-US", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  }
  if (n >= 1) return n.toFixed(4);
  if (n >= 0.0001) return n.toFixed(6);
  return n.toFixed(8);
}

function fmtSize(n: number) {
  if (!Number.isFinite(n)) return "0";
  if (n >= 10000) return (n / 1000).toFixed(2) + "K";
  if (n >= 1000)  return n.toFixed(0);
  if (n >= 1)     return n.toFixed(2);
  if (n >= 0.0001) return n.toFixed(4);
  return n.toFixed(6);
}

function normalizeTradeSize(rawAmount: unknown, decimals: number): number {
  if (rawAmount == null || rawAmount === "") return 0;

  if (typeof rawAmount === "string") {
    const trimmed = rawAmount.trim();
    if (trimmed === "" || trimmed === "0") return 0;

    // If amount_human is provided and looks like a proper decimal, use it directly
    const parsed = parseFloat(trimmed);
    if (Number.isFinite(parsed) && trimmed.includes('.')) {
      return parsed;
    }

    // If it's a pure integer string (no decimal point) and decimals > 0,
    // it's a raw on-chain amount (wei / lamports / etc.) — convert it.
    // This covers Solana (9 decimals, e.g. "15000000" = 0.015 SOL)
    // and EVM tokens (18 decimals) regardless of string length.
    if (/^-?\d+$/.test(trimmed) && decimals > 0) {
      return parseFloat(formatAmount(trimmed, decimals, 6));
    }

    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (typeof rawAmount === "number") {
    return Number.isFinite(rawAmount) ? rawAmount : 0;
  }

  const parsed = parseFloat(String(rawAmount));
  return Number.isFinite(parsed) ? parsed : 0;
}

function nowTime() {
  return new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function toTime(raw: string | number): string {
  try {
    const d = typeof raw === "number"
      ? new Date(raw > 1e10 ? raw : raw * 1000)
      : new Date(raw);
    return d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return nowTime();
  }
}

const ROW_H = 34;

export function MobileTradesView({ pairId }: Props) {
  const { t } = useTranslation();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const network = useStore(s => s.network) as Network;
  const selectedPair = useStore(s => s.selectedPair);
  const pairs = useStore(s => s.pairs);
  const walletAddress = useStore(s => s.walletAddress);
  const resolvedPairId = pairId ?? selectedPair?.id ?? undefined;
  const activePair = selectedPair?.id === resolvedPairId ? selectedPair : pairs.find((p) => p.id === resolvedPairId);
  const baseSymbol = activePair?.baseToken?.symbol ?? "—";
  const fallbackDecimals = activePair?.baseToken?.decimals ?? 18;
  const explorerNetwork = (activePair?.network as Network) ?? network;

  useEffect(() => {
    if (!resolvedPairId) {
      setLoading(false);
      return;
    }

    let isActive = true;

    const loadTrades = async () => {
      setLoading(true);
      try {
        const [pairTrades, userFills] = await Promise.all([
          getTrades(resolvedPairId, 50),
          walletAddress ? getUserFillsForPair(walletAddress, resolvedPairId, 50) : Promise.resolve([] as UserFillTrade[]),
        ]);

        if (!isActive) return;

        const byKey = new Map<string, Trade>();
        const addTrade = (incoming: Trade) => {
          const key = incoming.id;
          if (!byKey.has(key)) {
            byKey.set(key, incoming);
          }
        };

        pairTrades.forEach((t) => {
          const rawTime = typeof t.time === "number" ? t.time : Date.parse(String(t.time || ""));
          // ALWAYS use amount_human if available - it's already correctly formatted
          const size = t.amount_human 
            ? parseFloat(t.amount_human)
            : normalizeTradeSize(t.amount, typeof (t as any).decimals === "number" ? (t as any).decimals : fallbackDecimals);
          
          addTrade({
            id: String(t.id),
            price: typeof t.price === "number" ? t.price : parseFloat(t.price as any),
            size: Number.isFinite(size) ? size : 0,
            isBuy: t.side === "buy",
            time: toTime(t.time as any),
            timeMs: Number.isFinite(rawTime) ? rawTime : Date.now(),
            txHash: t.tx_hash,
            txHashBuy: t.tx_hash_buy,
            txHashSell: t.tx_hash_sell,
          });
        });

        userFills.forEach((fill) => {
          const rawTime = Date.parse(fill.time || "");
          // ALWAYS use amount directly from userFills - it's already human-readable
          const size = fill.amount; // Already a number, already human-readable
          addTrade({
            id: fill.id,
            price: fill.price,
            size: Number.isFinite(size) ? size : 0,
            isBuy: fill.side === "buy",
            time: fill.time ? toTime(fill.time) : nowTime(),
            timeMs: Number.isFinite(rawTime) ? rawTime : Date.now(),
            txHash: fill.txHash,
            txHashBuy: fill.txHashBuy,
            txHashSell: fill.txHashSell,
          });
        });

        const merged = Array.from(byKey.values()).sort((a, b) => b.timeMs - a.timeMs);
        setTrades(merged.slice(0, 100));
      } catch {
        if (isActive) setTrades([]);
      } finally {
        if (isActive) setLoading(false);
      }
    };

    loadTrades();
    // No polling — new trades are pushed in real time via the WebSocket onTradeUpdate handler below

    return () => {
      isActive = false;
    };
  }, [resolvedPairId, walletAddress]);

  usePairWebsocket(resolvedPairId ?? null, {
    onTradeUpdate: (trade: TradeUpdatePayload) => {
      // ALWAYS use amount_human or price_human if available
      const price = trade.price_human
        ? parseFloat(trade.price_human)
        : parseFloat(trade.price);
      const size = trade.amount_human
        ? parseFloat(trade.amount_human)
        : normalizeTradeSize(trade.amount, trade.decimals ?? fallbackDecimals);
      
      const incoming: Trade = {
        id: String(trade.id),
        price: isNaN(price) ? 0 : price,
        size: isNaN(size) ? 0 : size,
        isBuy: trade.side === "buy",
        time: nowTime(),
        timeMs: Date.now(),
        txHash: trade.tx_hash,
        txHashBuy: trade.tx_hash_buy,
        txHashSell: trade.tx_hash_sell,
      };
      setTrades((prev) => {
        if (prev.some((t) => t.id === incoming.id)) return prev;
        return [incoming, ...prev.slice(0, 99)];
      });
    },
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ backgroundColor: "var(--m-bg)" }}>
        <div
          className="w-5 h-5 rounded-full border-2 animate-spin"
          style={{ borderColor: "var(--m-fg-5)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ backgroundColor: "var(--m-bg)" }}>
      <div
        className="grid px-4 text-[11px] font-semibold shrink-0"
        style={{
          gridTemplateColumns: "1fr 1fr 1fr",
          height: 34,
          color: "var(--m-fg-4)",
          borderBottom: "1px solid var(--m-bdr-subtle)",
        }}
      >
        <div className="flex items-center">{t('trade.price')}</div>
        <div className="flex items-center justify-end">{t('trade.size')} ({baseSymbol})</div>
        <div className="flex items-center justify-end">Time</div>
      </div>

      {trades.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-2">
          <p className="text-[12px]" style={{ color: "var(--m-fg-4)" }}>No trades yet</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {trades.map((t) => {
            const txUrls: Array<{ hash: string; title: string }> = [];
            const addedHashes = new Set<string>();
            const addTxUrl = (hash: string | undefined, title: string) => {
              if (!hash || addedHashes.has(hash)) return;
              addedHashes.add(hash);
              txUrls.push({ hash, title });
            };

            if (t.txHashBuy || t.txHashSell) {
              addTxUrl(t.txHashBuy, 'Buy Tx');
              addTxUrl(t.txHashSell, 'Sell Tx');
            } else {
              addTxUrl(t.txHash, 'Tx');
            }

            const explorerUrls = txUrls.map((entry) => ({
              url: getExplorerTxUrl(explorerNetwork, entry.hash),
              title: entry.title,
            }));
            return (
              <div
                key={t.id}
                className="grid px-4"
                style={{
                  gridTemplateColumns: "1fr 1fr 1fr",
                  height: ROW_H,
                  borderBottom: "1px solid var(--m-bg-1)",
                }}
              >
                <div
                  className="flex items-center tabular-nums text-[13px] font-medium"
                  style={{ color: t.isBuy ? "#00c853" : "#ff1744" }}
                >
                  {fmtPrice(t.price)}
                </div>
                <div
                  className="flex items-center justify-end tabular-nums text-[12px]"
                  style={{ color: "var(--m-fg-3)" }}
                >
                  {fmtSize(t.size)}
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  <span className="tabular-nums text-[12px]" style={{ color: "var(--m-fg-4)" }}>
                    {t.time}
                  </span>
                  {explorerUrls.length > 0 ? (
                    explorerUrls.map(({ url, title }, index) => (
                      <a
                        key={`${t.id}-${index}`}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={title}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex"
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" style={{ color: "#f5c518" }} />
                      </a>
                    ))
                  ) : (
                    <ExternalLink className="w-3 h-3 shrink-0" style={{ color: "var(--m-fg-6, var(--m-fg-5))" }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
