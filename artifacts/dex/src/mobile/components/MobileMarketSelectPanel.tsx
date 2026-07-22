import { useState, useMemo } from "react";
import { X, Search, Star, Loader2 } from "lucide-react";
import { usePairs } from "@/hooks/usePairs";
import { useFlashMap } from "@/hooks/useRealtimePairs";

interface DisplayPair {
  symbol: string; base: string; quote: string; chain: string;
  baseName: string;
  price: number; priceUSD: number; change: number;
  volume: number; volumeUSD: number;
  liquidity: number; liquidityUSD: number;
  color: string; initial: string; logo: string; id: string;
  poolAddress: string; baseAddress: string; quoteAddress: string;
}

function symbolColor(s: string): string {
  const p = ["#f7931a","#627eea","#9945ff","#f3ba2f","#00aae4","#4caf50","#ff6b35","#e84142","#2a5ada","#8b5cf6","#7b61ff","#ff0420","#28a0f0","#4da2ff","#c2a633"];
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0x7fffffff;
  return p[h % p.length];
}

function chainLabel(n?: string): string {
  if (!n) return "—";
  if (n === "bsc") return "BSC";
  if (n === "base") return "Base";
  if (n === "solana") return "Solana";
  return n.charAt(0).toUpperCase() + n.slice(1);
}

function fmtCompact(n: number): string {
  if (n >= 1_000_000_000) return "$" + (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000)     return "$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000)         return "$" + (n / 1_000).toFixed(0) + "K";
  if (n === 0)            return "—";
  return "$" + n.toFixed(4);
}

function fmtQuoteAmount(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000)         return (n / 1_000).toFixed(0) + "K";
  if (n === 0)            return "—";
  return n.toFixed(4);
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
  const str = n.toFixed(20);
  const afterDot = str.split(".")[1] ?? "";
  let zeros = 0;
  for (const c of afterDot) { if (c === "0") zeros++; else break; }
  const sigRaw = afterDot.slice(zeros, zeros + 4).replace(/0+$/, "") || "0";
  if (zeros < 4) return n.toFixed(6);
  return `0.0${toSubscript(zeros - 1)}${sigRaw}`;
}

type FilterChip = "All" | "Favorites" | "Gainers" | "Losers" | "Volume" | "Trending";

const FILTER_CHIPS: FilterChip[] = ["All", "Favorites", "Gainers", "Losers", "Volume", "Trending"];

interface Props {
  onClose: () => void;
  onSelect: (pairId: string) => void;
  currentPairId: string;
}

export function MobileMarketSelectPanel({ onClose, onSelect, currentPairId }: Props) {
  const [search, setSearch]   = useState("");
  const [chip, setChip]       = useState<FilterChip>("All");
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    // Load favorites from localStorage on mount
    try {
      const saved = localStorage.getItem('mobile-market-favorites');
      if (saved) {
        return new Set(JSON.parse(saved));
      }
    } catch (err) {
      console.error('Failed to load favorites:', err);
    }
    return new Set();
  });

  const { pairs: apiPairs, loading } = usePairs();
  const flashMap = useFlashMap(); // Just read flashMap, don't create WebSocket

  const pairs = useMemo<DisplayPair[]>(() =>
    apiPairs.map(p => {
      const base  = p.baseToken?.symbol  ?? "?";
      const quote = p.quoteToken?.symbol ?? "?";
      const price = p.geckoPrice ?? p.price ?? 0;
      const priceUSD = p.geckoPriceUSD ?? p.priceUSD ?? price;
      const change = p.geckoPriceChange24h ?? 0;
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
        id:          p.id,
        symbol:      `${base}${quote}`,
        base,
        quote,
        chain:       chainLabel(p.network),
        baseName:    p.baseToken?.name ?? base,
        price,
        priceUSD,
        change,
        volume:      volumeNative,
        volumeUSD,
        liquidity:   liquidityNative,
        liquidityUSD,
        color:       symbolColor(base),
        initial:     base.charAt(0),
        logo:        p.baseToken?.logo ?? "",
        poolAddress: (p.pairAddress ?? "").toLowerCase(),
        baseAddress: (p.baseToken?.address ?? "").toLowerCase(),
        quoteAddress:(p.quoteToken?.address ?? "").toLowerCase(),
      };
    }),
    [apiPairs],
  );

  const filtered = useMemo(() => {
    let list = pairs;
    if (chip === "Favorites") list = list.filter(p => favorites.has(p.symbol));
    if (chip === "Gainers") list = list.filter(p => p.change > 0);
    if (chip === "Losers") list = list.filter(p => p.change < 0);
    if (chip === "Volume") list = [...list].sort((a, b) => b.volumeUSD - a.volumeUSD);
    if (chip === "Trending") list = [...list].sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
    // Default sort for "All" chip: sort by volume DESC (highest first) like desktop
    if (chip === "All") list = [...list].sort((a, b) => b.volumeUSD - a.volumeUSD);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const qUp = q.toUpperCase();
      list = list.filter(p =>
        p.symbol.toUpperCase().includes(qUp) ||
        p.base.toUpperCase().includes(qUp) ||
        p.baseName.toUpperCase().includes(qUp) ||
        p.poolAddress.includes(q) ||
        p.baseAddress.includes(q) ||
        p.quoteAddress.includes(q)
      );
    }
    return list;
  }, [pairs, search, chip, favorites]);

  function toggleFav(sym: string, e: React.MouseEvent) {
    e.stopPropagation();
    setFavorites(prev => {
      const next = new Set(prev);
      next.has(sym) ? next.delete(sym) : next.add(sym);
      // Save to localStorage
      try {
        localStorage.setItem('mobile-market-favorites', JSON.stringify(Array.from(next)));
      } catch (err) {
        console.error('Failed to save favorites:', err);
      }
      return next;
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ backgroundColor: "var(--m-bg)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0">
        <span className="text-[15px] font-bold" style={{ color: "var(--m-fg)" }}>Markets</span>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
          style={{ backgroundColor: "var(--m-bg-3)", color: "var(--m-fg-3)" }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pb-3 shrink-0">
        <div
          className="flex items-center gap-2.5 h-[44px] px-4 rounded-2xl"
          style={{ backgroundColor: "var(--m-bg-2)" }}
        >
          <Search className="w-4 h-4 shrink-0" style={{ color: "var(--m-fg-4)" }} />
          <input
            type="text"
            placeholder="Search markets…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent outline-none flex-1 text-[14px] placeholder:opacity-30"
            style={{ color: "var(--m-fg)" }}
            autoFocus
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="w-5 h-5 flex items-center justify-center rounded-full transition-colors"
              style={{ backgroundColor: "var(--m-bg-4)", color: "var(--m-fg-3)" }}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto scrollbar-none shrink-0">
        {FILTER_CHIPS.map(c => (
          <button
            key={c}
            onClick={() => setChip(c)}
            className="px-3.5 h-7 text-[12px] font-semibold whitespace-nowrap transition-all shrink-0 rounded-full"
            style={{
              backgroundColor: chip === c ? "#f5c518" : "var(--m-bg-2)",
              color: chip === c ? "#000" : "var(--m-fg-4)",
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Column headers */}
      <div
        className="grid px-4 py-2 text-[11px] font-semibold shrink-0"
        style={{ gridTemplateColumns: "minmax(0, 1fr) 104px 96px 96px", color: "var(--m-fg-4)" }}
      >
        <div>Symbol</div>
        <div className="text-right">Price</div>
        <div className="text-right">Volume</div>
        <div className="text-right">Liquidity</div>
      </div>

      <div className="mx-4 mb-1 rounded-full h-px" style={{ backgroundColor: "var(--m-bdr)" }} />

      {/* Pairs list */}
      <div className="flex-1 overflow-y-auto px-2">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-12" style={{ color: "var(--m-fg-4)" }}>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-[13px]">Loading markets…</span>
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "var(--m-bg-2)" }}>
              <Search className="w-5 h-5" style={{ color: "var(--m-fg-5)" }} />
            </div>
            <p className="text-[13px]" style={{ color: "var(--m-fg-4)" }}>No markets found</p>
          </div>
        )}
        {filtered.map(pair => {
          const isFav     = favorites.has(pair.symbol);
          const isCurrent = pair.id === currentPairId;
          const flash = flashMap[pair.id];
          const priceColor = flash === "up" ? "#00c853" : flash === "down" ? "#ff1744" : "var(--m-fg)";
          return (
            <button
              key={pair.id}
              onClick={() => { onSelect(pair.id); onClose(); }}
              className="w-full grid items-center gap-2 px-3 py-2.5 rounded-xl mb-0.5 transition-all active:scale-[0.98]"
              style={{ gridTemplateColumns: "minmax(0, 1fr) 104px 96px 96px", backgroundColor: isCurrent ? "var(--m-bg-3)" : "transparent" }}
              onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.backgroundColor = "var(--m-bg-2)"; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = isCurrent ? "var(--m-bg-3)" : "transparent"; }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <button className="shrink-0 p-0.5 transition-transform active:scale-90" onClick={e => toggleFav(pair.symbol, e)}>
                  <Star
                    className="w-3.5 h-3.5 transition-colors"
                    style={{ color: isFav ? "#f5c518" : "var(--m-fg-5)" }}
                    fill={isFav ? "#f5c518" : "none"}
                  />
                </button>

                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 overflow-hidden"
                  style={{ backgroundColor: pair.color + "25", border: `1.5px solid ${pair.color}40` }}
                >
                  {pair.logo ? (
                    <img src={pair.logo} alt={pair.base} className="w-6 h-6 rounded-full object-cover"
                      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <span style={{ color: pair.color }}>{pair.initial}</span>
                  )}
                </div>

                <div className="flex flex-col leading-none gap-0.5 min-w-0 text-left">
                  <span className="font-bold text-[13px] truncate" style={{ color: "var(--m-fg)" }}>
                    {pair.base}<span style={{ color: "var(--m-fg-4)", fontWeight: 400 }}>/{pair.quote}</span>
                  </span>
                  <span className="text-[10px] truncate" style={{ color: "var(--m-fg-4)" }}>{pair.baseName}</span>
                </div>
              </div>

              <div className="flex flex-col leading-none gap-0.5 text-right shrink-0">
                <div className="flex items-center justify-end gap-1.5">
                  <span 
                    className="text-[12px] tabular-nums font-semibold" 
                    style={{ 
                      color: priceColor, 
                      transition: flash ? "none" : "color 700ms ease-out",
                      textShadow: flash ? `0 0 8px ${flash === 'up' ? '#00c853' : '#ff1744'}` : "none"
                    }}
                  >
                    {fmtPrice(pair.price)}
                  </span>
                  <span
                    className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{
                      color: pair.change >= 0 ? "#00c853" : "#ff1744",
                      backgroundColor: pair.change >= 0 ? "rgba(0,200,83,0.12)" : "rgba(255,77,106,0.12)",
                    }}
                  >
                    {pair.change >= 0 ? "+" : ""}{pair.change.toFixed(2)}%
                  </span>
                </div>
                <span className="text-[10px] font-semibold tabular-nums" style={{ color: "#f8fafc" }}>
                  {fmtUsdBrief(pair.priceUSD)}
                </span>
              </div>

              <div className="flex flex-col leading-none gap-0.5 text-right shrink-0">
                <span className="text-[11px] tabular-nums font-medium" style={{ color: "var(--m-fg-2)" }}>{fmtQuoteAmount(pair.volume)}</span>
                <span className="text-[10px] font-semibold tabular-nums" style={{ color: "#f8fafc" }}>
                  {pair.volumeUSD > 0 ? fmtUsdBrief(pair.volumeUSD) : "—"}
                </span>
              </div>

              <div className="flex flex-col leading-none gap-0.5 text-right shrink-0">
                <span className="text-[11px] tabular-nums font-medium" style={{ color: "var(--m-fg-2)" }}>{pair.liquidity > 0 ? fmtQuoteAmount(pair.liquidity) : "—"}</span>
                <span className="text-[10px] font-semibold tabular-nums" style={{ color: "#f8fafc" }}>
                  {pair.liquidityUSD > 0 ? fmtUsdBrief(pair.liquidityUSD) : "—"}
                </span>
              </div>
            </button>
          );
        })}
        <div className="h-4" />
      </div>
    </div>
  );
}
