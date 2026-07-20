import { useState, useMemo } from "react";
import { CandlestickChart } from "../../desktop/components/CandlestickChart";
import { Maximize2 } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface Props {
  livePrice: number;
  pairId?: string;
  pairAddress?: string;
  network?: string;
}

const TIMEFRAMES = ["5m", "15m", "1h", "4h", "1D", "1W"];

const GECKO_NETWORK_MAP: Record<string, string> = {
  bsc:       "bsc",
  base:      "base",
  solana:    "solana",
  ethereum:  "eth",
  arbitrum:  "arbitrum",
  avalanche: "avax",
  polygon:   "polygon_pos",
};

function buildGeckoUrl(pairAddress: string, network: string, isDark: boolean): string {
  const n = (network || "bsc").toLowerCase();
  const gtNetwork = GECKO_NETWORK_MAP[n] ?? n;
  // Solana addresses are case-sensitive — never lowercase them
  const addr = n === "solana" ? pairAddress : pairAddress.toLowerCase();
  const theme = isDark ? "dark" : "light";
  return `https://www.geckoterminal.com/${gtNetwork}/pools/${addr}?embed=1&theme=${theme}&swaps=0&info=0`;
}

const DrawingTools = () => (
  <div className="absolute left-0 top-0 bottom-0 w-9 flex flex-col items-center pt-8 gap-3 z-10 pointer-events-none">
    {[
      <svg key="cursor" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><line x1="8" y1="1" x2="8" y2="15"/><line x1="1" y1="8" x2="15" y2="8"/></svg>,
      <svg key="line" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><line x1="2" y1="14" x2="14" y2="2"/></svg>,
      <svg key="channel" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><line x1="2" y1="5" x2="14" y2="5"/><line x1="2" y1="9" x2="14" y2="9"/><line x1="2" y1="13" x2="14" y2="13"/></svg>,
      <svg key="nodes" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><circle cx="4" cy="8" r="2"/><circle cx="12" cy="4" r="2"/><circle cx="12" cy="12" r="2"/><line x1="6" y1="8" x2="10" y2="4"/><line x1="6" y1="8" x2="10" y2="12"/></svg>,
      <svg key="scatter" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><circle cx="4" cy="12" r="1.5"/><circle cx="7" cy="8" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="13" cy="4" r="1.5"/></svg>,
      <svg key="pencil" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M2 14L5 11L12 4L14 6L7 13L2 14Z"/><line x1="10" y1="5" x2="12" y2="7"/></svg>,
      <svg key="text" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><line x1="3" y1="4" x2="13" y2="4"/><line x1="8" y1="4" x2="8" y2="13"/></svg>,
      <svg key="smiley" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><circle cx="8" cy="8" r="6"/><path d="M5.5 9.5C5.5 9.5 6.5 11 8 11C9.5 11 10.5 9.5 10.5 9.5"/><circle cx="6" cy="7" r="0.8" fill="currentColor"/><circle cx="10" cy="7" r="0.8" fill="currentColor"/></svg>,
      <svg key="ruler" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><rect x="1" y="5" width="14" height="6" rx="1"/><line x1="4" y1="5" x2="4" y2="8"/><line x1="7" y1="5" x2="7" y2="7"/><line x1="10" y1="5" x2="10" y2="8"/><line x1="13" y1="5" x2="13" y2="7"/></svg>,
      <svg key="plus" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><circle cx="8" cy="8" r="6"/><line x1="8" y1="5" x2="8" y2="11"/><line x1="5" y1="8" x2="11" y2="8"/></svg>,
    ].map((icon, i) => (
      <button key={i} className="pointer-events-auto transition-colors" style={{ color: "var(--m-fg-5)" }}>
        {icon}
      </button>
    ))}
  </div>
);

const ALButtons = () => (
  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 z-10">
    <button className="w-6 h-6 rounded-md bg-[#3366ff] text-white text-[11px] font-bold flex items-center justify-center">A</button>
    <button className="w-6 h-6 rounded-md bg-[#3366ff] text-white text-[11px] font-bold flex items-center justify-center">L</button>
  </div>
);

function ModeToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-label="Toggle chart mode"
      onClick={onToggle}
      className="relative h-6 w-12 rounded-full border border-white/10 transition-all duration-300"
      style={{ backgroundColor: enabled ? "rgba(245,197,24,0.24)" : "rgba(255,255,255,0.06)" }}
    >
      <span
        className="absolute top-[2px] h-[20px] w-[20px] rounded-full bg-[#f5c518] shadow-[0_1px_3px_rgba(0,0,0,0.35)] transition-all duration-300"
        style={{ left: enabled ? "calc(100% - 22px)" : "2px" }}
      />
    </button>
  );
}

export function MobileChartView({ livePrice, pairId, pairAddress, network }: Props) {
  const [tf, setTf] = useState("1h");
  const [chartMode, setChartMode] = useState<"market" | "exchange">("market");
  const { isDark } = useTheme();

  const geckoUrl = useMemo(() => {
    if (!pairAddress) return null;
    return buildGeckoUrl(pairAddress, network ?? "bsc", isDark);
  }, [pairAddress, network, isDark]);

  // Normalize timeframe for the chart
  const normalizeTimeframeForChart = (value: string): string => {
    const normalized = (value ?? "").trim().toLowerCase();
    if (["5m", "5", "5min"].includes(normalized)) return "5m";
    if (["15m", "15", "15min"].includes(normalized)) return "15m";
    if (["1h", "1hr", "1hour", "hour", "h", "60"].includes(normalized)) return "1h";
    if (["4h", "4hr", "4hour"].includes(normalized)) return "4h";
    if (["d", "1d", "1day", "day", "daily"].includes(normalized)) return "1D";
    if (["w", "1w", "1week", "week", "weekly"].includes(normalized)) return "1W";
    return "1h"; // default
  };

  const normalizedTf = normalizeTimeframeForChart(tf);

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">

      {/* ── Chart mode toggle ───────────────────────────────────── */}
      <div
        className="flex items-center justify-between h-[44px] px-3 shrink-0"
        style={{ backgroundColor: "var(--m-bg)", borderBottom: "1px solid var(--m-bdr)" }}
      >
        <ModeToggle enabled={chartMode === "exchange"} onToggle={() => setChartMode(chartMode === "exchange" ? "market" : "exchange")} />

        {chartMode === "exchange" && (
          <button
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:opacity-70"
            style={{ color: "var(--m-fg-4)" }}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ══════════════ MARKET VIEW — GeckoTerminal ═════════════ */}
      {chartMode === "market" && (
        <div className="flex-1 min-h-0 overflow-hidden" style={{ minHeight: 320 }}>
          {geckoUrl ? (
            <iframe
              key={geckoUrl}
              src={geckoUrl}
              className="w-full border-0 block"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              allow="clipboard-write"
              title="GeckoTerminal Market Chart"
              style={{ width: "100%", height: "calc(100% + 36px)", minHeight: 356, display: "block" }}
            />
          ) : (
            <div
              className="flex flex-col items-center justify-center h-full gap-3 py-12"
              style={{ color: "var(--m-fg-5)" }}
            >
              <svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="currentColor" strokeWidth="1.2" opacity={0.3}>
                <rect x="4" y="8" width="36" height="28" rx="3"/>
                <polyline points="9,28 16,18 22,23 30,13 36,17" strokeWidth="1.8"/>
              </svg>
              <p className="text-[13px]">Select a pair to view chart</p>
            </div>
          )}
        </div>
      )}

      {/* ══════════════ EXCHANGE VIEW — CandlestickChart ════════ */}
      {chartMode === "exchange" && (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Toolbar */}
          <div
            className="flex items-center h-[40px] px-2.5 shrink-0 gap-1.5"
            style={{ backgroundColor: "var(--m-bg)", borderBottom: "1px solid var(--m-bdr)" }}
          >
            <div className="flex items-center gap-0.5">
              {TIMEFRAMES.map((t) => (
                <button
                  key={t}
                  onClick={() => setTf(t)}
                  className="px-2 h-6 text-[12px] font-semibold transition-all rounded-md"
                  style={{
                    color: tf === t ? "var(--m-fg)" : "var(--m-fg-4)",
                    backgroundColor: tf === t ? "var(--m-bg-3)" : "transparent",
                  }}
                >
                  {t}
                </button>
              ))}
              <button
                className="px-1 h-6 transition-colors"
                style={{ color: "var(--m-fg-4)" }}
              >
                <svg width="9" height="6" viewBox="0 0 9 6" fill="currentColor"><path d="M0 0.5L4.5 5.5L9 0.5H0Z"/></svg>
              </button>
            </div>

            <div className="w-px h-4" style={{ backgroundColor: "var(--m-bdr)" }} />

            <button
              className="flex items-center h-6 px-1.5 transition-opacity hover:opacity-70"
              style={{ color: "var(--m-fg-3)" }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2">
                <rect x="2" y="3" width="3" height="7" rx="0.5" fill="currentColor" stroke="none"/>
                <line x1="3.5" y1="1" x2="3.5" y2="3"/><line x1="3.5" y1="10" x2="3.5" y2="13"/>
                <rect x="9" y="4" width="3" height="5" rx="0.5"/>
                <line x1="10.5" y1="2" x2="10.5" y2="4"/><line x1="10.5" y1="9" x2="10.5" y2="12"/>
              </svg>
            </button>

            <button
              className="flex items-center gap-1 h-6 px-1.5 text-[11px] font-semibold transition-opacity hover:opacity-70"
              style={{ color: "var(--m-fg-3)" }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M1 9 L4 6 L7 8 L11 3"/>
                <path d="M1 7 L4 4 L7 6 L11 1" strokeDasharray="1.5 1"/>
              </svg>
              Ind.
            </button>
          </div>

          {/* Chart area */}
          <div className="relative flex-1 min-h-0 overflow-hidden" style={{ minHeight: 320 }}>
            <DrawingTools />
            <div className="absolute inset-0 pl-9">
              <CandlestickChart 
                livePrice={livePrice} 
                showToolbar={false} 
                pairId={pairId} 
                timeframe={normalizedTf}
              />
            </div>
            <ALButtons />
          </div>

          {/* Chart footer */}
          <div
            className="flex items-center h-[32px] px-3 shrink-0 gap-3 text-[11px]"
            style={{ backgroundColor: "var(--m-bg)", borderTop: "1px solid var(--m-bdr)", color: "var(--m-fg-4)" }}
          >
            <button className="flex items-center gap-1 hover:opacity-80">
              Date Range <svg width="8" height="5" viewBox="0 0 8 5" fill="currentColor"><path d="M0 0L4 5L8 0H0Z"/></svg>
            </button>
            <div className="w-px h-3" style={{ backgroundColor: "var(--m-bdr)" }} />
            <span className="text-[10px]">
              {new Date().toLocaleTimeString("en-US", { hour12: false })} UTC+1
            </span>
            <div className="ml-auto flex items-center gap-2">
              <button className="hover:opacity-80">%</button>
              <button className="hover:opacity-80">log</button>
              <button className="text-[#f5c518] font-semibold">auto</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
