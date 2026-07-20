import { TrendingUp, TrendingDown, Wallet, RefreshCw } from "lucide-react";
import { DynamicConnectButton, useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useConnectedNetwork } from "@/hooks/useConnectedNetwork";
import { useCoinStatsPortfolio, type PortfolioHolding } from "@/hooks/useCoinStatsPortfolio";
import { useTranslation } from "@/i18n/i18n";

function Skeleton({ w, h }: { w: number | string; h: number }) {
  return (
    <div
      className="animate-pulse rounded-xl"
      style={{ width: w, height: h, backgroundColor: "var(--m-bg-3)" }}
    />
  );
}

function NoWalletState() {
  const { t } = useTranslation();
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6" style={{ paddingBottom: 80 }}>
      <div
        className="w-24 h-24 rounded-full flex items-center justify-center"
        style={{ background: "rgba(245,197,24,0.08)", border: "2px solid rgba(245,197,24,0.2)" }}
      >
        <Wallet className="w-10 h-10" style={{ color: "#f5c518" }} />
      </div>
      <div className="text-center">
        <p className="text-[20px] font-bold mb-2" style={{ color: "var(--m-fg)" }}>{t('account.noWallet.title')}</p>
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--m-fg-4)" }}>
          {t('portfolio.noWallet.sub')}
        </p>
      </div>
      <DynamicConnectButton buttonContainerClassName="UNBOUND-connect-wrap">
        <button
          style={{
            backgroundColor: "#f5c518", color: "#000", fontWeight: 700,
            fontSize: 15, paddingLeft: 32, paddingRight: 32, height: 50,
            borderRadius: 14, display: "flex", alignItems: "center",
            border: "none", cursor: "pointer", gap: 8,
          }}
        >
          <Wallet className="w-5 h-5" />
          {t('trade.connectWallet')}
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
      className="flex items-center justify-between px-4 py-3"
      style={{ borderBottom: isLast ? "none" : "1px solid var(--m-bdr)" }}
    >
      <div className="flex items-center gap-3">
        {h.icon ? (
          <img
            src={h.icon}
            alt={h.symbol}
            className="w-9 h-9 rounded-full"
            onError={(e) => {
              const el = e.target as HTMLImageElement;
              el.style.display = "none";
              el.nextElementSibling?.removeAttribute("style");
            }}
          />
        ) : null}
        <div
          style={{
            width: 36, height: 36, borderRadius: 10,
            backgroundColor: "rgba(245,197,24,0.10)",
            border: "1px solid rgba(245,197,24,0.18)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, ...(h.icon ? { display: "none" } : {}),
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 800, color: "#f5c518" }}>
            {h.symbol.slice(0, 2)}
          </span>
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: "var(--m-fg)" }}>{h.symbol}</p>
          <p style={{ fontSize: 11, color: "var(--m-fg-5)" }}>
            {h.count < 0.0001 ? h.count.toExponential(2) : h.count.toFixed(h.count < 0.01 ? 6 : 4)} • avg ${fmt(h.avgBuyPrice)}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-end gap-0.5">
        <p style={{ fontSize: 14, fontWeight: 700, color: "var(--m-fg)", fontVariantNumeric: "tabular-nums" }}>
          ${fmt(h.valueUsd)}
        </p>
        <div className="flex items-center gap-1">
          {isUp
            ? <TrendingUp style={{ width: 10, height: 10, color: "#22c55e" }} />
            : <TrendingDown style={{ width: 10, height: 10, color: "#ef4444" }} />}
          <span style={{ fontSize: 11, fontWeight: 600, color: isUp ? "#22c55e" : "#ef4444", fontVariantNumeric: "tabular-nums" }}>
            {isUp ? "+" : ""}{h.priceChange24h.toFixed(2)}%
          </span>
        </div>
        <p style={{
          fontSize: 11, fontWeight: 600, fontVariantNumeric: "tabular-nums",
          color: pnlUp ? "#22c55e" : "#ef4444",
        }}>
          PnL: {pnlUp ? "+" : ""}${fmt(h.unrealizedPnlUsd)}
        </p>
      </div>
    </div>
  );
}

export function MobilePortfolioPage() {
  const { t } = useTranslation();
  const { primaryWallet } = useDynamicContext();
  const network = useConnectedNetwork();
  const address = primaryWallet?.address ?? null;

  const { holdings, summary, loading, syncing, error, refetch } =
    useCoinStatsPortfolio(address, network);

  if (!primaryWallet) return <NoWalletState />;

  const addr = address ?? "";
  const shortAddr = addr.slice(0, 6) + "…" + addr.slice(-4);

  const totalUp = summary.pnl24hUsd >= 0;
  const allTimeUp = summary.allTimePnlUsd >= 0;
  const fmt = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="flex-1 min-h-0 overflow-y-auto" style={{ paddingBottom: 76 }}>

      {/* ── Hero card ── */}
      <div
        className="mx-3 mt-4 rounded-3xl overflow-hidden"
        style={{
          background: "linear-gradient(145deg, var(--m-bg-2) 0%, var(--m-bg-1) 100%)",
          border: "1px solid var(--m-bdr)",
        }}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-1">
          <div className="flex items-center gap-2">
            <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#22c55e", flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "var(--m-fg-4)", fontWeight: 600 }}>{shortAddr}</span>
          </div>
          <button
            onClick={refetch}
            className="w-8 h-8 flex items-center justify-center rounded-xl active:opacity-60"
            style={{ backgroundColor: "var(--m-bg-3)", color: "var(--m-fg-4)" }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${(loading || syncing) ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="px-5 pt-3 pb-5">
          <p style={{ fontSize: 12, color: "var(--m-fg-5)", fontWeight: 600, marginBottom: 6 }}>
            {t('portfolio.totalValue')}
          </p>

          {loading || syncing ? (
            <div className="flex flex-col gap-3 mt-1">
              <Skeleton w="60%" h={44} />
              <Skeleton w="40%" h={20} />
              <Skeleton w="30%" h={18} />
            </div>
          ) : error ? (
            <div className="flex flex-col gap-2">
              <p style={{ fontSize: 14, color: "var(--m-fg-5)" }}>{t('portfolio.fetchError')}</p>
              <button
                onClick={refetch}
                className="flex items-center gap-1 text-[13px] font-semibold"
                style={{ color: "#f5c518", background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                <RefreshCw className="w-3.5 h-3.5" /> {t('portfolio.retry')}
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-end gap-2 mb-1">
                <span style={{ fontSize: 40, fontWeight: 800, lineHeight: 1, color: "var(--m-fg)", fontVariantNumeric: "tabular-nums" }}>
                  ${fmt(summary.totalValueUsd)}
                </span>
              </div>

              {/* PnL stats row */}
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl"
                  style={{
                    backgroundColor: totalUp ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                    border: `1px solid ${totalUp ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
                  }}
                >
                  {totalUp
                    ? <TrendingUp style={{ width: 12, height: 12, color: "#22c55e" }} />
                    : <TrendingDown style={{ width: 12, height: 12, color: "#ef4444" }} />}
                  <span style={{ fontSize: 12, fontWeight: 700, color: totalUp ? "#22c55e" : "#ef4444", fontVariantNumeric: "tabular-nums" }}>
                    {totalUp ? "+" : ""}${fmt(summary.pnl24hUsd)} {t('portfolio.today')}
                  </span>
                </div>

                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl"
                  style={{
                    backgroundColor: allTimeUp ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                    border: `1px solid ${allTimeUp ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)"}`,
                  }}
                >
                  <span style={{ fontSize: 11, color: "var(--m-fg-5)", fontWeight: 600 }}>{t('portfolio.allTime')}:</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: allTimeUp ? "#22c55e" : "#ef4444", fontVariantNumeric: "tabular-nums" }}>
                    {allTimeUp ? "+" : ""}${fmt(summary.allTimePnlUsd)}
                  </span>
                </div>
              </div>

              {/* Cost basis */}
              <p style={{ fontSize: 11, color: "var(--m-fg-5)", marginTop: 10 }}>
                {t('portfolio.costBasis')}: <span style={{ fontVariantNumeric: "tabular-nums" }}>${fmt(summary.totalCostUsd)}</span>
                {" · "}{t('portfolio.unrealizedPnl')}:{" "}
                <span style={{ color: summary.unrealizedPnlUsd >= 0 ? "#22c55e" : "#ef4444", fontVariantNumeric: "tabular-nums" }}>
                  {summary.unrealizedPnlUsd >= 0 ? "+" : ""}${fmt(summary.unrealizedPnlUsd)}
                </span>
              </p>
            </>
          )}
        </div>
      </div>

      {/* ── Holdings list ── */}
      <p className="text-[10px] font-bold tracking-widest uppercase px-4 pt-5 pb-2" style={{ color: "var(--m-fg-5)" }}>
        {t('portfolio.holdings')} {holdings.length > 0 && `(${holdings.length})`}
      </p>

      <div
        className="mx-3 rounded-2xl overflow-hidden"
        style={{ backgroundColor: "var(--m-bg-1)", border: "1px solid var(--m-bdr)" }}
      >
        {loading || syncing ? (
          <div className="flex flex-col gap-0">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex items-center justify-between px-4 py-4" style={{ borderBottom: i < 2 ? "1px solid var(--m-bdr)" : "none" }}>
                <div className="flex items-center gap-3">
                  <Skeleton w={36} h={36} />
                  <div className="flex flex-col gap-2">
                    <Skeleton w={60} h={14} />
                    <Skeleton w={90} h={11} />
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Skeleton w={70} h={14} />
                  <Skeleton w={50} h={11} />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="px-4 py-4 text-[13px]" style={{ color: "var(--m-fg-5)" }}>{t('portfolio.holdingsError')}</p>
        ) : holdings.length === 0 ? (
          <p className="px-4 py-4 text-[13px]" style={{ color: "var(--m-fg-5)" }}>{t('portfolio.noHoldings')}</p>
        ) : (
          holdings.map((h, i) => (
            <HoldingRow key={h.symbol} h={h} isLast={i === holdings.length - 1} />
          ))
        )}
      </div>
    </div>
  );
}
