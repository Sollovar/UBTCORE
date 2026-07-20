import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { LiveMarketState } from "@/hooks/useLiveMarket";
import { FlashDir } from "@/hooks/useRealtimePairs";
import { useGeckoPriceFlash } from "@/hooks/useGeckoPriceFlash";
import { formatPriceForDisplay } from "@/utils/formatters";
import type { Pair } from "@/types";

interface Props {
  market: LiveMarketState;
  currentSymbol: string;
  pair?: Pair | null;
  flash?: FlashDir;
  onOpenMarketPanel: () => void;
}

const COIN_COLORS: Record<string, { color: string; initial: string }> = {
  BTC:  { color: "#f7931a", initial: "B" },
  ETH:  { color: "#627eea", initial: "E" },
  BNB:  { color: "#f3ba2f", initial: "B" },
  SOL:  { color: "#9945ff", initial: "S" },
  XRP:  { color: "#346aa9", initial: "X" },
  DOGE: { color: "#c2a633", initial: "D" },
  ADA:  { color: "#3468d1", initial: "A" },
  DOT:  { color: "#e6007a", initial: "D" },
  AVAX: { color: "#e84142", initial: "A" },
  LINK: { color: "#375bd2", initial: "L" },
  SUI:  { color: "#4ca2f9", initial: "S" },
  NEAR: { color: "#00d5bd", initial: "N" },
};


/* ── Mini sparkline ── */
function Sparkline({ prices, color, w = 68, h = 24 }: { prices: number[]; color: string; w?: number; h?: number }) {
  if (prices.length < 2) return <div style={{ width: w, height: h }} />;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (max === min) return <div style={{ width: w, height: h }} />;
  const range = max - min;
  const pad = 2;
  const coords = prices.map((p, i) => ({
    x: (i / (prices.length - 1)) * w,
    y: h - pad - ((p - min) / range) * (h - pad * 2),
  }));
  const linePoints = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const areaPath =
    `M${coords[0].x},${coords[0].y} ` +
    coords.slice(1).map((c) => `L${c.x},${c.y}`).join(" ") +
    ` L${w},${h} L0,${h} Z`;
  const gradId = `spark-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: "hidden", display: "block" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0}   />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <polyline
        points={linePoints}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function fmtVolume(n: number) {
  if (n >= 1_000_000_000) return "$" + (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000)     return "$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000)         return "$" + (n / 1_000).toFixed(1) + "K";
  if (n === 0)            return "—";
  return "$" + n.toFixed(4);
}

function fmtNative(n: number): string {
  if (!n || n === 0) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(2) + "K";
  if (n >= 1)         return n.toFixed(4);
  if (n >= 0.0001)    return n.toFixed(6);
  return n.toFixed(8);
}

const SUBSCRIPT_DIGITS_H = ["₀","₁","₂","₃","₄","₅","₆","₇","₈","₉"];
function toSubscriptH(n: number): string {
  return String(n).split("").map(c => SUBSCRIPT_DIGITS_H[parseInt(c)] ?? c).join("");
}
function fmtUsdHeader(n: number): string {
  if (!n || n === 0) return "—";
  if (n >= 10000) return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (n >= 1)     return "$" + n.toFixed(2);
  if (n >= 0.0001) return "$" + n.toFixed(6);
  const str = n.toFixed(20);
  const afterDot = str.split(".")[1] ?? "";
  let zeros = 0;
  for (const c of afterDot) { if (c === "0") zeros++; else break; }
  const sigRaw = afterDot.slice(zeros, zeros + 4).replace(/0+$/, "") || "0";
  if (zeros < 4) return "$" + n.toFixed(6);
  return `$0.0${toSubscriptH(zeros - 1)}${sigRaw}`;
}

export function MobilePairHeader({ market, currentSymbol, pair, flash, onOpenMarketPanel }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [priceHistory, setPriceHistory] = useState<number[]>([market.price]);

  useEffect(() => {
    setPriceHistory((h) => [...h, market.price].slice(-60));
  }, [market.price]);

  const baseSymbol  = pair?.baseToken.symbol ?? currentSymbol.split("/")[0] ?? "?";
  const quoteSymbol = pair?.quoteToken.symbol ?? currentSymbol.split("/")[1] ?? "USDT";
  const baseName    = pair?.baseToken.name ?? baseSymbol;
  const baseLogo    = pair?.baseToken.logo ?? "";
  const coin        = COIN_COLORS[baseSymbol] ?? { color: "#f5c518", initial: baseSymbol[0] ?? "?" };

  // Exchange price: pair.price is WS-updated in real time.
  const exchangePrice = (() => {
    const fromStore = pair?.price;
    const fromLastTrade = pair?.lastTradePrice;
    return Number(fromStore ?? fromLastTrade ?? market.price) || 0;
  })();

  const nativePrice = pair?.price ?? 0;

  // Gecko price = always GeckoTerminal reference (default display price)
  const geckoPrice    = pair?.geckoPrice       ?? pair?.price    ?? market.price;
  const geckoPriceUSD = pair?.geckoPriceUSD    ?? pair?.priceUSD ?? undefined;
  const geckoChange   = pair?.geckoPriceChange24h ?? 0;

  // Real-time Gecko price flash tracking (separate from exchange price)
  const geckoFlash = useGeckoPriceFlash(pair?.id, geckoPrice);

  // Exchange price USD — computed from first principles using the stable gecko-derived rate.
  // quoteTokenUSDRate = geckoPriceUSD / geckoPrice (always available, never stale).
  // exchangePriceUSD  = exchangePrice × quoteTokenUSDRate.
  // This is immune to whether pair.priceUSD was set from gecko or fill values in the cache.
  const geckoRateDenom  = pair?.geckoPrice ?? pair?.price ?? 0;
  const geckoRateNumer  = pair?.geckoPriceUSD ?? pair?.priceUSD ?? 0;
  const quoteTokenUSDRate = (geckoRateDenom > 0 && geckoRateNumer > 0)
    ? geckoRateNumer / geckoRateDenom
    : 0;
  const exchangePriceUSD = (exchangePrice > 0 && quoteTokenUSDRate > 0)
    ? exchangePrice * quoteTokenUSDRate
    : 0;

  // Exchange price change = computed from our backend fills
  const exchangeChange = pair?.priceChange24h ?? 0;

  // Gecko price color: flash bright color when active, otherwise NEUTRAL (white)
  const flashUpColor   = "#00ff7f";
  const flashDownColor = "#ff4d6a";
  const neutralColor   = "var(--m-fg)"; // White/light gray - NEUTRAL when not flashing
  const priceColor = geckoFlash === "up"   ? flashUpColor
                   : geckoFlash === "down" ? flashDownColor
                   : neutralColor;

  const geckoChangePct = geckoChange.toFixed(2);
  const geckoChangeColor = geckoChange >= 0 ? "#00c853" : "#ff1744"; // Always red/green for change %
  const exchangeChangeColor = exchangeChange >= 0 ? "#00c853" : "#ff4d6a";
  const sparkColor = priceHistory.length >= 2 && priceHistory[priceHistory.length - 1] >= priceHistory[0]
    ? "#00c853" : "#ff1744";

  // Real stats panel data from pair
  // Use gecko price for fallback high/low calculations (matching desktop UI logic)
  const displayPriceForStats = geckoPrice > 0 ? geckoPrice : market.price;
  const high24h = pair?.geckoHigh24h ?? pair?.priceHigh24h ?? pair?.high24h ?? (displayPriceForStats > 0 ? displayPriceForStats * 1.018 : 0);
  const low24h  = pair?.geckoLow24h  ?? pair?.priceLow24h  ?? pair?.low24h  ?? (displayPriceForStats > 0 ? displayPriceForStats * 0.982 : 0);
  const volume24hNative = pair?.volume24h    ?? 0;
  const volume24hUSD    = pair?.volume24hUSD ?? 0;
  const liquidityNative = pair?.liquidity    ?? 0;
  const liquidityUSD    = pair?.liquidityUSD ?? 0;
  const quoteSymbol2   = pair?.quoteToken.symbol ?? "—";

  return (
    <div style={{ backgroundColor: "var(--m-bg-1)", borderBottom: "1px solid var(--m-bdr)" }}>

      {/* ── Top row ── */}
      <div className="flex items-center justify-between px-4 h-[56px]">

        {/* Left: coin icon + symbol + name */}
        <button
          onClick={onOpenMarketPanel}
          className="flex items-center gap-2.5 active:opacity-70 transition-opacity"
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold overflow-hidden"
            style={{ backgroundColor: coin.color + "28", border: `1.5px solid ${coin.color}45`, color: coin.color }}
          >
            {baseLogo ? (
              <img src={baseLogo} alt={baseSymbol} className="w-6 h-6 rounded-full object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
            ) : coin.initial}
          </div>
          <div className="flex flex-col leading-none gap-0.5">
            <div className="flex items-center gap-1">
              <span className="font-bold text-[15px]" style={{ color: "var(--m-fg)" }}>
                {baseSymbol}<span style={{ color: "var(--m-fg-4)", fontWeight: 400 }}>/{quoteSymbol}</span>
              </span>
              <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--m-fg-4)" }} />
            </div>
            <span className="text-[11px] truncate max-w-[120px]" style={{ color: "var(--m-fg-4)" }}>{baseName}</span>
          </div>
        </button>

        {/* Right: sparkline + gecko price + gecko change + USD equiv + expand toggle */}
        <div className="flex items-center gap-2">
          <Sparkline prices={priceHistory} color={sparkColor} w={68} h={24} />
          <div className="text-right flex flex-col leading-none gap-[3px]">
            <div
              className="font-bold text-[17px] tabular-nums leading-none"
              style={{
                color: priceColor,
                transition: geckoFlash ? "none" : "color 700ms ease-out",
                textShadow: geckoFlash ? `0 0 12px ${priceColor}, 0 0 20px ${priceColor}66` : "none",
              }}
            >
              {geckoPrice > 0 ? formatPriceForDisplay(geckoPrice) : "—"}
              {geckoPrice > 0 && (
                <span className="text-[11px] font-semibold ml-1.5" style={{ color: geckoChangeColor }}>
                  {geckoChange >= 0 ? "+" : ""}{geckoChangePct}%
                </span>
              )}
            </div>
            {geckoPriceUSD != null && geckoPriceUSD > 0 && (
              <div className="text-[10px] tabular-nums leading-none" style={{ color: "var(--m-fg-5)" }}>
                ≈ {fmtUsdHeader(geckoPriceUSD)}
              </div>
            )}
          </div>
          {/* Expand / collapse */}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center justify-center active:opacity-60 transition-opacity"
          >
            {expanded
              ? <ChevronUp   className="w-5 h-5" style={{ color: "var(--m-fg-4)" }} />
              : <ChevronDown className="w-5 h-5" style={{ color: "var(--m-fg-4)" }} />
            }
          </button>
        </div>
      </div>

      {/* ── Expanded stats panel (real pair data) ── */}
      {expanded && (
        <div
          className="px-4 pb-3 grid grid-cols-2 gap-x-6 gap-y-3"
          style={{ borderTop: "1px solid var(--m-bg-3)" }}
        >
          <div className="flex flex-col gap-0.5 pt-3">
            <span className="text-[11px] font-medium" style={{ color: "var(--m-fg-4)" }}>24h High</span>
            <span className="text-[13px] font-semibold tabular-nums" style={{ color: "#00c853" }}>
              {high24h > 0
                ? formatPriceForDisplay(high24h)
                : "—"}
            </span>
            {high24h > 0 && quoteTokenUSDRate > 0 && (
              <span className="text-[10px] tabular-nums" style={{ color: "var(--m-fg-5)" }}>
                ≈ {fmtUsdHeader(high24h * quoteTokenUSDRate)}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-0.5 pt-3">
            <span className="text-[11px] font-medium" style={{ color: "var(--m-fg-4)" }}>24h Low</span>
            <span className="text-[13px] font-semibold tabular-nums" style={{ color: "#ff4d6a" }}>
              {low24h > 0
                ? formatPriceForDisplay(low24h)
                : "—"}
            </span>
            {low24h > 0 && quoteTokenUSDRate > 0 && (
              <span className="text-[10px] tabular-nums" style={{ color: "var(--m-fg-5)" }}>
                ≈ {fmtUsdHeader(low24h * quoteTokenUSDRate)}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-medium" style={{ color: "var(--m-fg-4)" }}>24h Volume</span>
            <span className="text-[13px] font-semibold tabular-nums" style={{ color: "var(--m-fg-2)" }}>
              {volume24hNative > 0 ? fmtNative(volume24hNative) : "—"}
              {volume24hNative > 0 && (
                <span className="text-[10px] font-normal" style={{ color: "var(--m-fg-5)" }}> {quoteSymbol2}</span>
              )}
            </span>
            {volume24hUSD > 0 && (
              <span className="text-[11px] tabular-nums" style={{ color: "var(--m-fg-5)" }}>
                ≈ {fmtVolume(volume24hUSD)}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-medium" style={{ color: "var(--m-fg-4)" }}>Liquidity</span>
            <span className="text-[13px] font-semibold tabular-nums" style={{ color: "var(--m-fg-2)" }}>
              {liquidityNative > 0 ? fmtNative(liquidityNative) : "—"}
              {liquidityNative > 0 && (
                <span className="text-[10px] font-normal" style={{ color: "var(--m-fg-5)" }}> {quoteSymbol2}</span>
              )}
            </span>
            {liquidityUSD > 0 && (
              <span className="text-[11px] tabular-nums" style={{ color: "var(--m-fg-5)" }}>
                ≈ {fmtVolume(liquidityUSD)}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-0.5 col-span-2" style={{ borderTop: "1px solid var(--m-bg-3)", paddingTop: 10 }}>
            <span className="text-[11px] font-medium" style={{ color: "var(--m-fg-4)" }}>Last Exchange Price</span>
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold tabular-nums" style={{ color: "var(--m-fg)" }}>
                {exchangePrice > 0
                  ? exchangePrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 })
                  : "0"}
              </span>
              {exchangePrice > 0 && (
                <span className="text-[11px] font-semibold tabular-nums" style={{ color: exchangeChangeColor }}>
                  {exchangeChange >= 0 ? "+" : ""}{exchangeChange.toFixed(2)}%
                </span>
              )}
            </div>
            {exchangePrice > 0 && exchangePriceUSD > 0 && (
              <span className="text-[11px] tabular-nums" style={{ color: "var(--m-fg-5)" }}>
                ≈ {fmtUsdHeader(exchangePriceUSD)}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
