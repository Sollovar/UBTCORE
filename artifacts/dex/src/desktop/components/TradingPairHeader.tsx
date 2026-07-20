import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Info } from "lucide-react";
import { LiveMarketState } from "@/hooks/useLiveMarket";
import { PairSelectorPanel } from "./PairSelectorPanel";
import { PairInfoModal } from "./PairInfoModal";
import { useStore } from "@/stores/useStore";
import { usePairs } from "@/hooks/usePairs";
import { useGeckoPriceFlash } from "@/hooks/useGeckoPriceFlash";

interface Props {
  market: LiveMarketState;
}

const SUBSCRIPT_DIGITS = ["₀","₁","₂","₃","₄","₅","₆","₇","₈","₉"];
function toSubscript(n: number): string {
  return String(n).split("").map(c => SUBSCRIPT_DIGITS[parseInt(c)] ?? c).join("");
}

function fmtPrice(n: number): string {
  if (n === 0)     return "—";
  if (n >= 10000)  return n.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (n >= 100)    return n.toFixed(2);
  if (n >= 1)      return n.toFixed(4);
  if (n >= 0.0001) return n.toFixed(6);
  // Very small: count zeros after decimal → 0.0₆33 notation
  const str = n.toFixed(20);
  const afterDot = str.split(".")[1] ?? "";
  let zeros = 0;
  for (const c of afterDot) { if (c === "0") zeros++; else break; }
  const sigRaw = afterDot.slice(zeros, zeros + 4).replace(/0+$/, "") || "0";
  if (zeros < 4) return n.toFixed(6);
  return `0.0${toSubscript(zeros - 1)}${sigRaw}`;
}

function fmtUsdBrief(n: number): string {
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
  return `$0.0${toSubscript(zeros - 1)}${sigRaw}`;
}

function fmtVolume(n: number) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1000) return (n / 1000).toFixed(2) + "K";
  // For small amounts, show enough decimals to be meaningful
  if (n >= 1) return n.toFixed(4);
  if (n >= 0.01) return n.toFixed(4);
  if (n >= 0.001) return n.toFixed(5);
  if (n >= 0.0001) return n.toFixed(6);
  if (n >= 0.00001) return n.toFixed(7);
  if (n >= 0.000001) return n.toFixed(8);
  return n.toFixed(10);
}

function fmtVolumeUsd(n: number) {
  if (n >= 1_000_000_000) return "$" + (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1000) return "$" + (n / 1000).toFixed(2) + "K";
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function Stat({ label, value, valueSecondary, color }: { label: string; value: string; valueSecondary?: string; color?: string }) {
  return (
    <div className="flex flex-col justify-center leading-none shrink-0 gap-0.5">
      <span className="text-[11px] text-[#555]">{label}</span>
      <span className="text-[13px] tabular-nums font-medium" style={{ color: color ?? "#ccc" }}>{value}</span>
      {valueSecondary && (
        <span className="text-[10px] tabular-nums" style={{ color: "#666" }}>{valueSecondary}</span>
      )}
    </div>
  );
}

function symbolColor(symbol: string): string {
  const palette = [
    "#f7931a","#627eea","#9945ff","#f3ba2f","#00aae4",
    "#4caf50","#ff6b35","#e84142","#2a5ada","#8b5cf6",
  ];
  let h = 0;
  for (let i = 0; i < symbol.length; i++) h = (h * 31 + symbol.charCodeAt(i)) & 0x7fffffff;
  return palette[h % palette.length];
}

function chainLabel(network?: string): string {
  if (!network) return "BSC";
  if (network === "bsc") return "BSC";
  if (network === "base") return "Base";
  if (network === "solana") return "Solana";
  return network.charAt(0).toUpperCase() + network.slice(1);
}

export function TradingPairHeader({ market }: Props) {
  const [location, navigate] = useLocation();
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelPos, setPanelPos]   = useState({ top: 0, left: 0 });
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const triggerRef  = useRef<HTMLButtonElement>(null);
  const triggerArea = useRef<HTMLDivElement>(null);
  const closeTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  usePairs();
  const pairs         = useStore((s) => s.pairs);
  const selectedPair  = useStore((s) => s.selectedPair);
  const setSelectedPair = useStore((s) => s.setSelectedPair);

  // Initialize selectedPair to first pair once pairs load
  useEffect(() => {
    if (!selectedPair && pairs.length > 0) {
      setSelectedPair(pairs[0]);
    }
  }, [pairs, selectedPair, setSelectedPair]);

  const activePair = selectedPair ?? pairs[0] ?? null;

  const baseSymbol    = activePair?.baseToken?.symbol  ?? "—";
  const quoteSymbol   = activePair?.quoteToken?.symbol ?? "—";
  const displaySymbol = `${baseSymbol}${quoteSymbol}`;
  const baseName      = activePair?.baseToken?.name ?? baseSymbol;
  const baseLogo      = activePair?.baseToken?.logo ?? "";
  const network       = chainLabel(activePair?.network);
  const tokenColor    = symbolColor(baseSymbol);

  // Use gecko price for display (not exchange price which may be 0)
  const displayPrice = activePair?.geckoPrice ?? activePair?.price ?? market.price;
  const priceChange24h = activePair?.geckoPriceChange24h ?? 0;
  
  // Real-time Gecko price flash tracking
  const geckoFlash = useGeckoPriceFlash(activePair?.id, displayPrice);
  
  // Exchange price (from actual fills on our platform)
  const exchangePrice = activePair?.price ?? 0;
  const geckoRateDenom = activePair?.geckoPrice ?? activePair?.price ?? 0;
  const geckoRateNumer = activePair?.geckoPriceUSD ?? 0;
  const quoteTokenUSDRate = (geckoRateNumer > 0 && geckoRateDenom > 0)
    ? geckoRateNumer / geckoRateDenom
    : 0;
  const exchangePriceUSD = (exchangePrice > 0 && quoteTokenUSDRate > 0)
    ? exchangePrice * quoteTokenUSDRate
    : 0;
  
  // Exchange price change = computed from our backend fills (NOT gecko)
  const exchangeChange = activePair?.priceChange24h ?? 0;
  const exchangeChangeColor = exchangeChange >= 0 ? "#00c853" : "#ff4d6a";
  
  const flashUpColor = "#00ff7f";
  const flashDownColor = "#ff4d6a";
  const neutralColor = "#f5f5f5"; // White/light gray - NEUTRAL when not flashing
  
  const priceColor = geckoFlash === "up" ? flashUpColor
                   : geckoFlash === "down" ? flashDownColor
                   : neutralColor;
  // priceChange24h is already a percentage (90.85), not decimal (0.9085) - don't multiply by 100
  const changePct  = priceChange24h.toFixed(2);
  const changeColor = priceChange24h >= 0 ? "#00c853" : "#ff1744";

  function openPanel() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (!panelOpen && triggerArea.current) {
      const rect = triggerArea.current.getBoundingClientRect();
      setPanelPos({ top: rect.bottom + 4, left: rect.left });
    }
    setPanelOpen(true);
  }

  function scheduleClose() {
    closeTimer.current = setTimeout(() => setPanelOpen(false), 150);
  }

  function cancelClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }

  function handleToggle() {
    if (panelOpen) {
      setPanelOpen(false);
    } else {
      openPanel();
    }
  }

  return (
    <>
      <div className="flex items-center h-[52px] px-4 border-b border-[#1a1a1a] bg-[#0d0d0d] shrink-0 gap-5 whitespace-nowrap overflow-x-auto">

        {/* Pair selector trigger */}
        <div
          ref={triggerArea}
          className="flex items-center gap-2.5 shrink-0"
          onMouseEnter={openPanel}
          onMouseLeave={scheduleClose}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
            style={{ backgroundColor: tokenColor + "22" }}
          >
            {baseLogo ? (
              <img
                src={baseLogo}
                alt={baseSymbol}
                className="w-6 h-6 rounded-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                style={{ backgroundColor: tokenColor }}
              >
                {baseSymbol.charAt(0)}
              </div>
            )}
          </div>
          <div className="flex flex-col justify-center leading-none gap-0.5">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-[15px] text-white">{displaySymbol}</span>
              <span className="text-[10px] bg-[#f5c518]/10 text-[#f5c518] px-1 py-0.5 rounded font-semibold">{network}</span>
              <button
                ref={triggerRef}
                onClick={handleToggle}
                className={`w-5 h-5 flex items-center justify-center rounded transition-colors hover:bg-[#1e1e1e] ${panelOpen ? "bg-[#1e1e1e] text-white" : "text-[#555] hover:text-white"}`}
                data-testid="pair-selector-toggle"
              >
                <svg width="10" height="6" viewBox="0 0 10 6" fill="currentColor"
                  style={{ transform: panelOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
                  <path d="M0 0.5L5 5.5L10 0.5H0Z" />
                </svg>
              </button>
            </div>
            <span className="text-[11px] text-[#555]">{baseName}</span>
          </div>
        </div>

        {/* Live price */}
        <div className="flex flex-col justify-center leading-none shrink-0 gap-0.5">
          <span 
            className="text-[20px] font-bold tabular-nums" 
            style={{ 
              color: priceColor,
              transition: geckoFlash ? "none" : "color 700ms ease-out",
              textShadow: geckoFlash ? `0 0 12px ${priceColor}, 0 0 20px ${priceColor}66` : "none",
            }}
          >
            {displayPrice > 0 ? fmtPrice(displayPrice) : "—"}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#666] tabular-nums">
              {activePair?.geckoPriceUSD ? fmtUsdBrief(activePair.geckoPriceUSD) : activePair?.priceUSD ? fmtUsdBrief(activePair.priceUSD) : ""}
            </span>
            <span 
              className="text-[12px] tabular-nums" 
              style={{ 
                color: changeColor,
                transition: "color 0.15s ease",
              }}
            >
              {priceChange24h >= 0 ? "+" : ""}{changePct}%
            </span>
          </div>
        </div>

        <Stat label="24h High" value={
          activePair?.geckoHigh24h
            ? fmtPrice(activePair.geckoHigh24h)
            : activePair?.priceHigh24h
            ? fmtPrice(activePair.priceHigh24h)
            : activePair?.high24h
            ? fmtPrice(activePair.high24h)
            : displayPrice > 0
            ? fmtPrice(displayPrice)
            : "—"
        } valueSecondary={
          activePair?.geckoHigh24h && quoteTokenUSDRate > 0
            ? "≈ " + fmtUsdBrief(activePair.geckoHigh24h * quoteTokenUSDRate)
            : undefined
        } color="#00c853" />
        <Stat label="24h Low" value={
          activePair?.geckoLow24h
            ? fmtPrice(activePair.geckoLow24h)
            : activePair?.priceLow24h
            ? fmtPrice(activePair.priceLow24h)
            : activePair?.low24h
            ? fmtPrice(activePair.low24h)
            : displayPrice > 0
            ? fmtPrice(displayPrice)
            : "—"
        } valueSecondary={
          activePair?.geckoLow24h && quoteTokenUSDRate > 0
            ? "≈ " + fmtUsdBrief(activePair.geckoLow24h * quoteTokenUSDRate)
            : undefined
        } color="#ff1744" />
        <Stat 
          label="24h Volume" 
          value={
            activePair?.volume24h 
              ? fmtVolume(activePair.volume24h) + " " + quoteSymbol
              : "—"
          }
          valueSecondary={
            activePair?.volume24hUSD && activePair.volume24hUSD > 0
              ? "≈ " + fmtVolumeUsd(activePair.volume24hUSD)
              : undefined
          }
        />
        <Stat 
          label="Liquidity" 
          value={
            activePair?.liquidity
              ? fmtVolume(activePair.liquidity) + " " + quoteSymbol
              : "—"
          }
          valueSecondary={
            activePair?.liquidityUSD && activePair.liquidityUSD > 0
              ? "≈ " + fmtVolumeUsd(activePair.liquidityUSD)
              : undefined
          }
        />
        <div className="flex flex-col justify-center leading-none shrink-0 gap-0.5">
          <span className="text-[11px] text-[#555]">Exchange Price</span>
          <div className="flex items-center gap-2">
            <span className="text-[13px] tabular-nums font-medium" style={{ color: exchangePrice > 0 ? "#f5c518" : "#666" }}>
              {exchangePrice > 0 ? fmtPrice(exchangePrice) : "0"}
            </span>
            {exchangePrice > 0 && (
              <span className="text-[11px] tabular-nums font-medium" style={{ color: exchangeChangeColor }}>
                {exchangeChange >= 0 ? "+" : ""}{exchangeChange.toFixed(2)}%
              </span>
            )}
          </div>
          {exchangePrice > 0 && exchangePriceUSD > 0 && (
            <span className="text-[10px] tabular-nums" style={{ color: "#666" }}>
              ≈ {fmtUsdBrief(exchangePriceUSD)}
            </span>
          )}
        </div>
        
        {/* Info button */}
        <button
          onClick={() => setInfoModalOpen(true)}
          className="ml-2 w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-[#1e1e1e]"
          title="Pair Info"
        >
          <Info className="w-4 h-4 text-[#666]" />
        </button>
      </div>

      {panelOpen && (
        <PairSelectorPanel
          top={panelPos.top}
          left={panelPos.left}
          onClose={() => setPanelOpen(false)}
          onSelect={(sym, pairId) => {
            const pair = pairs.find((p) => p.id === pairId) ?? null;
            if (pair) {
              setSelectedPair(pair);
              navigate(`/trade/${pairId}`);
            }
            setPanelOpen(false);
          }}
          currentSymbol={activePair ? `${activePair.baseToken?.symbol}/${activePair.quoteToken?.symbol}` : ""}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        />
      )}

      <PairInfoModal
        pair={activePair}
        open={infoModalOpen}
        onClose={() => setInfoModalOpen(false)}
      />
    </>
  );
}
