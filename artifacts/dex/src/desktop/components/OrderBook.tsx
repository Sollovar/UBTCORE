import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, ChevronDown } from "lucide-react";
import { LiveMarketState, OrderBookRow } from "@/hooks/useLiveMarket";
import { usePairWebsocket, TradeUpdatePayload, OrderUpdatePayload } from "@/hooks/usePairWebsocket";
import { getTrades, getUserFillsForPair, getOpenOrders, type UserFillTrade } from "@/services/orderbook";
import { getExplorerTxUrl } from "@/utils/contracts";
import { useTranslation } from "@/i18n/i18n";
import type { Network } from "@/utils/contracts";
import type { OrderWithPair, OrderStatus } from "@/types";
import { useStore } from "@/stores/useStore";
import { formatAmount } from "@/utils/amount";
import { usePriceFlash } from "@/hooks/usePriceFlash";

interface Props {
  market: LiveMarketState;
  walletAddress?: string;
  pairId?: string;
  baseSymbol?: string;
  quoteSymbol?: string;
}

interface ExtendedRow extends OrderBookRow {
  isMyOrder?: boolean;
}

/* ── Formatting helpers ── */
function fmtPrice(n: number, decimals = 1) {
  if (!Number.isFinite(n)) return "0";
  // Better decimal handling for small prices
  if (n >= 1000) {
    return n.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }
  if (n >= 1) return n.toFixed(4);
  if (n >= 0.0001) return n.toFixed(6);
  return n.toFixed(8);
}

function fmtSize(n: number) {
  if (!Number.isFinite(n)) return "0";
  if (n >= 10000) return (n / 1000).toFixed(2) + "K";
  if (n >= 1000)  return n.toFixed(0);
  if (n >= 1)     return n.toFixed(2);
  if (n >= 0.0001) return n.toFixed(4);
  if (n >= 0.000001) return n.toFixed(6);
  return n.toFixed(8);
}

const ROW_H = 22;

/* ── Grouping / aggregation ── */
function groupRows(
  rows: OrderBookRow[],
  tickSize: number,
  side: "ask" | "bid"
): OrderBookRow[] {
  // tickSize === 0 means raw — no grouping at all
  if (tickSize <= 0) return rows;

  const buckets = new Map<number, { size: number }>();

  for (const row of rows) {
    // Round to nearest tickSize bucket
    const key =
      side === "ask"
        ? Math.ceil(row.price / tickSize) * tickSize
        : Math.floor(row.price / tickSize) * tickSize;
    const rounded = parseFloat(key.toFixed(8));
    const existing = buckets.get(rounded);
    if (existing) {
      existing.size += row.size;
    } else {
      buckets.set(rounded, { size: row.size });
    }
  }

  // Rebuild sorted rows with cumulative totals
  const sorted = [...buckets.entries()].sort((a, b) =>
    side === "ask" ? a[0] - b[0] : b[0] - a[0]
  );

  // Calculate cumulative total as VALUE in quote token (not just size)
  let cumTotal = 0;
  const maxSize = Math.max(...sorted.map(([, v]) => v.size));
  return sorted.map(([price, { size }]) => {
    cumTotal += size * price; // Cumulative VALUE in quote token
    return {
      price,
      size: parseFloat(size.toFixed(4)),
      total: parseFloat(cumTotal.toFixed(4)), // This is now VALUE in quote token
      depth: maxSize > 0 ? (size / maxSize) * 90 : 0,
      flash: null,
    };
  });
}

/* ── Price decimal places based on tick size ── */
function tickDecimals(tick: number) {
  if (tick === 0)    return 6; // raw — fallback, overridden by price-derived logic below
  if (tick >= 1)     return 0;
  if (tick >= 0.1)   return 1;
  if (tick >= 0.01)  return 2;
  if (tick >= 0.001) return 3;
  return 6;
}

/* ── Dynamic tick options based on price level (professional DEX behavior) ── */
function getTickOptions(currentPrice: number): number[] {
  if (currentPrice >= 1000) return [0, 1, 10, 50, 100, 500];
  if (currentPrice >= 100) return [0, 0.1, 1, 5, 10, 50];
  if (currentPrice >= 10) return [0, 0.01, 0.1, 0.5, 1, 5];
  if (currentPrice >= 1) return [0, 0.001, 0.01, 0.1, 0.5, 1];
  if (currentPrice >= 0.1) return [0, 0.0001, 0.001, 0.01, 0.05, 0.1];
  if (currentPrice >= 0.01) return [0, 0.00001, 0.0001, 0.001, 0.005, 0.01];
  return [0, 0.000001, 0.00001, 0.0001, 0.0005, 0.001];
}

function tickLabel(v: number) {
  if (v === 0)   return "Raw";
  if (v < 0.01)  return v.toFixed(6).replace(/\.?0+$/, '');
  if (v < 0.1)   return v.toFixed(3).replace(/\.?0+$/, '');
  if (v < 1)     return v.toFixed(2).replace(/\.?0+$/, '');
  return v >= 1000 ? v / 1000 + "K" : String(v);
}

/* ── Single order book row ── */
function Row({
  row,
  side,
  decimals,
}: {
  row: ExtendedRow;
  side: "ask" | "bid";
  decimals: number;
}) {
  const textColor = side === "ask" ? "#ff1744" : "#00c853";
  const barColor  = row.isMyOrder 
    ? "rgba(245,197,24,0.12)" 
    : side === "ask" 
    ? "rgba(255,23,68,0.13)" 
    : "rgba(0,200,83,0.13)";
  const flashBg   =
    row.flash === "up"
      ? "rgba(0,200,83,0.22)"
      : row.flash === "down"
      ? "rgba(255,23,68,0.22)"
      : undefined;

  // Total is already cumulative VALUE in quote token from groupRows
  const displayTotal = row.total;

  return (
    <div
      className="grid grid-cols-3 px-2 cursor-pointer hover:bg-[#181818] relative"
      style={{
        height: ROW_H,
        backgroundColor: flashBg,
        transition: "background-color 0.15s ease",
        outline: row.isMyOrder ? "1px solid rgba(245,197,24,0.4)" : "none",
        outlineOffset: "-1px",
      }}
    >
      <div
        className="absolute right-0 top-0 bottom-0 pointer-events-none"
        style={{ width: `${row.depth}%`, backgroundColor: barColor }}
      />
      <div
        className="tabular-nums z-10 text-[13px] font-medium flex items-center gap-1"
        style={{ color: row.isMyOrder ? "#f5c518" : textColor, lineHeight: `${ROW_H}px` }}
      >
        {row.isMyOrder && <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: "#f5c518" }} />}
        {fmtPrice(row.price, decimals)}
      </div>
      <div
        className="tabular-nums text-right text-[#999] z-10 text-[12px]"
        style={{ lineHeight: `${ROW_H}px` }}
      >
        {fmtSize(row.size)}
      </div>
      <div
        className="tabular-nums text-right text-[#666] z-10 text-[12px]"
        style={{ lineHeight: `${ROW_H}px` }}
      >
        {fmtSize(displayTotal)}
      </div>
    </div>
  );
}

/* ── Book-view filter (asks / both / bids) ── */
type BookView = "both" | "asks" | "bids";

function BookFilter({
  view,
  onChange,
}: {
  view: BookView;
  onChange: (v: BookView) => void;
}) {
  const BAR = (color: string) => (
    <span
      style={{
        width: 10,
        height: 2,
        borderRadius: 1,
        backgroundColor: color,
        display: "block",
      }}
    />
  );
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(view === "asks" ? "both" : "asks")}
        className="flex items-center justify-center transition-all hover:opacity-80 rounded-md"
        style={{
          width: 26,
          height: 22,
          backgroundColor: view === "asks" ? "rgba(255,23,68,0.2)" : "transparent",
        }}
        title="Show asks only"
      >
        <span
          className="flex flex-col gap-[2px] items-center justify-center"
          style={{ opacity: view === "bids" ? 0.25 : 1 }}
        >
          {BAR("#ff1744")}
          {BAR("#ff1744")}
          {BAR("#ff1744")}
        </span>
      </button>

      <button
        onClick={() => onChange("both")}
        className="flex items-center justify-center transition-all hover:opacity-80 rounded-md"
        style={{
          width: 26,
          height: 22,
          backgroundColor: view === "both" ? "rgba(255,255,255,0.08)" : "transparent",
        }}
        title="Show both"
      >
        <span className="flex flex-col gap-[2px] items-center justify-center">
          {BAR("#ff1744")}
          {BAR("#555")}
          {BAR("#00c853")}
        </span>
      </button>

      <button
        onClick={() => onChange(view === "bids" ? "both" : "bids")}
        className="flex items-center justify-center transition-all hover:opacity-80 rounded-md"
        style={{
          width: 26,
          height: 22,
          backgroundColor: view === "bids" ? "rgba(0,200,83,0.15)" : "transparent",
        }}
        title="Show bids only"
      >
        <span
          className="flex flex-col gap-[2px] items-center justify-center"
          style={{ opacity: view === "asks" ? 0.25 : 1 }}
        >
          {BAR("#00c853")}
          {BAR("#00c853")}
          {BAR("#00c853")}
        </span>
      </button>
    </div>
  );
}

/* ── Tick-size dropdown ── */
function TickSizeSelector({
  value,
  onChange,
  currentPrice,
}: {
  value: number;
  onChange: (v: number) => void;
  currentPrice: number;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  const tickOptions = getTickOptions(currentPrice);

  function toggle() {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    }
    setOpen(v => !v);
  }

  // Close on outside click or scroll
  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      if (btnRef.current && btnRef.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("scroll", () => setOpen(false), { capture: true, once: true });
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const dropdown = open
    ? createPortal(
        <div
          style={{
            position: "fixed",
            top: pos.top,
            right: pos.right,
            zIndex: 9999,
            background: "#111",
            border: "1px solid #2a2a2a",
            borderRadius: 6,
            minWidth: 100,
            boxShadow: "0 12px 32px rgba(0,0,0,0.7)",
          }}
        >
          <div
            style={{
              padding: "5px 10px",
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "#444",
              borderBottom: "1px solid #1e1e1e",
            }}
          >
            Grouping
          </div>
          {tickOptions.map(opt => {
            const active = opt === value;
            return (
              <button
                key={opt}
                onMouseDown={e => {
                  e.preventDefault();
                  onChange(opt);
                  setOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  padding: "6px 12px",
                  fontSize: 12,
                  fontFamily: "inherit",
                  color: active ? "#f5c518" : "#aaa",
                  background: active ? "rgba(245,197,24,0.06)" : "transparent",
                  cursor: "pointer",
                  border: "none",
                  textAlign: "left",
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "#1a1a1a"; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
              >
                <span>{tickLabel(opt)}</span>
                {active && <span style={{ color: "#f5c518", fontSize: 10 }}>✓</span>}
              </button>
            );
          })}
          <div
            style={{
              padding: "5px 10px",
              fontSize: 10,
              color: "#333",
              borderTop: "1px solid #1e1e1e",
              lineHeight: 1.5,
            }}
          >
            Merges nearby price levels
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        className="flex items-center gap-1 font-semibold transition-colors hover:text-white"
        style={{
          background: "transparent",
          border: "none",
          color: open ? "#f5c518" : "#bbb",
          height: 22,
          fontSize: 11,
          padding: 0,
        }}
        title="Price grouping"
      >
        {tickLabel(value)}
        <span
          style={{
            fontSize: 9,
            color: "#666",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.15s",
            display: "inline-block",
          }}
        >
          ▾
        </span>
      </button>
      {dropdown}
    </>
  );
}

/* ── Main OrderBook component ── */
type Tab = "orderbook" | "trades" | "depth";

/* ── Merge user open orders into grouped rows ── */
function mergeUserOrders(
  grouped: OrderBookRow[],
  userOrders: OrderWithPair[],
  side: "ask" | "bid",
): ExtendedRow[] {
  if (!userOrders.length) return grouped;

  // Helper: convert filled_amount from Wei to human-readable
  const getFilledHuman = (o: OrderWithPair): number => {
    const filledAmount = Number.parseFloat(o.order.filled_amount || "0");
    if (!Number.isFinite(filledAmount) || filledAmount === 0) return 0;
    const decimals = o.order.side === "buy" ? o.order.token_out_decimals : o.order.token_in_decimals;
    return filledAmount / Math.pow(10, decimals);
  };

  // Build map price → row
  const map = new Map<number, ExtendedRow>();
  for (const row of grouped) {
    map.set(row.price, { ...row });
  }

  for (const o of userOrders) {
    const price = parseFloat(o.order.price);
    if (!isFinite(price) || price <= 0) continue;
    const filled = getFilledHuman(o);
    const total = parseFloat(o.order.amount);
    const remaining = total - filled;
    if (remaining <= 0) continue;

    const existing = map.get(price);
    if (existing) {
      existing.size = parseFloat((existing.size + remaining).toFixed(4));
      existing.isMyOrder = true;
    } else {
      map.set(price, { price, size: parseFloat(remaining.toFixed(4)), total: 0, depth: 0, flash: null, isMyOrder: true });
    }
  }

  // Re-sort and recalculate totals + depth
  const sorted = [...map.values()].sort((a, b) =>
    side === "ask" ? a.price - b.price : b.price - a.price
  );
  const maxSize = Math.max(...sorted.map(r => r.size), 0);
  let cum = 0;
  return sorted.map(row => {
    cum += row.size * row.price; // Cumulative VALUE in quote token
    return { ...row, total: parseFloat(cum.toFixed(4)), depth: maxSize > 0 ? (row.size / maxSize) * 90 : 0 };
  });
}

function fmtK(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toFixed(1);
}

function fmtTotal(n: number) {
  if (!Number.isFinite(n)) return "0";
  if (n >= 10000) return (n / 1000).toFixed(2) + "K";
  if (n >= 1000)  return n.toFixed(0);
  if (n >= 1)     return n.toFixed(2);
  if (n >= 0.001) return n.toFixed(4);
  if (n >= 0.000001) return n.toFixed(6);
  return n.toFixed(8);
}

/* ── Depth chart ── */
function DepthChart({ market }: { market: LiveMarketState }) {
  const N     = 20;
  const bids  = [...market.bids].slice(0, N).reverse();
  const asks  = [...market.asks].slice(0, N);
  if (!bids.length || !asks.length) return null;

  const W = 540;
  const H = 320;
  const PAD = { top: 20, bottom: 42, left: 10, right: 10 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top  - PAD.bottom;

  const loPrice  = bids[0].price;
  const hiPrice  = asks[asks.length - 1].price;
  const midPrice = market.price;
  const priceRange = hiPrice - loPrice || 1;

  const maxTotal = Math.max(
    bids[bids.length - 1].total,
    asks[asks.length - 1].total,
  ) || 1;

  const px = (price: number) =>
    PAD.left + ((price - loPrice) / priceRange) * chartW;
  const py = (total: number) =>
    PAD.top + chartH - (total / maxTotal) * chartH;

  const bidPts = bids.map((r) => ({ x: px(r.price), y: py(r.total) }));
  const bidPath =
    `M${px(loPrice)},${PAD.top + chartH}` +
    bidPts.map((p) => `L${p.x},${p.y}`).join("") +
    `L${px(midPrice)},${PAD.top + chartH}Z`;

  const askPts = asks.map((r) => ({ x: px(r.price), y: py(r.total) }));
  const askPath =
    `M${px(midPrice)},${PAD.top + chartH}` +
    askPts.map((p) => `L${p.x},${p.y}`).join("") +
    `L${px(hiPrice)},${PAD.top + chartH}Z`;

  const bidLine =
    bidPts.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join("") +
    `L${px(midPrice)},${py(bids[bids.length - 1].total)}`;

  const askLine =
    askPts.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join("");

  const midX  = px(midPrice);
  const yZero = PAD.top + chartH;

  const labels = [
    { x: PAD.left,      text: fmtPrice(loPrice),  anchor: "start"  },
    { x: midX,          text: fmtPrice(midPrice), anchor: "middle" },
    { x: W - PAD.right, text: fmtPrice(hiPrice),  anchor: "end"    },
  ];

  const yTicks = [0.5, 1.0].map((f) => ({
    y: PAD.top + chartH - f * chartH,
    label: fmtK(maxTotal * f),
  }));

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#000000]">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ width: "100%", flex: 1, minHeight: 0, display: "block" }}
      >
        <defs>
          <linearGradient id="bid-grad-desktop" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#00c853" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#00c853" stopOpacity="0.06" />
          </linearGradient>
          <linearGradient id="ask-grad-desktop" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#ff1744" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ff1744" stopOpacity="0.06" />
          </linearGradient>
        </defs>

        {yTicks.map((t) => (
          <line key={t.y} x1={PAD.left} y1={t.y} x2={W - PAD.right} y2={t.y}
            stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        ))}

        <path d={bidPath} fill="url(#bid-grad-desktop)" />
        <path d={askPath} fill="url(#ask-grad-desktop)" />
        <path d={bidLine} fill="none" stroke="#00c853" strokeWidth="2" strokeLinejoin="round" />
        <path d={askLine} fill="none" stroke="#ff1744" strokeWidth="2" strokeLinejoin="round" />

        <line x1={midX} y1={PAD.top} x2={midX} y2={yZero}
          stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="3 3" />

        <rect x={midX - 35} y={PAD.top - 2} width={70} height={18} rx={5} fill="rgba(245,197,24,0.18)" />
        <text x={midX} y={PAD.top + 11} textAnchor="middle" fontSize="10"
          fontWeight="600" fontFamily="inherit" fill="#f5c518">
          {fmtPrice(midPrice)}
        </text>

        <line x1={PAD.left} y1={yZero} x2={W - PAD.right} y2={yZero}
          stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

        {labels.map((l) => (
          <text key={l.text} x={l.x} y={yZero + 16}
            textAnchor={l.anchor as "start" | "middle" | "end"}
            fontSize="10" fontFamily="inherit" fill="rgba(255,255,255,0.35)">
            {l.text}
          </text>
        ))}

        {yTicks.map((t) => (
          <text key={t.y} x={PAD.left + 5} y={t.y - 4}
            fontSize="9" fontFamily="inherit" fill="rgba(255,255,255,0.3)">
            {t.label}
          </text>
        ))}
      </svg>

      <div
        className="shrink-0 flex items-center justify-center gap-6 py-2.5"
        style={{ borderTop: "1px solid #1a1a1a" }}
      >
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#00c853" }} />
          <span className="text-[11px] font-medium text-[#666]">
            Bids&nbsp;
            <span className="tabular-nums text-[#00c853]">
              {(() => {
                const last = bids[bids.length - 1];
                // Total is already cumulative VALUE in quote token
                return fmtTotal(last ? last.total : 0);
              })()}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#ff1744" }} />
          <span className="text-[11px] font-medium text-[#666]">
            Asks&nbsp;
            <span className="tabular-nums text-[#ff1744]">
              {(() => {
                const last = asks[asks.length - 1];
                // Total is already cumulative VALUE in quote token
                return fmtTotal(last ? last.total : 0);
              })()}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

interface Trade {
  id: string;
  price: number;
  size: number;
  isBuy: boolean;
  time: string;
  timeMs: number;
  txHash?: string;
  txHashBuy?: string;
  txHashSell?: string;
}

function normalizeTradeSize(rawAmount: unknown, decimals: number): number {
  if (rawAmount == null || rawAmount === "") return 0;

  if (typeof rawAmount === "string") {
    const trimmed = rawAmount.trim();
    if (trimmed === "" || trimmed === "0") return 0;

    // If amount_human is provided and looks like a proper decimal, use it directly
    const parsed = parseFloat(trimmed);
    if (Number.isFinite(parsed) && trimmed.includes('.')) {
      return parsed;
    }

    // If it's a pure integer string (no decimal point) and decimals > 0,
    // it's a raw on-chain amount (wei / lamports / etc.) — convert it.
    if (/^-?\d+$/.test(trimmed) && decimals > 0) {
      return parseFloat(formatAmount(trimmed, decimals, 6));
    }

    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (typeof rawAmount === "number") {
    return Number.isFinite(rawAmount) ? rawAmount : 0;
  }

  const parsed = parseFloat(String(rawAmount));
  return Number.isFinite(parsed) ? parsed : 0;
}

function nowTime() {
  return new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function toTime(raw: string | number): string {
  try {
    const d = typeof raw === "number"
      ? new Date(raw > 1e10 ? raw : raw * 1000)
      : new Date(raw);
    return d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return nowTime();
  }
}

export function OrderBook({ market, walletAddress, pairId, baseSymbol, quoteSymbol }: Props) {
  const { t } = useTranslation();
  const [tab, setTab]           = useState<Tab>("orderbook");
  const [bookView, setBookView] = useState<BookView>("both");
  const [tickSize, setTickSize] = useState<number>(0);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [tradesLoading, setTradesLoading] = useState(false);
  const [userOrders, setUserOrders] = useState<OrderWithPair[]>([]);

  const network = useStore(s => s.network) as Network;
  const selectedPair = useStore(s => s.selectedPair);
  const pairs = useStore(s => s.pairs);
  const activePair = selectedPair;
  const fallbackDecimals = activePair?.baseToken?.decimals ?? 18;
  const explorerNetwork = (activePair?.network as Network) ?? network;

  // Price flash effect - backend exchange price changes
  const priceFlash = usePriceFlash(pairId ?? null, market.price);
  const flashUpColor = "#00ff7f";
  const flashDownColor = "#ff4d6a";
  const neutralColor = "#f5f5f5"; // White/neutral when not flashing
  
  const midPriceColor = priceFlash === "up" ? flashUpColor
                      : priceFlash === "down" ? flashDownColor
                      : neutralColor;

  const priceUp = market.price >= market.prevPrice;
  const arrow = priceUp ? "↑" : "↓";
  
  // Derive decimal places from actual prices when in raw mode
  const decimals = tickSize > 0
    ? tickDecimals(tickSize)
    : (() => {
        const allPrices = [...market.asks, ...market.bids].map(r => r.price).filter(p => p > 0);
        if (!allPrices.length) return 6;
        const minPrice = Math.min(...allPrices);
        if (minPrice >= 100)  return 2;
        if (minPrice >= 1)    return 4;
        if (minPrice >= 0.01) return 6;
        const s = minPrice.toFixed(20);
        const after = s.split(".")[1] ?? "";
        let z = 0;
        for (const c of after) { if (c === "0") z++; else break; }
        return Math.min(z + 4, 10);
      })();
  
  // Get symbols for column headers
  const base = baseSymbol || activePair?.baseToken?.symbol || "BTC";
  const quote = quoteSymbol || activePair?.quoteToken?.symbol || "USDT";

  // Apply grouping
  const groupedAsks = groupRows(market.asks, tickSize, "ask");
  const groupedBids = groupRows(market.bids, tickSize, "bid");

  const userBids = userOrders.filter(o => o.order.side === "buy");
  const userAsks = userOrders.filter(o => o.order.side === "sell");

  const displayAsks = mergeUserOrders(groupedAsks, userAsks, "ask");
  const displayBids = mergeUserOrders(groupedBids, userBids, "bid");

  // Fetch user open orders
  const fetchUserOrders = useCallback(async () => {
    if (!walletAddress) { setUserOrders([]); return; }
    try {
      const res = await getOpenOrders(walletAddress);
      const orders = (res.data ?? []).filter(o =>
        (!pairId || o.order.pair_id === pairId) &&
        (o.order.status === "open" || o.order.status === "pending") &&
        o.order.order_type === "limit"
      );
      setUserOrders(orders);
    } catch {
      // silently ignore
    }
  }, [walletAddress, pairId]);

  useEffect(() => {
    fetchUserOrders();
  }, [fetchUserOrders]);

  // Real-time order status updates
  usePairWebsocket(pairId ?? null, {
    onOrderUpdate: (order: OrderUpdatePayload) => {
      setUserOrders(prev => {
        if (order.status === 'filled' || order.status === 'cancelled' || order.status === 'expired') {
          return prev.filter(o => o.order.id !== order.id);
        }
        return prev.map(o =>
          o.order.id === order.id
            ? { ...o, order: { ...o.order, filled_amount: order.filled_amount, status: order.status as OrderStatus } }
            : o
        );
      });
    },
    onTradeUpdate: undefined, // handled separately below
  });

  // Load real trades
  useEffect(() => {
    if (!pairId) {
      setTrades([]);
      setTradesLoading(false);
      return;
    }

    let isActive = true;

    const loadTrades = async () => {
      setTradesLoading(true);
      try {
        const [pairTrades, userFills] = await Promise.all([
          getTrades(pairId, 50),
          walletAddress ? getUserFillsForPair(walletAddress, pairId, 50) : Promise.resolve([] as UserFillTrade[]),
        ]);

        if (!isActive) return;

        const byKey = new Map<string, Trade>();
        const addTrade = (incoming: Trade) => {
          const key = incoming.id;
          if (!byKey.has(key)) {
            byKey.set(key, incoming);
          }
        };

        pairTrades.forEach((t) => {
          const rawTime = typeof t.time === "number" ? t.time : Date.parse(String(t.time || ""));
          // ALWAYS use amount_human if available - it's already correctly formatted
          const size = t.amount_human 
            ? parseFloat(t.amount_human)
            : normalizeTradeSize(t.amount, typeof (t as any).decimals === "number" ? (t as any).decimals : fallbackDecimals);
          
          addTrade({
            id: String(t.id),
            price: typeof t.price === "number" ? t.price : parseFloat(t.price as any),
            size: Number.isFinite(size) ? size : 0,
            isBuy: t.side === "buy",
            time: toTime(t.time as any),
            timeMs: Number.isFinite(rawTime) ? rawTime : Date.now(),
            txHash: t.tx_hash,
            txHashBuy: t.tx_hash_buy,
            txHashSell: t.tx_hash_sell,
          });
        });

        userFills.forEach((fill) => {
          const rawTime = Date.parse(fill.time || "");
          // ALWAYS use amount directly from userFills - it's already human-readable
          const size = fill.amount; // Already a number, already human-readable
          addTrade({
            id: fill.id,
            price: fill.price,
            size: Number.isFinite(size) ? size : 0,
            isBuy: fill.side === "buy",
            time: fill.time ? toTime(fill.time) : nowTime(),
            timeMs: Number.isFinite(rawTime) ? rawTime : Date.now(),
            txHash: fill.txHash,
            txHashBuy: fill.txHashBuy,
            txHashSell: fill.txHashSell,
          });
        });

        const merged = Array.from(byKey.values()).sort((a, b) => b.timeMs - a.timeMs);
        setTrades(merged.slice(0, 100));
      } catch {
        if (isActive) setTrades([]);
      } finally {
        if (isActive) setTradesLoading(false);
      }
    };

    loadTrades();

    return () => {
      isActive = false;
    };
  }, [pairId, walletAddress, fallbackDecimals]);

  // Real-time trade updates via WebSocket
  usePairWebsocket(pairId ?? null, {
    onTradeUpdate: (trade: TradeUpdatePayload) => {
      // ALWAYS use amount_human or price_human if available
      const price = trade.price_human
        ? parseFloat(trade.price_human)
        : parseFloat(trade.price);
      const size = trade.amount_human
        ? parseFloat(trade.amount_human)
        : normalizeTradeSize(trade.amount, trade.decimals ?? fallbackDecimals);
      
      const incoming: Trade = {
        id: String(trade.id),
        price: Number.isFinite(price) ? price : 0,
        size: Number.isFinite(size) ? size : 0,
        isBuy: trade.side === "buy",
        time: nowTime(),
        timeMs: Date.now(),
        txHash: trade.tx_hash,
        txHashBuy: trade.tx_hash_buy,
        txHashSell: trade.tx_hash_sell,
      };
      setTrades((prev) => {
        if (prev.some((t) => t.id === incoming.id)) return prev;
        return [incoming, ...prev.slice(0, 99)];
      });
    },
  });

  return (
    <div className="flex flex-col h-full bg-[#000000] overflow-hidden">
      {/* Tab header */}
      <div className="flex items-center h-[38px] px-3 border-b border-[#1a1a1a] bg-[#000000] shrink-0">
        <button
          onClick={() => setTab("orderbook")}
          className={`h-full flex items-center text-[13px] font-semibold transition-colors ${
            tab === "orderbook"
              ? "text-white border-b-2 border-white"
              : "text-[#555] hover:text-[#aaa]"
          }`}
        >
          {t('trade.orderBook')}
        </button>
        <button
          onClick={() => setTab("depth")}
          className={`ml-3 h-full flex items-center text-[13px] font-semibold transition-colors ${
            tab === "depth"
              ? "text-white border-b-2 border-white"
              : "text-[#555] hover:text-[#aaa]"
          }`}
        >
          Depth
        </button>
        <button
          onClick={() => setTab("trades")}
          className={`ml-auto h-full flex items-center text-[13px] font-semibold transition-colors ${
            tab === "trades"
              ? "text-white border-b-2 border-white"
              : "text-[#555] hover:text-[#aaa]"
          }`}
        >
          {t('trade.trades')}
        </button>
      </div>

      {tab === "orderbook" && (
        <>
          {/* Controls row */}
          <div className="flex items-center justify-between h-[36px] px-2 shrink-0 border-b border-[#111]">
            <BookFilter view={bookView} onChange={setBookView} />
            <div className="flex items-center gap-2">
              <TickSizeSelector value={tickSize} onChange={setTickSize} currentPrice={market.price} />
            </div>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-3 px-2 py-1 text-[11px] font-medium text-[#555] shrink-0 border-b border-[#111] bg-[#0a0a0a] relative z-10">
            <div>{t('trade.price')}({quote})</div>
            <div className="text-right">{t('trade.size')}({base})</div>
            <div className="text-right">{t('trade.total')}({quote})</div>
          </div>

          {/* Asks */}
          {bookView !== "bids" && (
            <div
              className="flex flex-col justify-end overflow-hidden min-h-0"
              style={{ flex: "1 1 0" }}
            >
              {[...displayAsks].reverse().map((row, i) => (
                <Row
                  key={`ask-${i}`}
                  row={row}
                  side="ask"
                  decimals={decimals}
                />
              ))}
            </div>
          )}

          {/* Mid price */}
          <div className="flex items-center justify-center py-1.5 shrink-0 border-y border-[#1a1a1a]">
            <div
              className="flex items-center gap-3 font-bold tabular-nums px-4 py-1"
              style={{
                backgroundColor: "rgba(255,255,255,0.04)",
                border: "1px solid #222",
                borderRadius: 999,
              }}
            >
              <span 
                className="text-[14px]" 
                style={{ 
                  color: midPriceColor,
                  transition: priceFlash ? "none" : "color 700ms ease-out",
                  textShadow: priceFlash ? `0 0 8px ${priceFlash === 'up' ? flashUpColor : flashDownColor}` : "none"
                }}
              >
                {fmtPrice(market.price)}
                <span className="text-[10px] ml-1.5">{arrow}</span>
              </span>
              <span className="text-[11px] text-[#555] border-b border-dotted border-[#444]">
                {fmtPrice(market.markPrice)}
              </span>
            </div>
          </div>

          {/* Bids */}
          {bookView !== "asks" && (
            <div
              className="flex flex-col overflow-hidden min-h-0"
              style={{ flex: "1 1 0" }}
            >
              {displayBids.map((row, i) => (
                <Row
                  key={`bid-${i}`}
                  row={row}
                  side="bid"
                  decimals={decimals}
                />
              ))}
            </div>
          )}
        </>
      )}

      {tab === "depth" && <DepthChart market={market} />}

      {tab === "trades" && (
        <>
          <div className="grid grid-cols-3 px-2 py-1.5 text-[11px] font-medium text-[#555] shrink-0 border-b border-[#1a1a1a]">
            <div>Price({quote})</div>
            <div className="text-right">Size({base})</div>
            <div className="text-right">Time</div>
          </div>
          {tradesLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full border-2 border-[#444] border-t-transparent animate-spin" />
            </div>
          ) : trades.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-[12px] text-[#444]">No trades yet</p>
            </div>
          ) : (
            <div className="flex-1 overflow-hidden flex flex-col">
              {trades.map((t) => {
                const txUrls: Array<{ hash: string; title: string }> = [];
                const addedHashes = new Set<string>();
                const addTxUrl = (hash: string | undefined, title: string) => {
                  if (!hash || addedHashes.has(hash)) return;
                  addedHashes.add(hash);
                  txUrls.push({ hash, title });
                };

                if (t.txHashBuy || t.txHashSell) {
                  addTxUrl(t.txHashBuy, 'Buy Tx');
                  addTxUrl(t.txHashSell, 'Sell Tx');
                } else {
                  addTxUrl(t.txHash, 'Tx');
                }

                const explorerUrls = txUrls.map((entry) => ({
                  url: getExplorerTxUrl(explorerNetwork, entry.hash),
                  title: entry.title,
                }));

                return (
                  <div
                    key={t.id}
                    className="grid grid-cols-3 px-2 hover:bg-[#181818]"
                    style={{ height: ROW_H }}
                  >
                    <div
                      className="tabular-nums text-[13px] font-medium flex items-center"
                      style={{
                        color: t.isBuy ? "#00c853" : "#ff1744",
                        lineHeight: `${ROW_H}px`,
                      }}
                    >
                      {fmtPrice(t.price)}
                    </div>
                    <div
                      className="text-right text-[#999] tabular-nums text-[12px] flex items-center justify-end"
                      style={{ lineHeight: `${ROW_H}px` }}
                    >
                      {fmtSize(t.size)}
                    </div>
                    <div
                      className="text-right tabular-nums text-[11px] flex items-center justify-end gap-1"
                      style={{ lineHeight: `${ROW_H}px`, color: "#555" }}
                    >
                      <span>{t.time}</span>
                      {explorerUrls.length > 0 ? (
                        explorerUrls.map(({ url, title }, index) => (
                          <a
                            key={`${t.id}-${index}`}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={title}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex"
                          >
                            <ExternalLink className="w-3 h-3 shrink-0" style={{ color: "#f5c518" }} />
                          </a>
                        ))
                      ) : (
                        <ExternalLink className="w-3 h-3 shrink-0" style={{ color: "#333" }} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
