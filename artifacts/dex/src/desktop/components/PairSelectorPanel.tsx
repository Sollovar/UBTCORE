import { useState, useRef, useEffect, useMemo } from "react";
import { Star, Search, X, Loader2 } from "lucide-react";
import { usePairs } from "@/hooks/usePairs";
import { useFlashMap } from "@/hooks/useRealtimePairs";
import type { Pair as APIPair } from "@/types";
import { generateSparkline } from "@/utils/mockData";

interface DisplayPair {
  id: string;
  symbol: string;
  base: string;
  quote: string;
  chain: string;
  lastPrice: number;
  priceUSD: number;
  change24h: number;
  volume: number;
  volumeUSD: number;
  liquidity: number;
  liquidityUSD: number;
  marketCap: number;
  spark7d: number[];
  color: string;
  logo: string;
  quoteLogo: string;
  starred: boolean;
  poolAddress: string;
  baseAddress: string;
  quoteAddress: string;
}

function symbolColor(symbol: string): string {
  const palette = [
    "#f7931a","#627eea","#9945ff","#f3ba2f","#00aae4",
    "#4caf50","#ff6b35","#e84142","#2a5ada","#8b5cf6",
    "#7b61ff","#ff0420","#28a0f0","#4da2ff","#c2a633",
  ];
  let h = 0;
  for (let i = 0; i < symbol.length; i++) h = (h * 31 + symbol.charCodeAt(i)) & 0x7fffffff;
  return palette[h % palette.length];
}

function chainLabel(network?: string): string {
  if (!network) return "—";
  if (network === "bsc") return "BSC";
  if (network === "base") return "Base";
  if (network === "solana") return "Solana";
  return network.charAt(0).toUpperCase() + network.slice(1);
}

function makeSparkline(basePrice: number, change: number, seedText: string): number[] {
  let seed = 0;
  for (let i = 0; i < seedText.length; i++) {
    seed = (seed * 31 + seedText.charCodeAt(i)) >>> 0;
  }
  return generateSparkline(basePrice || 1, change, seed);
}

function Sparkline({ data, color, w = 62, h = 20 }: { data: number[]; color: string; w?: number; h?: number }) {
  if (data.length < 2) return <div style={{ width: w, height: h }} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 2;
  const coords = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - pad - ((v - min) / range) * (h - pad * 2),
  }));
  const line = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const area = `M${coords[0].x},${coords[0].y} ` + coords.slice(1).map((c) => `L${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ") + ` L${w},${h} L0,${h} Z`;
  const id = `spark-${color.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block", overflow: "hidden" }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.24} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function apiPairToDisplay(p: APIPair, starred: boolean): DisplayPair {
  const base = p.baseToken?.symbol || "?";
  const quote = p.quoteToken?.symbol || "?";
  const price = p.geckoPrice ?? p.price ?? 0;
  const priceUSD = p.geckoPriceUSD ?? p.priceUSD ?? price;
  const change24h = p.geckoPriceChange24h ?? 0;
  const marketCap = p.geckoMarketCapUSD ?? p.marketCapUSD ?? p.geckoMarketCap ?? p.marketCap ?? 0;

  const volumeNative = p.volume24h ?? 0;
  const usdRate = (p.priceUSD && p.price && p.price > 0) ? p.priceUSD / p.price : 0;
  const volumeUSD = (p.volume24hUSD && p.volume24hUSD > 0)
    ? p.volume24hUSD
    : (volumeNative > 0 && usdRate > 0 ? volumeNative * usdRate : 0);

  const liquidityNative = p.liquidity ?? 0;
  const liquidityUSD = (p.liquidityUSD && p.liquidityUSD > 0)
    ? p.liquidityUSD
    : (liquidityNative > 0 && usdRate > 0 ? liquidityNative * usdRate : 0);

  return {
    id: p.id,
    symbol: `${base}/${quote}`,
    base,
    quote,
    chain: chainLabel(p.network),
    lastPrice: price,
    priceUSD,
    change24h,
    volume: volumeNative,
    volumeUSD,
    liquidity: liquidityNative,
    liquidityUSD,
    marketCap,
    spark7d: makeSparkline(priceUSD || price || 1, change24h, p.id),
    color: symbolColor(base),
    logo: p.baseToken?.logo || "",
    quoteLogo: p.quoteToken?.logo || "",
    starred,
    poolAddress: (p.pairAddress ?? "").toLowerCase(),
    baseAddress: (p.baseToken?.address ?? "").toLowerCase(),
    quoteAddress: (p.quoteToken?.address ?? "").toLowerCase(),
  };
}

function fmtNum(n: number) {
  if (n >= 1_000_000_000) return "$" + (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000)     return "$" + (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)         return "$" + (n / 1_000).toFixed(1) + "K";
  if (n === 0)            return "—";
  return "$" + n.toFixed(4);
}

// Format native token amounts (without $ sign, with proper decimals for small amounts)
function fmtNativeToken(n: number) {
  if (n === 0) return "0";
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000)         return (n / 1_000).toFixed(2) + "K";
  if (n >= 1)             return n.toFixed(4);
  // Small amounts - show enough decimals
  if (n >= 0.01)          return n.toFixed(4);
  if (n >= 0.001)         return n.toFixed(5);
  if (n >= 0.0001)        return n.toFixed(6);
  if (n >= 0.00001)       return n.toFixed(7);
  if (n >= 0.000001)      return n.toFixed(8);
  return n.toFixed(10);
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

const FILTER_TABS = ["All", "Favorites", "Gainers", "Losers", "Volume", "Trending"] as const;
type FilterTab = (typeof FILTER_TABS)[number];

interface Props {
  top: number;
  left: number;
  onClose: () => void;
  onSelect: (symbol: string, pairId: string) => void;
  currentSymbol: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export function PairSelectorPanel({ top, left, onClose, onSelect, currentSymbol, onMouseEnter, onMouseLeave }: Props) {
  const [query, setQuery]           = useState("");
  const [filterTab, setFilterTab]   = useState<FilterTab>("All");
  const [starred, setStarred]       = useState<Set<string>>(() => {
    // Load starred pairs from localStorage on mount
    try {
      const saved = localStorage.getItem('desktop-starred-pairs');
      if (saved) {
        return new Set(JSON.parse(saved));
      }
    } catch (err) {
      console.error('Failed to load starred pairs:', err);
    }
    return new Set();
  });
  const inputRef  = useRef<HTMLInputElement>(null);
  const panelRef  = useRef<HTMLDivElement>(null);

  const { pairs: apiPairs, loading } = usePairs();
  const flashMap = useFlashMap(); // Just read flashMap, don't create WebSocket

  const displayPairs = useMemo<DisplayPair[]>(() =>
    apiPairs.map((p) => apiPairToDisplay(p, starred.has(p.id))),
    [apiPairs, starred],
  );

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onClose]);

  const q = query.toLowerCase();
  const filtered = displayPairs.filter((p) =>
    p.symbol.toLowerCase().includes(q) ||
    p.base.toLowerCase().includes(q) ||
    p.poolAddress.includes(q) ||
    p.baseAddress.includes(q) ||
    p.quoteAddress.includes(q)
  );

  const displayed = useMemo(() => {
    let list = filtered;
    if (filterTab === "Favorites") list = list.filter((p) => p.starred);
    if (filterTab === "Gainers") list = list.filter((p) => p.change24h > 0);
    if (filterTab === "Losers") list = list.filter((p) => p.change24h < 0);
    if (filterTab === "Volume") list = [...list].sort((a, b) => b.volumeUSD - a.volumeUSD);
    if (filterTab === "Trending") list = [...list].sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h));
    // Default sort for "All" tab: sort by volume DESC (highest first) like mobile markets page
    if (filterTab === "All") list = [...list].sort((a, b) => b.volumeUSD - a.volumeUSD);
    return list;
  }, [filtered, filterTab]);

  function toggleStar(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setStarred((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      // Save to localStorage
      try {
        localStorage.setItem('desktop-starred-pairs', JSON.stringify(Array.from(next)));
      } catch (err) {
        console.error('Failed to save starred pairs:', err);
      }
      return next;
    });
  }

  return (
    <div
      ref={panelRef}
      data-testid="pair-selector-panel"
      style={{ position: "fixed", top, left, width: 700, maxHeight: 500, zIndex: 9999 }}
      className="bg-[#000000] border border-[#252525] shadow-2xl shadow-black/90 flex flex-col"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Search */}
      <div className="flex items-center gap-2 px-3 h-[38px] border-b border-[#1a1a1a] shrink-0">
        <Search className="w-3.5 h-3.5 text-[#444] shrink-0" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search pair or token"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-transparent outline-none text-[13px] text-white placeholder:text-[#333]"
        />
        {query && (
          <button onClick={() => setQuery("")} className="text-[#444] hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 px-2 py-2 border-b border-[#1a1a1a] overflow-x-auto shrink-0" style={{ scrollbarWidth: "none" }}>
        {FILTER_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setFilterTab(tab)}
            className={`px-2.5 py-1 text-[11px] rounded shrink-0 transition-colors ${
              filterTab === tab
                ? "bg-[#f5c518]/15 text-[#f5c518] font-semibold"
                : "text-[#555] hover:text-[#bbb] hover:bg-[#181818]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Column headers */}
      <div
        className="grid items-center px-3 py-1.5 text-[10px] text-[#444] border-b border-[#141414] shrink-0"
        style={{ gridTemplateColumns: "200px 1fr 0.9fr 1.1fr 1.1fr 1.1fr 0.9fr" }}
      >
        <span>Symbols</span>
        <span className="text-right">Last price</span>
        <span className="text-right">24h change</span>
        <span className="text-right">Volume</span>
        <span className="text-right">Liquidity</span>
        <span className="text-right">Market Cap</span>
        <span className="text-right">7d</span>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#222 transparent" }}>
        {loading && (
          <div className="flex items-center justify-center gap-2 py-8 text-[#444] text-xs">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Loading pairs…
          </div>
        )}
        {!loading && displayed.length === 0 && (
          <div className="flex items-center justify-center py-8 text-[#333] text-xs">No pairs found</div>
        )}
        {displayed.map((pair) => {
          const isSelected = pair.symbol === currentSymbol;
          const flash = flashMap[pair.id];
          const priceColor = flash === "up" ? "#00c853" : flash === "down" ? "#ff1744" : "#f5f5f5";
          return (
            <div
              key={pair.id}
              onClick={() => { onSelect(pair.symbol, pair.id); onClose(); }}
              data-testid={`pair-row-${pair.base}`}
              className={`grid items-center px-3 cursor-pointer transition-colors hover:bg-[#151515] border-b border-[#111] ${
                isSelected ? "bg-[#151515]" : ""
              }`}
              style={{ gridTemplateColumns: "200px 1fr 0.9fr 1.1fr 1.1fr 1.1fr 0.9fr", minHeight: "42px" }}
            >
              {/* Symbol */}
              <div className="flex items-center gap-2 min-w-0">
                <button
                  onClick={(e) => toggleStar(e, pair.id)}
                  className={`shrink-0 transition-colors ${pair.starred ? "text-[#f5c518]" : "text-[#2a2a2a] hover:text-[#555]"}`}
                >
                  <Star className="w-3.5 h-3.5" fill={pair.starred ? "#f5c518" : "none"} />
                </button>
                <div className="relative shrink-0" style={{ width: 28, height: 28 }}>
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center overflow-hidden"
                    style={{ backgroundColor: pair.color + "22" }}
                  >
                    {pair.logo ? (
                      <img src={pair.logo} alt={pair.base} className="w-5 h-5 rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <span className="text-[10px] font-bold" style={{ color: pair.color }}>
                        {pair.base.charAt(0)}
                      </span>
                    )}
                  </div>
                  {pair.quoteLogo && (
                    <div
                      className="absolute rounded-full overflow-hidden"
                      style={{ width: 15, height: 15, bottom: 0, right: 0, border: "1.5px solid #000", backgroundColor: "#0a0a0a" }}
                    >
                      <img 
                        src={pair.quoteLogo} 
                        alt={pair.quote} 
                        className="w-full h-full rounded-full object-cover"
                        onError={(e) => { const p = (e.target as HTMLImageElement).parentElement; if (p) p.style.display = "none"; }}
                      />
                    </div>
                  )}
                </div>
                <div className="flex flex-col leading-none min-w-0">
                  <span className="text-white font-semibold text-[12px]">{pair.symbol.replace("/", "")}</span>
                  <span className="text-[#3a3a3a] text-[10px] mt-0.5">{pair.chain}</span>
                </div>
              </div>

              <div className="text-right flex flex-col gap-0.5">
                <span 
                  className="tabular-nums text-[12px]" 
                  style={{ 
                    color: priceColor,
                    transition: flash ? "none" : "color 700ms ease-out",
                    textShadow: flash ? `0 0 8px ${flash === 'up' ? '#00c853' : '#ff1744'}` : "none"
                  }}
                >
                  {fmtPrice(pair.lastPrice)}
                </span>
                <span className="tabular-nums text-[#555] text-[10px]">
                  {fmtUsdBrief(pair.priceUSD)}
                </span>
              </div>

              <div
                className="text-right tabular-nums font-semibold text-[12px]"
                style={{ color: pair.change24h >= 0 ? "#00c853" : "#ff1744" }}
              >
                {pair.change24h >= 0 ? "+" : ""}{pair.change24h.toFixed(2)}%
              </div>

              <div className="text-right flex flex-col gap-0.5">
                <span className="tabular-nums text-[#ccc] text-[11px]">
                  {fmtNativeToken(pair.volume)}
                </span>
                <span className="tabular-nums text-[#555] text-[10px]">
                  {fmtUsdBrief(pair.volumeUSD)}
                </span>
              </div>

              <div className="text-right flex flex-col gap-0.5">
                <span className="tabular-nums text-[#ccc] text-[11px]">
                  {fmtNativeToken(pair.liquidity)}
                </span>
                <span className="tabular-nums text-[#555] text-[10px]">
                  {fmtUsdBrief(pair.liquidityUSD)}
                </span>
              </div>

              <div className="text-right tabular-nums text-[#555] text-[11px]">
                {fmtNum(pair.marketCap)}
              </div>

              <div className="flex justify-end">
                <Sparkline 
                  data={pair.spark7d} 
                  color={pair.change24h >= 0 ? "#00c853" : "#ff1744"} 
                  w={62} 
                  h={20} 
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
