import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useTranslation } from "@/i18n/i18n";
import { Search, Star, TrendingUp, TrendingDown, X, Flame, Zap, LayoutList, BarChart2, Bell, Loader2 } from "lucide-react";
import { MobilePriceAlertSheet, PriceAlert } from "./MobilePriceAlertSheet";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { LiveMarketState } from "@/hooks/useLiveMarket";
import { FlashMap } from "@/hooks/useRealtimePairs";
import { MobilePairHeader } from "./MobilePairHeader";
import { MobileChartView } from "./MobileChartView";
import { MobileOrderBookView } from "./MobileOrderBookView";
import { MobileTradesView } from "./MobileTradesView";
import { usePairs } from "@/hooks/usePairs";
import { MobilePairInfoPanel } from "./MobilePairInfoPanel";
import { generateSparkline } from "@/utils/mockData";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";

/* ─────────────────────────── data ─────────────────────────── */
interface DisplayPair {
  id: string; symbol: string; base: string; quote: string; chain: string;
  baseName: string;
  price: number; priceUSD: number; change: number;
  volume: number;     // native quote token amount
  volumeUSD: number;  // USD equivalent
  liquidity: number;  // native quote token amount (from orderbook)
  liquidityUSD: number; // USD equivalent
  marketCap: number;
  high24h: number; low24h: number;
  color: string; initial: string; logo: string; quoteLogo: string;
  spark7d: number[];
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

function makeSpark(base: number, change: number, seedText: string): number[] {
  let seed = 0;
  for (let i = 0; i < seedText.length; i++) {
    seed = (seed * 31 + seedText.charCodeAt(i)) >>> 0;
  }
  return generateSparkline(base, change, seed);
}

type FilterTab = "All" | "Favorites" | "Gainers" | "Losers";
type MainTab   = "Chart" | "Order Book" | "Trades" | "Info";

/* ─────────────────────────── helpers ──────────────────────── */
function fmtCompact(n: number) {
  if (n >= 1_000_000_000) return "$" + (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000)     return "$" + (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)         return "$" + (n / 1_000).toFixed(0) + "K";
  if (n === 0)            return "—";
  return "$" + n.toFixed(4);
}

function fmtQuoteAmount(n: number) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)         return (n / 1_000).toFixed(0) + "K";
  if (n === 0)            return "—";
  return n.toFixed(4);
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

/* ─────────────────────────── sparkline ────────────────────── */
function Spark({ data, color, w = 56, h = 24 }: { data: number[]; color: string; w?: number; h?: number }) {
  if (data.length < 2) return <div style={{ width: w, height: h }} />;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pad = 2;
  const coords = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - pad - ((v - min) / range) * (h - pad * 2),
  }));
  const line = coords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const area = `M${coords[0].x},${coords[0].y} ` +
    coords.slice(1).map(c => `L${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ") +
    ` L${w},${h} L0,${h} Z`;
  const gid = `sp-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block", overflow: "hidden" }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0}    />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/* ─────────────────────────── movers card ──────────────────── */
function MoverCard({ p, flash, onSelect }: { p: DisplayPair; flash?: "up" | "down" | null; onSelect: () => void }) {
  const up = p.change >= 0;
  const priceColor = flash === "up"   ? "#00ff7f"
                   : flash === "down" ? "#ff4d6a"
                   : "var(--m-fg)";
  return (
    <button
      onClick={onSelect}
      className="flex flex-col gap-1 px-3 py-2.5 rounded-2xl shrink-0 transition-all active:scale-95"
      style={{ backgroundColor:"var(--m-bg-2)", border:"1px solid var(--m-bdr)", minWidth: 90 }}
    >
      <div className="flex items-center gap-1.5">
        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 overflow-hidden"
          style={{ backgroundColor: p.color + "30", color: p.color }}>
          {p.logo ? (
            <img src={p.logo} alt={p.base} className="w-4 h-4 rounded-full object-cover"
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
          ) : p.initial}
        </div>
        <span className="text-[11px] font-bold" style={{ color:"var(--m-fg)" }}>{p.base}</span>
      </div>
      <span
        className="text-[12px] font-semibold"
        style={{ 
          color: priceColor, 
          transition: flash ? "none" : "color 700ms ease-out",
          textShadow: flash ? `0 0 8px ${flash === 'up' ? '#00ff7f' : '#ff4d6a'}` : "none"
        }}
      >
        {fmtPrice(p.price)}
      </span>
      <span className="text-[9px] tabular-nums" style={{ color:"var(--m-fg-3)" }}>{fmtUsdBrief(p.priceUSD)}</span>
      <span className="text-[11px] font-bold flex items-center gap-0.5" style={{ color: up ? "#00c853" : "#ff4d6a" }}>
        {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {up ? "+" : ""}{p.change.toFixed(2)}%
      </span>
    </button>
  );
}

/* ─────────────────────────── props ────────────────────────── */
interface Props {
  market: LiveMarketState;
  currentPairId: string;
  flashMap?: FlashMap;
  onSelectPair?: (pairId: string) => void;
  onOpenMarketPanel?: () => void;
}

/* ═══════════════════════════ component ════════════════════════ */
export function MobileMarketsPage({ market, currentPairId, flashMap = {}, onSelectPair, onOpenMarketPanel }: Props) {
  const { t } = useTranslation();
  const { primaryWallet } = useDynamicContext();
  const [view,      setView]      = useState<"pairs" | "chart">("pairs");
  const [search,    setSearch]    = useState("");
  const [tab,       setTab]       = useState<FilterTab>("All");
  const [sortBy,    setSortBy]    = useState<"volume" | "change" | "price" | "liquidity" | "marketCap">("volume");
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    // Load favorites from localStorage on mount
    try {
      const saved = localStorage.getItem('mobile-markets-favorites');
      if (saved) {
        return new Set(JSON.parse(saved));
      }
    } catch (err) {
      console.error('Failed to load favorites:', err);
    }
    return new Set();
  });
  const [mainTab,   setMainTab]   = useState<MainTab>("Chart");
  const [alerts,    setAlerts]    = useState<Record<string, PriceAlert[]>>({});
  const [alertPair, setAlertPair] = useState<DisplayPair | null>(null);
  const pressTimer      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressMove       = useRef(false);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef   = useRef<HTMLDivElement>(null);

  const { pairs: apiPairs, loading } = usePairs();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const triggeredAlertsRef = useRef<Set<string>>(new Set());

  const pairs = useMemo<DisplayPair[]>(() =>
    apiPairs.map(p => {
      const base  = p.baseToken?.symbol  ?? "?";
      const quote = p.quoteToken?.symbol ?? "?";

      // Always use GeckoTerminal price and change for the market page display —
      // even after trades. The exchange price overwrites p.price via WS, so we
      // must fall back to geckoPrice which is set once from the API and never
      // overwritten by real-time WS events.
      const price    = p.geckoPrice       ?? p.price    ?? 0;
      const priceUSD = p.geckoPriceUSD    ?? p.priceUSD ?? price;
      const change   = p.geckoPriceChange24h ?? 0;

      // Volume: native quote token amount + USD equivalent.
      // After a fill, volume24hUSD may arrive as "0" from the ticker if the
      // Chainlink call failed. Fall back to deriving it from the native volume
      // using the gecko USD rate (priceUSD / price = quote token USD rate).
      const volumeNative = p.volume24h ?? 0;
      const usdRate = (p.priceUSD && p.price && p.price > 0) ? p.priceUSD / p.price : 0;
      const volumeUSD    = (p.volume24hUSD && p.volume24hUSD > 0)
        ? p.volume24hUSD
        : (volumeNative > 0 && usdRate > 0 ? volumeNative * usdRate : 0);

      // Liquidity: ONLY from backend orderbook (signed user orders).
      const liquidityNative = p.liquidity    ?? 0;
      const liquidityUSD    = (p.liquidityUSD && p.liquidityUSD > 0)
        ? p.liquidityUSD
        : (liquidityNative > 0 && usdRate > 0 ? liquidityNative * usdRate : 0);

      // 24h high/low: Use GeckoTerminal calculated values (from price_history)
      // These are calculated by price-worker from actual price history data
      const high24h = p.geckoHigh24h ?? p.high24h ?? priceUSD;
      const low24h  = p.geckoLow24h  ?? p.low24h  ?? priceUSD;

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
        marketCap:   p.geckoMarketCapUSD ?? p.marketCapUSD ?? p.geckoMarketCap ?? p.marketCap ?? 0,
        high24h,
        low24h,
        color:       symbolColor(base),
        initial:     base.charAt(0),
        logo:        p.baseToken?.logo ?? "",
        quoteLogo:   p.quoteToken?.logo ?? "",
        spark7d:     makeSpark(priceUSD || price || 1, change, p.id),
        poolAddress: (p.pairAddress ?? "").toLowerCase(),
        baseAddress: (p.baseToken?.address ?? "").toLowerCase(),
        quoteAddress:(p.quoteToken?.address ?? "").toLowerCase(),
      };
    }),
    [apiPairs],
  );

  const onBodyScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (headerScrollRef.current) headerScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
  }, []);

  useEffect(() => {
    if (!pairs.length) return;

    Object.entries(alerts).forEach(([symbol, symbolAlerts]) => {
      const pair = pairs.find((p) => p.symbol === symbol);
      if (!pair) return;

      symbolAlerts.forEach((alert) => {
        if (triggeredAlertsRef.current.has(alert.id)) return;
        const price = pair.price;
        const crossedAbove = alert.direction === 'above' && price >= alert.target;
        const crossedBelow = alert.direction === 'below' && price <= alert.target;
        if (!crossedAbove && !crossedBelow) return;

        const readablePrice = alert.target >= 10000
          ? alert.target.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
          : alert.target >= 100
            ? alert.target.toFixed(2)
            : alert.target.toFixed(6);

        addNotification({
          type: 'price',
          title: 'Price Alert',
          body: `${alert.base}/${pair.quote} has ${alert.direction === 'above' ? 'risen above' : 'fallen below'} $${readablePrice}`,
        });

        triggeredAlertsRef.current.add(alert.id);
        setAlerts((prev) => ({
          ...prev,
          [symbol]: prev[symbol].filter((item) => item.id !== alert.id),
        }));
      });
    });
  }, [alerts, pairs, addNotification]);

  const onHeaderScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (bodyScrollRef.current) bodyScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
  }, []);

  const startPress = useCallback((pair: DisplayPair) => {
    pressMove.current = false;
    pressTimer.current = setTimeout(() => {
      if (!pressMove.current) setAlertPair(pair);
    }, 500);
  }, []);

  const cancelPress = useCallback(() => {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
  }, []);

  function addAlert(alert: PriceAlert) {
    setAlerts(prev => ({ ...prev, [alert.symbol]: [...(prev[alert.symbol] ?? []), alert] }));
  }

  function removeAlert(symbol: string, id: string) {
    setAlerts(prev => {
      const next = (prev[symbol] ?? []).filter(a => a.id !== id);
      return { ...prev, [symbol]: next };
    });
  }

  /* When user taps a pair row: update selection AND switch to chart view */
  function handlePairRowClick(pairId: string) {
    onSelectPair?.(pairId);
    setView("chart");
  }

  const topGainers = useMemo(() => [...pairs].sort((a,b) => b.change - a.change).slice(0,4), [pairs]);
  const topLosers  = useMemo(() => [...pairs].filter(p => p.change < 0).sort((a,b) => a.change - b.change).slice(0,4), [pairs]);

  const filtered = useMemo(() => {
    let list = [...pairs];
    if (tab === "Favorites") list = list.filter(p => favorites.has(p.symbol));
    if (tab === "Gainers")   list = list.filter(p => p.change > 0);
    if (tab === "Losers")    list = list.filter(p => p.change < 0);
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
    if (sortBy === "volume")    list.sort((a,b) => b.volumeUSD    - a.volumeUSD);
    if (sortBy === "change")    list.sort((a,b) => b.change       - a.change);
    if (sortBy === "price")     list.sort((a,b) => b.priceUSD     - a.priceUSD);
    if (sortBy === "liquidity") list.sort((a,b) => b.liquidityUSD - a.liquidityUSD);
    if (sortBy === "marketCap") list.sort((a,b) => b.marketCap    - a.marketCap);
    return list;
  }, [pairs, tab, search, favorites, sortBy]);

  function toggleFav(sym: string, e: React.MouseEvent) {
    e.stopPropagation();
    setFavorites(prev => { 
      const n = new Set(prev); 
      n.has(sym) ? n.delete(sym) : n.add(sym); 
      // Save to localStorage
      try {
        localStorage.setItem('mobile-markets-favorites', JSON.stringify(Array.from(n)));
      } catch (err) {
        console.error('Failed to save favorites:', err);
      }
      return n; 
    });
  }

  /* ── shared header (always visible) ── */
  const Header = (
    <div className="px-4 pt-3 pb-2 shrink-0" style={{ borderBottom:"1px solid var(--m-bdr)" }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[18px] font-bold" style={{ color:"var(--m-fg)" }}>Markets</p>
        <div className="flex items-center rounded-xl p-0.5" style={{ backgroundColor:"var(--m-bg-2)" }}>
          <button
            onClick={() => setView("pairs")}
            className="flex items-center gap-1.5 px-3 h-7 rounded-lg text-[12px] font-semibold transition-all"
            style={{
              backgroundColor: view === "pairs" ? "var(--m-bg-4)" : "transparent",
              color: view === "pairs" ? "var(--m-fg)" : "var(--m-fg-4)",
            }}
          >
            <LayoutList className="w-3.5 h-3.5" />
            Pairs
          </button>
          <button
            onClick={() => setView("chart")}
            className="flex items-center gap-1.5 px-3 h-7 rounded-lg text-[12px] font-semibold transition-all"
            style={{
              backgroundColor: view === "chart" ? "var(--m-bg-4)" : "transparent",
              color: view === "chart" ? "var(--m-fg)" : "var(--m-fg-4)",
            }}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            Chart
          </button>
        </div>
      </div>

      {view === "pairs" && (
        <>
          <div className="flex items-center gap-2.5 h-[40px] px-3 rounded-2xl mb-3" style={{ backgroundColor:"var(--m-bg-2)" }}>
            <Search className="w-4 h-4 shrink-0" style={{ color:"var(--m-fg-4)" }} />
            <input
              type="text"
              placeholder={t('markets.search')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent outline-none flex-1 text-[13px] placeholder:opacity-30"
              style={{ color:"var(--m-fg)" }}
            />
            {search && (
              <button onClick={() => setSearch("")}>
                <X className="w-3.5 h-3.5" style={{ color:"var(--m-fg-5)" }} />
              </button>
            )}
          </div>
          <div className="flex gap-1.5">
            {(["All","Favorites","Gainers","Losers"] as FilterTab[]).map(ft => {
              const ftLabel = ft === "All"       ? t('markets.tab.all')
                            : ft === "Favorites" ? t('markets.tab.favorites')
                            : ft === "Gainers"   ? t('markets.tab.gainers')
                            :                      t('markets.tab.losers');
              return (
              <button key={ft} onClick={() => setTab(ft)}
                className="px-3 h-7 rounded-full text-[12px] font-semibold transition-all shrink-0"
                style={{ backgroundColor: tab===ft ? "#f5c518" : "var(--m-bg-2)", color: tab===ft ? "#000" : "var(--m-fg-4)" }}>
                {ftLabel}
              </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );

  /* ════════════════ CHART VIEW ════════════════ */
  if (view === "chart") {
    return (
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {Header}
        <MobilePairHeader
          market={market}
          currentSymbol={apiPairs.find(p => p.id === currentPairId)?.baseToken?.symbol ?? ""}
          pair={apiPairs.find(p => p.id === currentPairId) ?? apiPairs[0] ?? null}
          flash={flashMap[currentPairId] ?? null}
          onOpenMarketPanel={() => onOpenMarketPanel?.()}
        />
        <div
          className="flex items-center h-[40px] shrink-0"
          style={{ backgroundColor:"var(--m-bg-1)", borderBottom:"1px solid var(--m-bdr)" }}
        >
          {(["Chart","Order Book","Trades","Info"] as MainTab[]).map(t => (
            <button key={t} onClick={() => setMainTab(t)}
              className="flex-1 h-full text-[13px] font-semibold transition-all relative"
              style={{ color: mainTab===t ? "var(--m-fg)" : "var(--m-fg-4)" }}
            >
              {t}
              {mainTab === t && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] rounded-full"
                  style={{ backgroundColor:"#f5c518", width:"60%" }} />
              )}
            </button>
          ))}
        </div>
        <div className="flex-1 min-h-0 overflow-hidden" style={{ paddingBottom:60 }}>
          {mainTab === "Chart"      && (() => {
            const cp = apiPairs.find(p => p.id === currentPairId) ?? apiPairs[0];
            return (
              <MobileChartView
                livePrice={market.price}
                pairId={currentPairId ?? undefined}
                pairAddress={cp?.pairAddress}
                network={cp?.network}
              />
            );
          })()}
          {mainTab === "Order Book" && (() => {
            const cp2 = apiPairs.find(p => p.id === currentPairId) ?? apiPairs[0];
            return (
              <MobileOrderBookView
                market={market}
                walletAddress={(primaryWallet as any)?.address as string | undefined}
                pairId={currentPairId ?? undefined}
                baseSymbol={cp2?.baseToken?.symbol}
                quoteSymbol={cp2?.quoteToken?.symbol}
              />
            );
          })()}
          {mainTab === "Trades"     && <MobileTradesView market={market} pairId={currentPairId ?? undefined} />}
          {mainTab === "Info"       && (
            <MobilePairInfoPanel
              pair={apiPairs.find(p => p.id === currentPairId) ?? apiPairs[0] ?? null}
            />
          )}
        </div>
      </div>
    );
  }

  /* ════════════════ PAIRS VIEW ════════════════ */
  const COL_HEADER = "text-[10px] font-bold uppercase tracking-wide whitespace-nowrap";

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden" style={{ paddingBottom:60 }}>
      {Header}

      <div className="flex-1 overflow-y-auto">

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center gap-2 py-16" style={{ color:"var(--m-fg-4)" }}>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-[13px]">Loading markets…</span>
          </div>
        )}

        {/* Top movers — only on All tab, no search, after load */}
        {!loading && tab === "All" && !search && (
          <div className="px-3 pt-3">
            {topGainers.length > 0 && (
              <>
                <div className="flex items-center gap-1.5 mb-2">
                  <Flame className="w-3.5 h-3.5 text-[#f5c518]" />
                  <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color:"var(--m-fg-4)" }}>Top Gainers</span>
                </div>
                <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 mb-3" data-no-swipe="true">
                  {topGainers.map(p => <MoverCard key={p.id} p={p} flash={flashMap[p.id]} onSelect={() => handlePairRowClick(p.id)} />)}
                </div>
              </>
            )}
            {topLosers.length > 0 && (
              <>
                <div className="flex items-center gap-1.5 mb-2">
                  <Zap className="w-3.5 h-3.5" style={{ color:"#ff4d6a" }} />
                  <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color:"var(--m-fg-4)" }}>Top Losers</span>
                </div>
                <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 mb-2" data-no-swipe="true">
                  {topLosers.map(p => <MoverCard key={p.id} p={p} flash={flashMap[p.id]} onSelect={() => handlePairRowClick(p.id)} />)}
                </div>
              </>
            )}
            {(topGainers.length > 0 || topLosers.length > 0) && (
              <div className="h-px mx-1 mb-1" style={{ backgroundColor:"var(--m-bdr)" }} />
            )}
          </div>
        )}

        {/* ── Pairs table ── */}
        {!loading && filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-2">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor:"var(--m-bg-2)" }}>
              <Search className="w-5 h-5" style={{ color:"var(--m-fg-5)" }} />
            </div>
            <p className="text-[13px]" style={{ color:"var(--m-fg-4)" }}>No pairs found</p>
          </div>
        ) : !loading ? (
          <>
          {/* ── Column header ── */}
          <div
            ref={headerScrollRef}
            className="sticky top-0 z-20 overflow-x-auto scrollbar-none"
            style={{ backgroundColor:"var(--m-bg)", borderBottom:"1px solid var(--m-bdr)" }}
            onScroll={onHeaderScroll}
            data-no-swipe="true"
          >
            <div className="flex items-center" style={{ minWidth: 760, height: 34 }}>
              <div
                className="flex items-center shrink-0 pl-3 pr-2 sticky left-0 z-30 h-full"
                style={{ backgroundColor:"var(--m-bg)", width:148 }}
              >
                <span className={COL_HEADER} style={{ color:"var(--m-fg-5)" }}>Symbol</span>
              </div>
              <div className="flex items-center flex-1 gap-0">
                {(["price","change","volume","liquidity","marketCap","7d"] as const).map(col => (
                  <button
                    key={col}
                    onClick={() => col !== "7d" && setSortBy(col as any)}
                    className={`${COL_HEADER} text-right transition-colors`}
                    style={{
                      width: col === "7d" ? 68 : col === "price" ? 78 : col === "marketCap" ? 92 : 74,
                      paddingRight: 8,
                      color: sortBy === col ? "#f5c518" : "var(--m-fg-5)",
                      cursor: col === "7d" ? "default" : "pointer",
                      flexShrink: 0,
                    }}
                  >
                    {col === "change" ? "24h %" : col === "volume" ? "Vol" : col === "liquidity" ? "Liq" : col === "marketCap" ? "MCap" : col === "price" ? "Price" : "7d"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Pair rows ── */}
          <div ref={bodyScrollRef} className="overflow-x-auto" onScroll={onBodyScroll} data-no-swipe="true">
            <div style={{ minWidth: 760 }}>
              {filtered.map(pair => {
                const isFav      = favorites.has(pair.symbol);
                const up         = pair.change >= 0;
                const sparkColor = up ? "#00c853" : "#ff4d6a";
                const pairAlerts = alerts[pair.symbol] ?? [];
                const hasAlerts  = pairAlerts.length > 0;

                return (
                  <div
                    key={pair.id}
                    className="flex items-center transition-colors active:opacity-70 select-none"
                    style={{ height:70, borderBottom:"1px solid var(--m-bdr)" }}
                    onClick={() => handlePairRowClick(pair.id)}
                    onTouchStart={() => startPress(pair)}
                    onTouchMove={() => { pressMove.current = true; cancelPress(); }}
                    onTouchEnd={cancelPress}
                    onTouchCancel={cancelPress}
                  >
                    {/* ── Sticky LEFT: star + icon + symbol ── */}
                    <div
                      className="flex items-center gap-1.5 shrink-0 sticky left-0 z-10 h-full pl-2 pr-2"
                      style={{ backgroundColor:"var(--m-bg)", width:148 }}
                    >
                      <button
                        className="shrink-0 p-0.5 transition-transform active:scale-90"
                        onClick={e => toggleFav(pair.symbol, e)}
                      >
                        <Star className="w-3.5 h-3.5" style={{ color: isFav ? "#f5c518" : "var(--m-fg-5)" }} fill={isFav ? "#f5c518" : "none"} />
                      </button>
                      {/* Dual logo: base full + quote overlapping bottom-right */}
                      <div className="relative shrink-0" style={{ width: 34, height: 28 }}>
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold overflow-hidden absolute top-0 left-0"
                          style={{ backgroundColor: pair.color + "25", border:`1.5px solid ${pair.color}40` }}
                        >
                          {pair.logo ? (
                            <img src={pair.logo} alt={pair.base} className="w-full h-full rounded-full object-cover"
                              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          ) : (
                            <span style={{ color: pair.color }}>{pair.initial}</span>
                          )}
                        </div>
                        {pair.quoteLogo ? (
                          <div
                            className="absolute rounded-full overflow-hidden"
                            style={{ width: 15, height: 15, bottom: 0, right: 0, border: "1.5px solid var(--m-bg)", backgroundColor: "var(--m-bg-2)" }}
                          >
                            <img src={pair.quoteLogo} alt={pair.quote} className="w-full h-full rounded-full object-cover"
                              onError={e => { const p = (e.target as HTMLImageElement).parentElement; if (p) p.style.display = "none"; }} />
                          </div>
                        ) : (
                          <div
                            className="absolute rounded-full flex items-center justify-center text-[7px] font-bold"
                            style={{ width: 15, height: 15, bottom: 0, right: 0, border: "1.5px solid var(--m-bg)", backgroundColor: symbolColor(pair.quote), color: "#fff" }}
                          >
                            {pair.quote.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col leading-none gap-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-[12px] leading-tight truncate" style={{ color:"var(--m-fg)" }}>
                            {pair.base}<span style={{ color:"var(--m-fg-5)", fontWeight:400 }}>/{pair.quote}</span>
                          </span>
                          {hasAlerts && (
                            <span
                              className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0"
                              style={{ backgroundColor:"#f5c518", minWidth:14 }}
                            >
                              <Bell className="w-2 h-2" style={{ color:"#000" }} />
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] truncate" style={{ color:"var(--m-fg-5)" }}>{pair.baseName}</span>
                      </div>
                    </div>

                    {/* ── Scrollable RIGHT columns ── */}
                    <div className="flex items-center flex-1">
                      <div className="flex flex-col items-end shrink-0" style={{ width:78, paddingRight:8 }}>
                        <span
                          className="text-[12px] font-semibold tabular-nums"
                          style={{
                            color: flashMap[pair.id] === "up"   ? "#00ff7f"
                                 : flashMap[pair.id] === "down" ? "#ff4d6a"
                                 : "var(--m-fg)",
                            transition: "color 0.15s ease",
                            textShadow: flashMap[pair.id]
                              ? `0 0 6px ${flashMap[pair.id] === "up" ? "#00ff7f99" : "#ff4d6a99"}`
                              : "none",
                          }}
                        >
                          {fmtPrice(pair.price)}
                        </span>
                        <span className="text-[9px] tabular-nums mt-0.5" style={{ color:"#94a3b8" }}>
                          {fmtUsdBrief(pair.priceUSD)}
                        </span>
                      </div>
                      <div className="text-right shrink-0" style={{ width:74, paddingRight:8 }}>
                        <span
                          className="text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded-md inline-block"
                          style={{
                            color: up ? "#00c853" : "#ff4d6a",
                            backgroundColor: up ? "rgba(0,200,83,0.1)" : "rgba(255,77,106,0.1)",
                          }}
                        >
                          {up ? "+" : ""}{pair.change.toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex flex-col items-end shrink-0" style={{ width:74, paddingRight:8 }}>
                        <span className="text-[11px] tabular-nums" style={{ color:"var(--m-fg-4)" }}>
                          {fmtQuoteAmount(pair.volume)}
                        </span>
                        <span className="text-[9px] tabular-nums" style={{ color:"var(--m-fg-5)" }}>
                          {pair.volumeUSD > 0 ? fmtUsdBrief(pair.volumeUSD) : "—"}
                        </span>
                      </div>
                      <div className="flex flex-col items-end shrink-0" style={{ width:74, paddingRight:8 }}>
                        <span className="text-[11px] tabular-nums" style={{ color:"var(--m-fg-4)" }}>
                          {pair.liquidity > 0 ? fmtQuoteAmount(pair.liquidity) : "—"}
                        </span>
                        <span className="text-[9px] tabular-nums" style={{ color:"var(--m-fg-5)" }}>
                          {pair.liquidityUSD > 0 ? fmtUsdBrief(pair.liquidityUSD) : "—"}
                        </span>
                      </div>
                      <div className="text-right shrink-0" style={{ width:92, paddingRight:8 }}>
                        <span className="text-[11px] tabular-nums" style={{ color:"var(--m-fg-4)" }}>
                          {fmtCompact(pair.marketCap)}
                        </span>
                      </div>
                      <div className="flex items-center justify-end shrink-0 pr-3" style={{ width:68 }}>
                        <Spark data={pair.spark7d} color={sparkColor} w={56} h={24} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          </>
        ) : null}

        <div className="h-4" />
      </div>

      {/* ── Price alert sheet (long-press) ── */}
      {alertPair && (
        <MobilePriceAlertSheet
          symbol={alertPair.symbol}
          base={alertPair.base}
          currentPrice={alertPair.price}
          color={alertPair.color}
          initial={alertPair.initial}
          alerts={alerts[alertPair.symbol] ?? []}
          onAdd={addAlert}
          onRemove={(id) => removeAlert(alertPair.symbol, id)}
          onClose={() => setAlertPair(null)}
        />
      )}
    </div>
  );
}
