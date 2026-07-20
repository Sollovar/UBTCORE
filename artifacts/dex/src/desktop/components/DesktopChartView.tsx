import { useState, useMemo } from "react";
import { CandlestickChart } from "./CandlestickChart";
import { useTheme } from "@/contexts/ThemeContext";

interface Props {
  livePrice: number;
  pairId?: string;
  pairAddress?: string;
  network?: string;
  quoteTokenSymbol?: string;
  quoteTokenAddress?: string;
  priceUSD?: number;
  priceChange24h?: number;
}

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

export function DesktopChartView({ 
  livePrice, 
  pairId, 
  pairAddress, 
  network,
  quoteTokenSymbol,
  quoteTokenAddress,
  priceUSD,
  priceChange24h
}: Props) {
  // TRUE = GeckoTerminal (default), FALSE = Exchange Chart
  const [useGeckoTerminal, setUseGeckoTerminal] = useState(true);
  const { isDark } = useTheme();

  const geckoUrl = useMemo(() => {
    if (!pairAddress) return null;
    return buildGeckoUrl(pairAddress, network ?? "bsc", isDark);
  }, [pairAddress, network, isDark]);

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden bg-black">

      {/* ── Toggle Switch Header ───────────────────────────────────── */}
      <div
        className="flex items-center justify-end h-[42px] px-4 shrink-0 border-b"
        style={{ backgroundColor: "#000", borderColor: "#1e1e1e" }}
      >
        <ModeToggle enabled={useGeckoTerminal} onToggle={() => setUseGeckoTerminal(!useGeckoTerminal)} />
      </div>

      {/* ══════════════ MARKET VIEW — GeckoTerminal ═════════════ */}
      {useGeckoTerminal && (
        <div className="flex-1 min-h-0 overflow-hidden" style={{ minHeight: 400 }}>
          {geckoUrl ? (
            <iframe
              key={geckoUrl}
              src={geckoUrl}
              className="w-full border-0 block"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              allow="clipboard-write"
              title="GeckoTerminal Market Chart"
              style={{ width: "100%", height: "calc(100% + 36px)", minHeight: 436, display: "block" }}
            />
          ) : (
            <div
              className="flex flex-col items-center justify-center h-full gap-4 py-16"
              style={{ color: "#555" }}
            >
              <svg width="56" height="56" viewBox="0 0 56 56" fill="none" stroke="currentColor" strokeWidth="1.5" opacity={0.3}>
                <rect x="6" y="12" width="44" height="32" rx="4"/>
                <polyline points="12,36 20,24 28,30 38,18 46,22" strokeWidth="2"/>
              </svg>
              <p className="text-[14px]">Select a pair to view market chart</p>
            </div>
          )}
        </div>
      )}

      {/* ══════════════ EXCHANGE VIEW — CandlestickChart ════════ */}
      {!useGeckoTerminal && (
        <div className="flex-1 min-h-0 overflow-hidden">
          <CandlestickChart 
            livePrice={livePrice} 
            pairId={pairId}
            quoteTokenSymbol={quoteTokenSymbol}
            quoteTokenAddress={quoteTokenAddress}
            network={network}
            priceUSD={priceUSD}
            priceChange24h={priceChange24h}
          />
        </div>
      )}
    </div>
  );
}
