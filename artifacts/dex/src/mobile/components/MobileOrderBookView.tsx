import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { LiveMarketState, OrderBookRow } from "@/hooks/useLiveMarket";
import { getOpenOrders } from "@/services/orderbook";
import type { OrderWithPair } from "@/types";
import { usePairWebsocket, OrderUpdatePayload } from "@/hooks/usePairWebsocket";
import type { OrderStatus } from "@/types";
import { useTranslation } from "@/i18n/i18n";

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

/* ── Formatting ── */
function fmtPrice(n: number, decimals = 1) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
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

function fmtK(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toFixed(1);
}

function tickDecimals(tick: number) {
  if (tick === 0)    return 6; // raw — fallback, overridden by price-derived logic below
  if (tick >= 1)     return 0;
  if (tick >= 0.1)   return 1;
  if (tick >= 0.01)  return 2;
  if (tick >= 0.001) return 3;
  return 6;
}

/* ── Grouping logic ── */
function groupRows(
  rows: OrderBookRow[],
  tickSize: number,
  side: "ask" | "bid"
): OrderBookRow[] {
  // tickSize === 0 means raw — no grouping at all
  if (tickSize <= 0) return rows;

  const buckets = new Map<number, { size: number }>();
  for (const row of rows) {
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

/* ── Tick-size dropdown (portal, fixed position) ── */
// Dynamic tick options based on price level (professional DEX behavior)
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
  if (v < 0.01)  return v.toFixed(3);
  if (v < 0.1)   return v.toFixed(2);
  if (v < 1)     return v.toFixed(1);
  return v >= 1000 ? v / 1000 + "K" : String(v);
}

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
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  
  const tickOptions = getTickOptions(currentPrice);

  function toggle() {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left });
    }
    setOpen(v => !v);
  }

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      if (btnRef.current && btnRef.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const dropdown = open
    ? createPortal(
        <div
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            zIndex: 9999,
            background: "#141414",
            border: "1px solid #2a2a2a",
            borderRadius: 8,
            minWidth: 110,
            boxShadow: "0 12px 32px rgba(0,0,0,0.75)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "6px 12px 4px",
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
                  padding: "8px 14px",
                  fontSize: 13,
                  fontFamily: "inherit",
                  color: active ? "#f5c518" : "#ccc",
                  background: active ? "rgba(245,197,24,0.07)" : "transparent",
                  cursor: "pointer",
                  border: "none",
                  textAlign: "left",
                }}
              >
                <span>{tickLabel(opt)}</span>
                {active && (
                  <span style={{ color: "#f5c518", fontSize: 11 }}>✓</span>
                )}
              </button>
            );
          })}
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        className="flex items-center gap-1 font-semibold"
        style={{
          fontSize: 12,
          color: open ? "#f5c518" : "var(--m-fg-2)",
          background: open ? "rgba(245,197,24,0.1)" : "transparent",
          border: `1px solid ${open ? "rgba(245,197,24,0.3)" : "transparent"}`,
          borderRadius: 5,
          padding: "2px 6px",
        }}
      >
        {tickLabel(value)}
        <ChevronDown
          className="w-3 h-3"
          style={{
            color: open ? "#f5c518" : "var(--m-fg-4)",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.15s",
          }}
        />
      </button>
      {dropdown}
    </>
  );
}

/* ── Depth chart ── */
function DepthChart({ market }: { market: LiveMarketState }) {
  const N     = 20;
  const bids  = [...market.bids].slice(0, N).reverse();
  const asks  = [...market.asks].slice(0, N);
  if (!bids.length || !asks.length) return null;

  const W = 390;
  const H = 260;
  const PAD = { top: 16, bottom: 36, left: 8, right: 8 };
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
    <div className="flex-1 flex flex-col overflow-hidden">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ width: "100%", flex: 1, minHeight: 0, display: "block" }}
      >
        <defs>
          <linearGradient id="bid-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#00c853" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#00c853" stopOpacity="0.06" />
          </linearGradient>
          <linearGradient id="ask-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#ff1744" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ff1744" stopOpacity="0.06" />
          </linearGradient>
        </defs>

        {yTicks.map((t) => (
          <line key={t.y} x1={PAD.left} y1={t.y} x2={W - PAD.right} y2={t.y}
            stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        ))}

        <path d={bidPath} fill="url(#bid-grad)" />
        <path d={askPath} fill="url(#ask-grad)" />
        <path d={bidLine} fill="none" stroke="#00c853" strokeWidth="1.5" strokeLinejoin="round" />
        <path d={askLine} fill="none" stroke="#ff1744" strokeWidth="1.5" strokeLinejoin="round" />

        <line x1={midX} y1={PAD.top} x2={midX} y2={yZero}
          stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="3 3" />

        <rect x={midX - 30} y={PAD.top - 1} width={60} height={15} rx={4} fill="rgba(245,197,24,0.18)" />
        <text x={midX} y={PAD.top + 10} textAnchor="middle" fontSize="9"
          fontWeight="600" fontFamily="inherit" fill="#f5c518">
          {fmtPrice(midPrice)}
        </text>

        <line x1={PAD.left} y1={yZero} x2={W - PAD.right} y2={yZero}
          stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

        {labels.map((l) => (
          <text key={l.text} x={l.x} y={yZero + 14}
            textAnchor={l.anchor as "start" | "middle" | "end"}
            fontSize="9" fontFamily="inherit" fill="rgba(255,255,255,0.35)">
            {l.text}
          </text>
        ))}

        {yTicks.map((t) => (
          <text key={t.y} x={PAD.left + 4} y={t.y - 3}
            fontSize="8" fontFamily="inherit" fill="rgba(255,255,255,0.3)">
            {t.label}
          </text>
        ))}
      </svg>

      <div
        className="shrink-0 flex items-center justify-center gap-5 py-2"
        style={{ borderTop: "1px solid var(--m-bg-3)" }}
      >
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "#00c853" }} />
          <span className="text-[11px] font-medium" style={{ color: "var(--m-fg-4)" }}>
            Bids&nbsp;
            <span className="tabular-nums" style={{ color: "#00c853" }}>
              {(() => {
                const last = bids[bids.length - 1];
                // Total is already cumulative VALUE in quote token
                return fmtTotal(last ? last.total : 0);
              })()}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "#ff1744" }} />
          <span className="text-[11px] font-medium" style={{ color: "var(--m-fg-4)" }}>
            Asks&nbsp;
            <span className="tabular-nums" style={{ color: "#ff1744" }}>
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

/* ── Main component ── */
const ROW_H = 34;
const ROWS  = 16;

export function MobileOrderBookView({ market, walletAddress, pairId, baseSymbol, quoteSymbol }: Props) {
  const { t } = useTranslation();
  const [tickSize, setTickSize] = useState<number>(0);
  const [tab, setTab] = useState<"book" | "depth">("book");
  const [userOrders, setUserOrders] = useState<OrderWithPair[]>([]);
  const base  = baseSymbol  || "—";
  const quote = quoteSymbol || "—";

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
    // No polling — WS order_update events keep open orders in sync in real time
  }, [fetchUserOrders]);

  // Real-time order status updates — remove filled/cancelled orders immediately
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
  });

  const userBids = userOrders.filter(o => o.order.side === "buy");
  const userAsks = userOrders.filter(o => o.order.side === "sell");

  const groupedAsks = groupRows(market.asks, tickSize, "ask");
  const groupedBids = groupRows(market.bids, tickSize, "bid");

  const displayAsks = mergeUserOrders(groupedAsks, userAsks, "ask").slice(0, ROWS);
  const displayBids = mergeUserOrders(groupedBids, userBids, "bid").slice(0, ROWS);

  const maxAskTotal = displayAsks.reduce((m, r) => Math.max(m, r.total), 0) || 1;
  const maxBidTotal = displayBids.reduce((m, r) => Math.max(m, r.total), 0) || 1;

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ backgroundColor: "var(--m-bg)" }}>

      {/* Controls row */}
      <div
        className="flex items-center justify-between px-3 h-[38px] shrink-0"
        style={{ borderBottom: "1px solid var(--m-bg-3)" }}
      >
        <div className="flex items-center gap-3">
          {([
            { key: "book",  label: t('trade.orderBook') },
            { key: "depth", label: "Depth" },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="text-[12px] font-semibold pb-0.5 transition-all"
              style={{
                color: tab === key ? "var(--m-fg)" : "var(--m-fg-4)",
                borderBottom: tab === key ? "2px solid #f5c518" : "2px solid transparent",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <TickSizeSelector value={tickSize} onChange={setTickSize} currentPrice={market.price} />
        </div>
      </div>

      {/* Depth chart */}
      {tab === "depth" && <DepthChart market={market} />}

      {/* Order book */}
      {tab === "book" && (
        <>
          <div
            className="grid shrink-0"
            style={{ gridTemplateColumns: "1fr 72px 72px 1fr", height: 28, borderBottom: "1px solid var(--m-bdr-subtle)" }}
          >
            <div className="text-[11px] font-medium px-3 flex items-center" style={{ color: "var(--m-fg-4)" }}>
              {t('trade.total')} ({quote})
            </div>
            <div className="text-[11px] font-medium px-2 flex items-center justify-end overflow-hidden" style={{ color: "var(--m-fg-4)" }}>
              {t('trade.price')}
            </div>
            <div className="flex items-center overflow-hidden">
              <div className="w-px self-stretch shrink-0" style={{ backgroundColor: "var(--m-bdr)" }} />
              <span className="text-[11px] font-medium px-2" style={{ color: "var(--m-fg-4)" }}>{t('trade.price')}</span>
            </div>
            <div className="text-[11px] font-medium px-3 flex items-center justify-end" style={{ color: "var(--m-fg-4)" }}>
              {t('trade.total')} ({quote})
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {Array.from({ length: ROWS }).map((_, i) => {
              const bid = displayBids[i];
              const ask = displayAsks[i];
              const bidDepth = bid ? (bid.total / maxBidTotal) * 100 : 0;
              const askDepth = ask ? (ask.total / maxAskTotal) * 100 : 0;

              return (
                <div
                  key={i}
                  className="grid"
                  style={{
                    gridTemplateColumns: "1fr 72px 72px 1fr",
                    height: ROW_H,
                    borderBottom: "1px solid var(--m-bg-1)",
                  }}
                >
                  {/* BID total */}
                  <div className={`relative overflow-hidden flex items-center ${bid?.flash === "up" ? "flash-up" : bid?.flash === "down" ? "flash-down" : ""}`}
                    style={bid?.isMyOrder ? { outline: "1px solid rgba(245,197,24,0.35)", outlineOffset: "-1px" } : undefined}>
                    {bid && (
                      <div className="absolute top-0 right-0 bottom-0"
                        style={{ width: `${bidDepth}%`, backgroundColor: bid.isMyOrder ? "rgba(245,197,24,0.1)" : "rgba(0,200,83,0.12)" }} />
                    )}
                    {bid && (
                      <div className="relative z-10 flex items-center gap-1 px-3 overflow-hidden">
                        {bid.isMyOrder && <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: "#f5c518" }} />}
                        <span className="tabular-nums text-[12px] text-[#00c853] truncate" style={{ opacity: 0.7 }}>
                          {fmtTotal(bid.total)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* BID price */}
                  <div className={`overflow-hidden flex items-center justify-end px-2 ${bid?.flash === "up" ? "flash-up" : bid?.flash === "down" ? "flash-down" : ""}`}>
                    {bid && (
                      <span
                        className="tabular-nums text-[13px] font-medium truncate"
                        style={{ color: bid.isMyOrder ? "#f5c518" : "#00c853" }}
                      >
                        {fmtPrice(bid.price, decimals)}
                      </span>
                    )}
                  </div>

                  {/* Center divider + ASK price */}
                  <div className="flex items-center overflow-hidden">
                    <div className="w-px self-stretch shrink-0" style={{ backgroundColor: "var(--m-bdr)" }} />
                    <div className={`flex items-center px-2 overflow-hidden flex-1 min-w-0 ${ask?.flash === "up" ? "flash-up" : ask?.flash === "down" ? "flash-down" : ""}`}>
                      {ask && (
                        <span
                          className="tabular-nums text-[13px] font-medium truncate"
                          style={{ color: ask.isMyOrder ? "#f5c518" : "#ff1744" }}
                        >
                          {fmtPrice(ask.price, decimals)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ASK total */}
                  <div className={`relative overflow-hidden flex items-center justify-end ${ask?.flash === "up" ? "flash-up" : ask?.flash === "down" ? "flash-down" : ""}`}
                    style={ask?.isMyOrder ? { outline: "1px solid rgba(245,197,24,0.35)", outlineOffset: "-1px" } : undefined}>
                    {ask && (
                      <div className="absolute top-0 left-0 bottom-0"
                        style={{ width: `${askDepth}%`, backgroundColor: ask.isMyOrder ? "rgba(245,197,24,0.1)" : "rgba(255,23,68,0.12)" }} />
                    )}
                    {ask && (
                      <div className="relative z-10 flex items-center gap-1 px-3 overflow-hidden">
                        <span className="tabular-nums text-[12px] text-[#ff1744] truncate" style={{ opacity: 0.7 }}>
                          {fmtTotal(ask.total)}
                        </span>
                        {ask.isMyOrder && <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: "#f5c518" }} />}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
