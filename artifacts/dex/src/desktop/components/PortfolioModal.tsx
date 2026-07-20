import { TrendingUp, TrendingDown, Wallet, RefreshCw, X } from "lucide-react";
import { DynamicConnectButton, useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useConnectedNetwork } from "@/hooks/useConnectedNetwork";
import { useCoinStatsPortfolio, type PortfolioHolding } from "@/hooks/useCoinStatsPortfolio";
import { useTranslation } from "@/i18n/i18n";

function Skeleton({ w, h }: { w: number | string; h: number }) {
  return (
    <div
      className="animate-pulse rounded-xl"
      style={{ width: w, height: h, backgroundColor: "#1a1a1a" }}
    />
  );
}

function NoWalletState({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16">
      <div
        className="w-28 h-28 rounded-full flex items-center justify-center"
        style={{ background: "rgba(245,197,24,0.08)", border: "2px solid rgba(245,197,24,0.2)" }}
      >
        <Wallet className="w-12 h-12" style={{ color: "#f5c518" }} />
      </div>
      <div className="text-center">
        <p className="text-[22px] font-bold mb-2 text-white">{t('account.noWallet.title')}</p>
        <p className="text-[14px] leading-relaxed text-[#888] max-w-md">
          {t('portfolio.noWallet.sub')}
        </p>
      </div>
      <DynamicConnectButton buttonContainerClassName="UNBOUND-connect-wrap">
        <button
          style={{
            backgroundColor: "#f5c518", color: "#000", fontWeight: 700,
            fontSize: 15, paddingLeft: 36, paddingRight: 36, height: 48,
            borderRadius: 12, display: "flex", alignItems: "center",
            border: "none", cursor: "pointer", gap: 10,
          }}
        >
          <Wallet className="w-5 h-5" />
          {t('account.connectWallet')}
        </button>
      </DynamicConnectButton>
    </div>
  );
}

function HoldingRow({ h, isLast }: { h: PortfolioHolding; isLast: boolean }) {
  const isUp = h.priceChange24h >= 0;
  const pnlUp = h.unrealizedPnlUsd >= 0;
  const fmt = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div
      className="flex items-center justify-between px-5 py-4 hover:bg-[#0a0a0a] transition-colors"
      style={{ borderBottom: isLast ? "none" : "1px solid #1a1a1a" }}
    >
      <div className="flex items-center gap-3">
        {h.icon ? (
          <img
            src={h.icon}
            alt={h.symbol}
            className="w-10 h-10 rounded-full"
            onError={(e) => {
              const el = e.target as HTMLImageElement;
              el.style.display = "none";
              el.nextElementSibling?.removeAttribute("style");
            }}
          />
        ) : null}
        <div
          style={{
            width: 40, height: 40, borderRadius: 12,
            backgroundColor: "rgba(245,197,24,0.10)",
            border: "1px solid rgba(245,197,24,0.18)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, ...(h.icon ? { display: "none" } : {}),
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 800, color: "#f5c518" }}>
            {h.symbol.slice(0, 2)}
          </span>
        </div>
        <div>
          <p className="text-[15px] font-bold text-white">{h.symbol}</p>
          <p className="text-[12px] text-[#666]">
            {h.count < 0.0001 ? h.count.toExponential(2) : h.count.toFixed(h.count < 0.01 ? 6 : 4)} • avg ${fmt(h.avgBuyPrice)}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1">
        <p className="text-[15px] font-bold text-white tabular-nums">
          ${fmt(h.valueUsd)}
        </p>
        <div className="flex items-center gap-1.5">
          {isUp
            ? <TrendingUp className="w-3 h-3" style={{ color: "#22c55e" }} />
            : <TrendingDown className="w-3 h-3" style={{ color: "#ef4444" }} />}
          <span className="text-[12px] font-semibold tabular-nums" style={{ color: isUp ? "#22c55e" : "#ef4444" }}>
            {isUp ? "+" : ""}{h.priceChange24h.toFixed(2)}%
          </span>
        </div>
        <p className="text-[12px] font-semibold tabular-nums" style={{ color: pnlUp ? "#22c55e" : "#ef4444" }}>
          PnL: {pnlUp ? "+" : ""}${fmt(h.unrealizedPnlUsd)}
        </p>
      </div>
    </div>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function PortfolioModal({ open, onClose }: Props) {
  const { primaryWallet } = useDynamicContext();
  const network = useConnectedNetwork();
  const address = primaryWallet?.address ?? null;

  const { holdings, summary, loading, syncing, error, refetch } =
    useCoinStatsPortfolio(address, network, open);  // ✅ Only load when modal is open

  if (!open) return null;

  if (!primaryWallet) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
        <div 
          className="bg-[#000] border border-[#1e1e1e] rounded-2xl max-w-2xl w-full shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#1a1a1a" }}>
            <span className="text-[18px] font-bold text-white">Portfolio</span>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#1a1a1a] transition-colors"
            >
              <X className="w-5 h-5 text-[#666]" />
            </button>
          </div>
          <NoWalletState onClose={onClose} />
        </div>
      </div>
    );
  }

  const addr = address ?? "";
  const shortAddr = addr.slice(0, 6) + "…" + addr.slice(-4);

  const totalUp = summary.pnl24hUsd >= 0;
  const allTimeUp = summary.allTimePnlUsd >= 0;
  const fmt = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-[#000] border border-[#1e1e1e] rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#1a1a1a" }}>
          <span className="text-[18px] font-bold text-white">Portfolio</span>
          <div className="flex items-center gap-3">
            <button
              onClick={refetch}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[#1a1a1a] transition-colors"
              style={{ color: "#666" }}
            >
              <RefreshCw className={`w-4 h-4 ${(loading || syncing) ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[#1a1a1a] transition-colors"
            >
              <X className="w-5 h-5 text-[#666]" />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto px-6 py-5" style={{ maxHeight: "calc(85vh - 80px)" }}>

          {/* Hero card */}
          <div
            className="rounded-2xl overflow-hidden mb-6"
            style={{
              background: "linear-gradient(145deg, #0a0a0a 0%, #050505 100%)",
              border: "1px solid #1a1a1a",
            }}
          >
            <div className="flex items-center justify-between px-6 pt-5 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#22c55e]" />
                <span className="text-[13px] text-[#888] font-semibold">{shortAddr}</span>
              </div>
            </div>

            <div className="px-6 pt-2 pb-6">
              <p className="text-[12px] text-[#666] font-semibold mb-2">
                Total Portfolio Value
              </p>

              {loading || syncing ? (
                <div className="flex flex-col gap-3 mt-2">
                  <Skeleton w="60%" h={52} />
                  <Skeleton w="40%" h={24} />
                  <Skeleton w="30%" h={20} />
                </div>
              ) : error ? (
                <div className="flex flex-col gap-3">
                  <p className="text-[15px] text-[#666]">Failed to load portfolio data</p>
                  <button
                    onClick={refetch}
                    className="flex items-center gap-2 text-[14px] font-semibold text-[#f5c518] hover:opacity-80 transition-opacity"
                  >
                    <RefreshCw className="w-4 h-4" /> Retry
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-end gap-2 mb-2">
                    <span className="text-[48px] font-extrabold leading-none text-white tabular-nums">
                      ${fmt(summary.totalValueUsd)}
                    </span>
                  </div>

                  {/* PnL stats row */}
                  <div className="flex items-center gap-3 mt-4 flex-wrap">
                    <div
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl"
                      style={{
                        backgroundColor: totalUp ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                        border: `1px solid ${totalUp ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
                      }}
                    >
                      {totalUp
                        ? <TrendingUp className="w-4 h-4" style={{ color: "#22c55e" }} />
                        : <TrendingDown className="w-4 h-4" style={{ color: "#ef4444" }} />}
                      <span className="text-[13px] font-bold tabular-nums" style={{ color: totalUp ? "#22c55e" : "#ef4444" }}>
                        {totalUp ? "+" : ""}${fmt(summary.pnl24hUsd)} Today
                      </span>
                    </div>

                    <div
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl"
                      style={{
                        backgroundColor: allTimeUp ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                        border: `1px solid ${allTimeUp ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)"}`,
                      }}
                    >
                      <span className="text-[12px] text-[#666] font-semibold">All Time:</span>
                      <span className="text-[13px] font-bold tabular-nums" style={{ color: allTimeUp ? "#22c55e" : "#ef4444" }}>
                        {allTimeUp ? "+" : ""}${fmt(summary.allTimePnlUsd)}
                      </span>
                    </div>
                  </div>

                  {/* Cost basis */}
                  <p className="text-[12px] text-[#666] mt-4">
                    Cost Basis: <span className="tabular-nums">${fmt(summary.totalCostUsd)}</span>
                    {" · "}Unrealized PnL:{" "}
                    <span className="tabular-nums" style={{ color: summary.unrealizedPnlUsd >= 0 ? "#22c55e" : "#ef4444" }}>
                      {summary.unrealizedPnlUsd >= 0 ? "+" : ""}${fmt(summary.unrealizedPnlUsd)}
                    </span>
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Holdings list */}
          <p className="text-[11px] font-bold tracking-widest uppercase pb-3 text-[#666]">
            Holdings {holdings.length > 0 && `(${holdings.length})`}
          </p>

          <div
            className="rounded-2xl overflow-hidden"
            style={{ backgroundColor: "#050505", border: "1px solid #1a1a1a" }}
          >
            {loading || syncing ? (
              <div className="flex flex-col">
                {[0, 1, 2].map(i => (
                  <div key={i} className="flex items-center justify-between px-5 py-5" style={{ borderBottom: i < 2 ? "1px solid #1a1a1a" : "none" }}>
                    <div className="flex items-center gap-3">
                      <Skeleton w={40} h={40} />
                      <div className="flex flex-col gap-2">
                        <Skeleton w={70} h={15} />
                        <Skeleton w={100} h={12} />
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Skeleton w={80} h={15} />
                      <Skeleton w={60} h={12} />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <p className="px-5 py-5 text-[14px] text-[#666]">Failed to load holdings</p>
            ) : holdings.length === 0 ? (
              <p className="px-5 py-5 text-[14px] text-[#666]">No holdings found</p>
            ) : (
              holdings.map((h, i) => (
                <HoldingRow key={h.symbol} h={h} isLast={i === holdings.length - 1} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
