import { useState, useRef, useEffect, useCallback } from "react";
import { Filter, Download, RefreshCw } from "lucide-react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useStore } from "@/stores/useStore";
import { getOpenOrders, getHistoryOrders, getLadderOrders, cancelOrder } from "@/services/orderbook";
import { usePairWebsocket, OrderUpdatePayload } from "@/hooks/usePairWebsocket";
import type { OrderStatus } from "@/types";
import { useTranslation } from "@/i18n/i18n";
import type { OrderWithPair } from "@/types";

type BottomTab = "Open Orders" | "Ladder History" | "Order History" | "Trade History";
const TABS: BottomTab[] = ["Open Orders", "Ladder History", "Order History", "Trade History"];

// Ensure we create a new websocket connection specifically for BottomPanel
const BOTTOM_PANEL_WS_ID = "bottom-panel-orders";

const TH = "text-left px-3 py-1.5 text-[11px] font-semibold text-[#444] whitespace-nowrap";
const TD = "px-3 py-2 text-[12px]";

function Empty({ msg = "No data available" }: { msg?: string }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-2">
      <div className="w-9 h-9 rounded-full bg-[#151515] flex items-center justify-center">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      </div>
      <p className="text-[#444] text-[12px]">{msg}</p>
    </div>
  );
}

function NoWallet() {
  const { t } = useTranslation();
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2">
      <div className="w-8 h-8 rounded-full bg-[#151515] flex items-center justify-center">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1.5">
          <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
          <path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>
        </svg>
      </div>
      <p className="text-[#444] text-[12px]">{t('account.noWallet.sub')}</p>
    </div>
  );
}

function fmtTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-US", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return iso;
  }
}

function fmtPx(n: number): string {
  if (n >= 1000) return n.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (n >= 1) return n.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  return n.toPrecision(6);
}

function pairSymbol(o: OrderWithPair) {
  if (o.pair) return `${o.pair.base_symbol}/${o.pair.quote_symbol}`;
  return o.order.pair_id;
}

function getDisplayAmount(o: OrderWithPair) {
  const amountIn = Number.parseFloat(o.amount_in_human || "0");
  const amountOutMin = Number.parseFloat(o.amount_out_min_human || "0");

  if (o.order.side === "buy") {
    return Number.isFinite(amountOutMin) && amountOutMin > 0 ? amountOutMin : amountIn;
  }

  return Number.isFinite(amountIn) && amountIn > 0 ? amountIn : amountOutMin;
}

/**
 * Convert filled_amount from Wei to human-readable format
 * Uses the appropriate decimals based on order side (buy uses token_in, sell uses token_out)
 */
function getFilledAmountHuman(o: OrderWithPair): number {
  const filledAmount = Number.parseFloat(o.order.filled_amount || "0");
  if (!Number.isFinite(filledAmount) || filledAmount === 0) {
    return 0;
  }

  // Determine which decimals to use based on side
  const decimals = o.order.side === "buy" 
    ? o.order.token_out_decimals 
    : o.order.token_in_decimals;

  // Convert from Wei to human-readable
  const divisor = Math.pow(10, decimals);
  return filledAmount / divisor;
}

interface OpenOrdersViewProps {
  orders: OrderWithPair[];
  pairs: import("@/types").Pair[];
  loading: boolean;
  onCancel: (id: number) => void;
  cancelling: Set<number>;
}

function OpenOrdersView({ orders, pairs, loading, onCancel, cancelling }: OpenOrdersViewProps) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <RefreshCw className="w-4 h-4 text-[#444] animate-spin" />
      </div>
    );
  }

  // Filter out ladder orders - only show non-ladder orders
  const nonLadderOrders = orders.filter(o => !o.order.is_ladder);

  if (nonLadderOrders.length === 0) {
    return <Empty msg="No open orders" />;
  }

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full min-w-[650px]">
        <thead className="sticky top-0 bg-[#000000]">
          <tr className="border-b border-[#141414]">
            {["Symbol","Type","Side","Price","Amount","Status","Time",""].map(h=>(
              <th key={h} className={TH}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {nonLadderOrders.map((o) => {
            const ord = o.order;
            const symbol = pairSymbol(o);
            const amount = getDisplayAmount(o);
            const isCancelling = cancelling.has(ord.id);
            return (
              <tr key={ord.id} className="border-b border-[#111] hover:bg-[#111] transition-colors">
                <td className={`${TD} font-semibold text-white`}>{symbol}</td>
                <td className={`${TD} text-[#888]`}>{ord.order_type?.replace(/_/g, " ") ?? "—"}</td>
                <td className={TD}>
                  <span className={`font-bold ${ord.side === "buy" ? "text-[#00c853]" : "text-[#ff1744]"}`}>
                    {ord.side === "buy" ? "Buy" : "Sell"}
                  </span>
                </td>
                <td className={`${TD} tabular-nums text-[#ccc]`}>{fmtPx(parseFloat(ord.price))}</td>
                <td className={`${TD} tabular-nums text-[#ccc]`}>{amount.toFixed(4)}</td>
                <td className={TD}>
                  <span className="text-[11px] px-1.5 py-0.5 rounded font-medium bg-[#f5c518]/15 text-[#f5c518]">
                    {ord.status ?? "open"}
                  </span>
                </td>
                <td className={`${TD} tabular-nums text-[#555]`}>{fmtTime(ord.created_at ?? "")}</td>
                <td className={TD}>
                  <button
                    onClick={() => onCancel(ord.id)}
                    disabled={isCancelling}
                    className="text-[12px] text-[#555] hover:text-[#ff1744] transition-colors font-medium disabled:opacity-40"
                  >
                    {isCancelling ? "Cancelling..." : "Cancel"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface OrderHistoryViewProps {
  orders: OrderWithPair[];
  pairs: import("@/types").Pair[];
  loading: boolean;
}

function OrderHistoryView({ orders, pairs, loading }: OrderHistoryViewProps) {
  const statuses = ["filled", "cancelled", "partial"];
  const statusColors: Record<string, string> = {
    filled:    "bg-[#00c853]/15 text-[#00c853]",
    cancelled: "bg-[#ff1744]/15 text-[#ff1744]",
    partial:   "bg-[#f5c518]/15 text-[#f5c518]",
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <RefreshCw className="w-4 h-4 text-[#444] animate-spin" />
      </div>
    );
  }

  if (orders.length === 0) {
    return <Empty msg="No order history" />;
  }

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full min-w-[650px]">
        <thead className="sticky top-0 bg-[#000000]">
          <tr className="border-b border-[#141414]">
            {["Symbol","Type","Side","Price","Amount","Status","Time"].map(h=>(
              <th key={h} className={TH}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orders.map((o, i) => {
            const ord = o.order;
            const symbol = pairSymbol(o);
            const amount = getDisplayAmount(o);
            const status = ord.status?.toLowerCase() ?? "unknown";
            const colorClass = statusColors[status] ?? "bg-[#333]/15 text-[#888]";
            return (
              <tr key={i} className="border-b border-[#111] hover:bg-[#111] transition-colors">
                <td className={`${TD} font-semibold text-white`}>{symbol}</td>
                <td className={`${TD} text-[#888]`}>{ord.order_type?.replace(/_/g, " ") ?? "—"}</td>
                <td className={TD}>
                  <span className={`font-bold ${ord.side === "buy" ? "text-[#00c853]" : "text-[#ff1744]"}`}>
                    {ord.side === "buy" ? "Buy" : "Sell"}
                  </span>
                </td>
                <td className={`${TD} tabular-nums text-[#ccc]`}>{fmtPx(parseFloat(ord.price ?? "0"))}</td>
                <td className={`${TD} tabular-nums text-[#ccc]`}>{amount.toFixed(4)}</td>
                <td className={TD}>
                  <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${colorClass}`}>{status}</span>
                </td>
                <td className={`${TD} tabular-nums text-[#555]`}>{fmtTime(ord.created_at ?? "")}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TradeHistoryView({ orders, loading }: { orders: OrderWithPair[]; loading: boolean }) {
  const filled = orders.filter(o => o.order.status === "filled" || o.order.status === "partial");
  
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <RefreshCw className="w-4 h-4 text-[#444] animate-spin" />
      </div>
    );
  }

  if (filled.length === 0) {
    return <Empty msg="No trade history" />;
  }

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full min-w-[650px]">
        <thead className="sticky top-0 bg-[#000000]">
          <tr className="border-b border-[#141414]">
            {["Symbol","Side","Price","Amount","Time"].map(h=>(
              <th key={h} className={TH}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filled.map((o, i) => {
            const ord = o.order;
            const symbol = pairSymbol(o);
            const amount = getDisplayAmount(o);
            return (
              <tr key={i} className="border-b border-[#111] hover:bg-[#111] transition-colors">
                <td className={`${TD} font-semibold text-white`}>{symbol}</td>
                <td className={TD}>
                  <span className={`font-bold ${ord.side === "buy" ? "text-[#00c853]" : "text-[#ff1744]"}`}>
                    {ord.side === "buy" ? "Buy" : "Sell"}
                  </span>
                </td>
                <td className={`${TD} tabular-nums text-[#ccc]`}>{fmtPx(parseFloat(ord.price ?? "0"))}</td>
                <td className={`${TD} tabular-nums text-[#ccc]`}>{amount.toFixed(4)}</td>
                <td className={`${TD} tabular-nums text-[#555]`}>{fmtTime(ord.updated_at ?? ord.created_at ?? "")}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function LadderHistoryView({ orders, loading, onCancel }: { orders: OrderWithPair[]; loading: boolean; onCancel: (id: number) => void }) {
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);
  const [cancelling, setCancelling] = useState<Set<number>>(new Set());

  // Filter to get only child orders (ladder_parent_id is not null)
  const childOrders = orders;

  // Group child orders by parent_id
  const groupedByParent: Record<number, OrderWithPair[]> = {};
  childOrders.forEach(o => {
    const parentId = o.order.ladder_parent_id || 0;
    if (!groupedByParent[parentId]) {
      groupedByParent[parentId] = [];
    }
    groupedByParent[parentId].push(o);
  });

  const parentIds = Object.keys(groupedByParent).map(Number).filter(id => id > 0);
  const selectedGroup = selectedParentId ? groupedByParent[selectedParentId] : null;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <RefreshCw className="w-4 h-4 text-[#444] animate-spin" />
      </div>
    );
  }

  if (parentIds.length === 0) {
    return <Empty msg="No ladder orders" />;
  }

  async function handleCancel(id: number) {
    setCancelling(prev => new Set(prev).add(id));
    await onCancel(id);
    setCancelling(prev => { const n = new Set(prev); n.delete(id); return n; });
  }

  async function handleCancelAll(parentId: number) {
    const childrenForParent = groupedByParent[parentId];
    for (const child of childrenForParent) {
      if (child.order.status !== "cancelled" && child.order.status !== "expired") {
        setCancelling(prev => new Set(prev).add(child.order.id));
        await onCancel(child.order.id);
      }
    }
    setCancelling(new Set());
  }

  const canCancelOrder = (status: string) => status !== "cancelled" && status !== "expired";

  return (
    <>
      <div className="flex-1 overflow-hidden">
        {parentIds.map((parentId) => {
          const childrenForParent = groupedByParent[parentId];
          const firstChild = childrenForParent[0];
          const remainingCount = childrenForParent.length - 1;

          if (!firstChild) return null;

          return (
            <div key={`ladder-${parentId}`}>
              {/* Collapsed row - shows first child */}
              <table className="w-full">
                <tbody>
                  <tr
                    className="border-b border-[#111] hover:bg-[#111] transition-colors cursor-pointer"
                    onClick={() => setSelectedParentId(parentId)}
                  >
                    <td className={TD} style={{ width: "12%" }}>
                      <div>
                        <div className="text-[10px]" style={{ color: "var(--m-fg-4)" }}>Symbol</div>
                        <div className="text-[12px] font-semibold" style={{ color: "var(--m-fg)" }}>{pairSymbol(firstChild)}</div>
                      </div>
                    </td>
                    <td className={TD} style={{ width: "15%" }}>
                      <div>
                        <div className="text-[10px]" style={{ color: "var(--m-fg-4)" }}>Price</div>
                        <div className="text-[12px] font-semibold tabular-nums" style={{ color: "var(--m-fg-2)" }}>{fmtPx(parseFloat(firstChild.order.price))}</div>
                      </div>
                    </td>
                    <td className={TD} style={{ width: "12%" }}>
                      <div>
                        <div className="text-[10px]" style={{ color: "var(--m-fg-4)" }}>Amount</div>
                        <div className="text-[12px] font-semibold tabular-nums" style={{ color: "var(--m-fg-2)" }}>{getDisplayAmount(firstChild).toFixed(4)}</div>
                      </div>
                    </td>
                    <td className={TD} style={{ width: "12%" }}>
                      <div>
                        <div className="text-[10px]" style={{ color: "var(--m-fg-4)" }}>Status</div>
                        <span className="text-[11px] px-1.5 py-0.5 rounded font-medium" style={{
                          backgroundColor: firstChild.order.status === "filled" ? "#00c853/15" : 
                                         firstChild.order.status === "cancelled" ? "#ff1744/15" :
                                         firstChild.order.status === "partial" ? "#f5c518/15" : "#333/15",
                          color: firstChild.order.status === "filled" ? "#00c853" : 
                               firstChild.order.status === "cancelled" ? "#ff1744" :
                               firstChild.order.status === "partial" ? "#f5c518" : "#888"
                        }}>
                          {firstChild.order.status}
                        </span>
                      </div>
                    </td>
                    <td className={TD} style={{ width: "12%" }}>
                      <div>
                        <div className="text-[10px]" style={{ color: "var(--m-fg-4)" }}>Remaining</div>
                        <div className="text-[12px] font-semibold tabular-nums" style={{ color: "var(--m-fg-2)" }}>{getFilledAmountHuman(firstChild).toFixed(4)}</div>
                      </div>
                    </td>
                    <td className={TD} style={{ width: "15%" }}>
                      <div>
                        <div className="text-[10px]" style={{ color: "var(--m-fg-4)" }}>Time</div>
                        <div className="text-[11px]" style={{ color: "var(--m-fg-4)" }}>{fmtTime(firstChild.order.created_at ?? "")}</div>
                      </div>
                    </td>
                    <td className={TD} style={{ width: "22%", textAlign: "right" }}>
                      <div className="flex items-center justify-end gap-2">
                        {remainingCount > 0 && (
                          <span
                            className="text-[11px] font-semibold px-2 py-1 rounded"
                            style={{ backgroundColor: "#333", color: "#888" }}
                          >
                            +{remainingCount}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      {/* Modal Popup */}
      {selectedGroup && (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
            onClick={() => setSelectedParentId(null)}
            style={{ pointerEvents: "auto" }}
          >
            <div
              className="bg-black rounded-lg shadow-lg max-w-2xl w-11/12 max-h-[80vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
              style={{ pointerEvents: "auto", backgroundColor: "#000" }}
            >
              {/* Header */}
              <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-[#111] bg-black" style={{ backgroundColor: "#000" }}>
                <h2 className="text-[16px] font-bold" style={{ color: "var(--m-fg)" }}>
                  Ladder Orders
                </h2>
                <button
                  onClick={() => setSelectedParentId(null)}
                  className="text-[20px] text-[#666] hover:text-[#ccc] transition-colors"
                >
                  x
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-3 bg-black" style={{ backgroundColor: "#000" }}>
                {selectedGroup.map((order, idx) => {
                  const ord = order.order;
                  const price = parseFloat(ord.price);
                  const amount = getDisplayAmount(order);
                  const filled = getFilledAmountHuman(order);
                  const isFirstChild = idx === 0;
                  const canCancel = canCancelOrder(ord.status);

                  return (
                    <div
                      key={`modal-child-${ord.id}`}
                      className="rounded-lg px-4 py-3 border border-[#111]"
                      style={{ backgroundColor: "#0a0a0a" }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {isFirstChild && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: "#f5c518/20", color: "#f5c518" }}>
                              First
                            </span>
                          )}
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                            style={{
                              backgroundColor: ord.status === "filled" ? "#00c853/15" : 
                                             ord.status === "cancelled" ? "#ff1744/15" :
                                             ord.status === "partial" ? "#f5c518/15" : "#333/15",
                              color: ord.status === "filled" ? "#00c853" : 
                                   ord.status === "cancelled" ? "#ff1744" :
                                   ord.status === "partial" ? "#f5c518" : "#888"
                            }}
                          >
                            {ord.status.charAt(0).toUpperCase() + ord.status.slice(1)}
                          </span>
                        </div>
                        {canCancel && (
                          <button
                            disabled={cancelling.has(ord.id)}
                            onClick={() => handleCancel(ord.id)}
                            className="text-[11px] font-semibold px-3 py-1 rounded-lg"
                            style={{
                              color: cancelling.has(ord.id) ? "#666" : "#ff1744",
                              backgroundColor: cancelling.has(ord.id) ? "#333" : "rgba(255,23,68,0.1)",
                              opacity: cancelling.has(ord.id) ? 0.6 : 1,
                            }}
                          >
                            {cancelling.has(ord.id) ? "Cancelling..." : "Cancel"}
                          </button>
                        )}
                      </div>

                      <div className="space-y-2 text-[12px]">
                        <div className="flex justify-between">
                          <span style={{ color: "#666" }}>Price:</span>
                          <span style={{ color: "#ccc" }}>{price.toFixed(6)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: "#666" }}>Amount:</span>
                          <span style={{ color: "#ccc" }}>{amount.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: "#666" }}>Remaining:</span>
                          <span style={{ color: "#ccc" }}>{filled.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: "#666" }}>Time:</span>
                          <span style={{ color: "#888" }}>{fmtTime(ord.created_at ?? "")}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Cancel All Button */}
                {selectedGroup.some(o => canCancelOrder(o.order.status)) && (
                  <button
                    disabled={selectedGroup.some(o => cancelling.has(o.order.id))}
                    onClick={() => handleCancelAll(selectedGroup[0].order.ladder_parent_id!)}
                    className="w-full mt-4 text-[12px] font-semibold py-3 rounded-lg transition-all"
                    style={{
                      color: selectedGroup.some(o => cancelling.has(o.order.id)) ? "#666" : "#f5c518",
                      backgroundColor: selectedGroup.some(o => cancelling.has(o.order.id)) ? "#333" : "rgba(245,197,24,0.1)",
                      opacity: selectedGroup.some(o => cancelling.has(o.order.id)) ? 0.6 : 1,
                    }}
                  >
                    {selectedGroup.some(o => cancelling.has(o.order.id)) ? "Cancelling..." : "Cancel All"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
    </>
  );
}

export function BottomPanel() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<BottomTab>("Open Orders");
  const [cancelling, setCancelling] = useState<Set<number>>(new Set());

  const { primaryWallet } = useDynamicContext();
  const address  = primaryWallet?.address as string | undefined;
  const pairs    = useStore((s) => s.pairs);
  const orderRefreshTick = useStore(s => s.orderRefreshTick);
  const selectedPairId = useStore(s => s.selectedPair?.id ?? null);

  // DEBUG: Log when component mounts and selectedPairId changes
  useEffect(() => {
    console.log("[BottomPanel] mounted/updated - selectedPairId:", selectedPairId, "address:", address);
  }, [selectedPairId, address]);

  // Real open orders
  const [openOrders, setOpenOrders] = useState<OrderWithPair[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // DEBUG: Log when openOrders changes
  useEffect(() => {
    console.log("[BottomPanel] openOrders updated:", openOrders.length, "orders");
  }, [openOrders]);

  const fetchOpenOrders = useCallback(async () => {
    if (!address) { setOpenOrders([]); return; }
    setOrdersLoading(true);
    try {
      const res = await getOpenOrders(address);
      setOpenOrders(res.data ?? []);
    } catch {
      setOpenOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, [address]);

  // Real ladder orders
  const [ladderOrders, setLadderOrders] = useState<OrderWithPair[]>([]);
  const [ladderLoading, setLadderLoading] = useState(false);

  const fetchLadderOrders = useCallback(async () => {
    if (!address) {
      setLadderOrders([]);
      return;
    }
    setLadderLoading(true);
    try {
      const res = await getLadderOrders(address);
      setLadderOrders(res.data ?? []);
    } catch {
      setLadderOrders([]);
    } finally {
      setLadderLoading(false);
    }
  }, [address]);

  const fetchHistory = useCallback(async () => {
    if (!address) { setHistoryOrders([]); return; }
    setHistoryLoading(true);
    try {
      const res = await getHistoryOrders(address, 50, 0);
      setHistoryOrders(res.data ?? []);
    } catch {
      setHistoryOrders([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [address]);

  // Real order history
  const [historyOrders, setHistoryOrders] = useState<OrderWithPair[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Initial load
  useEffect(() => {
    fetchOpenOrders();
    fetchLadderOrders();
    fetchHistory();
  }, [fetchOpenOrders, fetchLadderOrders, fetchHistory]);

  // Re-fetch open and ladder orders when a new order is placed
  useEffect(() => {
    if (orderRefreshTick > 0) {
      fetchOpenOrders();
      fetchLadderOrders();
    }
  }, [orderRefreshTick, fetchOpenOrders, fetchLadderOrders]);

  // Real-time order status updates via WebSocket
  // Subscribe using selectedPairId - the backend broadcasts order updates to all clients
  usePairWebsocket(selectedPairId ?? 'all', {
    onOrderUpdate: (order: OrderUpdatePayload) => {
      console.log("[BottomPanel WebSocket] Received order update:", order.id, "status:", order.status);
      setOpenOrders(prev => {
        const idx = prev.findIndex(o => o.order.id === order.id);
        if (idx === -1) return prev;
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          order: {
            ...updated[idx].order,
            filled_amount: order.filled_amount,
            status: order.status as OrderStatus,
          },
        };
        // Remove from open list if fully filled, cancelled, or expired
        if (order.status === 'filled' || order.status === 'cancelled' || order.status === 'expired') {
          return updated.filter(o => o.order.id !== order.id);
        }
        return updated;
      });
    },
  });

  async function handleCancel(id: number) {
    setCancelling(prev => new Set(prev).add(id));
    try {
      await cancelOrder(String(id), address);
      setOpenOrders(prev => prev.filter(o => o.order.id !== id));
    } catch (err) {
      console.error("Failed to cancel order:", err);
    } finally {
      setCancelling(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  }

  const openOrdersCount = openOrders.filter(o => !o.order.is_ladder).length;

  function renderContent() {
    if (!primaryWallet) {
      return <NoWallet />;
    }
    switch (activeTab) {
      case "Open Orders":
        return (
          <OpenOrdersView
            orders={openOrders}
            pairs={pairs}
            loading={ordersLoading}
            onCancel={handleCancel}
            cancelling={cancelling}
          />
        );
      case "Ladder History":
        return (
          <LadderHistoryView
            orders={ladderOrders}
            loading={ladderLoading}
            onCancel={handleCancel}
          />
        );
      case "Order History":
        return (
          <OrderHistoryView
            orders={historyOrders}
            pairs={pairs}
            loading={historyLoading}
          />
        );
        case "Trade History":
        return <TradeHistoryView orders={historyOrders} loading={historyLoading} />;
    }
  }

  return (
    <div className="flex flex-col bg-[#000000] border-t border-[#1a1a1a] h-full overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center h-[36px] border-b border-[#141414] bg-[#000000] shrink-0 px-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            data-testid={`bottom-tab-${tab.toLowerCase().replace(/ /g,"-")}`}
            className={`h-full px-3 text-[12px] font-semibold whitespace-nowrap transition-colors relative ${
              activeTab === tab
                ? "text-white after:absolute after:bottom-0 after:left-1 after:right-1 after:h-[2px] after:bg-[#f5c518] after:content-['']"
                : "text-[#555] hover:text-[#aaa]"
            }`}
          >
            {t(tab === "Open Orders" ? 'orders.tab.open' : tab === "Ladder History" ? 'Ladder History' : tab === "Order History" ? 'orders.tab.history' : 'orders.tab.tradeHistory')}
            {tab === "Open Orders" && openOrdersCount > 0 && (
              <span className="ml-1 text-[10px] bg-[#f5c518]/20 text-[#f5c518] px-1 rounded-full">{openOrdersCount}</span>
            )}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-3 px-3 shrink-0">
          {activeTab === "Open Orders" && address && (
            <button 
              onClick={() => {
                if (address) {
                  setOrdersLoading(true);
                  getOpenOrders(address)
                    .then((res) => setOpenOrders(res.data || []))
                    .catch(() => setOpenOrders([]))
                    .finally(() => setOrdersLoading(false));
                }
              }} 
              className="text-[#555] hover:text-white transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          )}
          <button className="text-[#555] hover:text-white transition-colors"><Filter className="w-3.5 h-3.5" /></button>
          <button className="text-[#555] hover:text-white transition-colors"><Download className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden text-white">
        {renderContent()}
      </div>
    </div>
  );
}
