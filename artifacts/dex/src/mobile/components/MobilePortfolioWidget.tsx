import { useState } from "react";
import { TrendingUp, TrendingDown, Wallet, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useConnectedNetwork } from "@/hooks/useConnectedNetwork";
import { useWalletPortfolio } from "@/hooks/useWalletPortfolio";

export function MobilePortfolioWidget() {
  const { primaryWallet } = useDynamicContext();
  const network = useConnectedNetwork();
  const address = primaryWallet?.address ?? null;

  const { balance, balanceUsd, changePercent, symbol, loading, error } =
    useWalletPortfolio(address, network);

  const [collapsed, setCollapsed] = useState(false);

  if (!primaryWallet) return null;

  const isUp     = changePercent >= 0;
  const absChange = Math.abs(changePercent);

  return (
    <div
      style={{
        margin: "10px 12px 2px",
        borderRadius: 16,
        backgroundColor: "var(--m-bg-1)",
        border: "1px solid var(--m-bdr)",
        overflow: "hidden",
      }}
    >
      {/* Header row — always visible */}
      <button
        onClick={() => setCollapsed(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 active:opacity-70"
        style={{ background: "none", border: "none", cursor: "pointer" }}
      >
        <div className="flex items-center gap-2">
          <div
            style={{
              width: 26, height: 26, borderRadius: 8,
              backgroundColor: "rgba(245,197,24,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <Wallet style={{ width: 13, height: 13, color: "#f5c518" }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--m-fg-3)" }}>
            My Portfolio
          </span>
          {loading && (
            <RefreshCw
              style={{ width: 11, height: 11, color: "var(--m-fg-5)" }}
              className="animate-spin"
            />
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* 24h change badge */}
          {!loading && !error && (
            <div
              className="flex items-center gap-1 px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: isUp ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
              }}
            >
              {isUp
                ? <TrendingUp  style={{ width: 10, height: 10, color: "#22c55e" }} />
                : <TrendingDown style={{ width: 10, height: 10, color: "#ef4444" }} />
              }
              <span
                style={{
                  fontSize: 10, fontWeight: 700,
                  color: isUp ? "#22c55e" : "#ef4444",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {isUp ? "+" : "-"}{absChange}%
              </span>
            </div>
          )}

          {collapsed
            ? <ChevronDown style={{ width: 14, height: 14, color: "var(--m-fg-5)" }} />
            : <ChevronUp   style={{ width: 14, height: 14, color: "var(--m-fg-5)" }} />
          }
        </div>
      </button>

      {/* Expanded body */}
      {!collapsed && (
        <div
          className="flex items-end justify-between px-4 pb-3"
          style={{ borderTop: "1px solid var(--m-bdr)" }}
        >
          {/* Balance */}
          <div className="flex flex-col gap-0.5 pt-2.5">
            {loading ? (
              <>
                <div className="h-7 w-28 rounded-lg animate-pulse" style={{ backgroundColor: "var(--m-bg-3)" }} />
                <div className="h-4 w-20 rounded-lg animate-pulse mt-1" style={{ backgroundColor: "var(--m-bg-3)" }} />
              </>
            ) : error ? (
              <span style={{ fontSize: 13, color: "var(--m-fg-5)" }}>Unable to load balance</span>
            ) : (
              <>
                <div className="flex items-baseline gap-1.5">
                  <span
                    style={{
                      fontSize: 26, fontWeight: 800, lineHeight: 1,
                      color: "var(--m-fg)", fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {balance}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--m-fg-4)" }}>
                    {symbol}
                  </span>
                </div>
                <span style={{ fontSize: 13, color: "var(--m-fg-4)", fontVariantNumeric: "tabular-nums" }}>
                  ≈ ${Number(balanceUsd).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                </span>
              </>
            )}
          </div>

          {/* 24h P&L label */}
          {!loading && !error && (
            <div className="flex flex-col items-end gap-0.5 pb-0.5">
              <span style={{ fontSize: 10, color: "var(--m-fg-5)", fontWeight: 600 }}>24h change</span>
              <span
                style={{
                  fontSize: 18, fontWeight: 800,
                  color: isUp ? "#22c55e" : "#ef4444",
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 1.2,
                }}
              >
                {isUp ? "+" : "-"}{absChange}%
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
