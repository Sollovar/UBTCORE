import React, { useState } from 'react';
import type { Orderbook, OrderbookLevel, RecentTrade } from '../../types';
import { formatPrice, formatSpreadPercent } from '../../utils/formatters';
import { getTrades } from '../../services/orderbook';

function calculateOrderbookImbalance(orderbook: Orderbook): { buyImbalance: number; sellImbalance: number } {
  const bidVolume = orderbook.bids.reduce((sum, level) => {
    const amount = typeof level.amount === 'string' ? parseFloat(level.amount) : level.amount;
    return sum + amount;
  }, 0);
  
  const askVolume = orderbook.asks.reduce((sum, level) => {
    const amount = typeof level.amount === 'string' ? parseFloat(level.amount) : level.amount;
    return sum + amount;
  }, 0);
  
  const totalVolume = bidVolume + askVolume;
  
  if (totalVolume === 0) {
    return { buyImbalance: 0, sellImbalance: 0 };
  }
  
  const buyImbalance = (bidVolume / totalVolume) * 100;
  const sellImbalance = (askVolume / totalVolume) * 100;
  
  return {
    buyImbalance: Math.round(buyImbalance * 10) / 10,
    sellImbalance: Math.round(sellImbalance * 10) / 10
  };
}

interface DesktopOrderbookProps {
  orderbook: Orderbook | null;
  loading?: boolean;
  pairId?: string;
}

function OrderbookLevelRow({ level, type, maxTotal }: { level: OrderbookLevel; type: 'bid' | 'ask'; maxTotal: number }) {
  const amount = typeof level.amount === 'string' ? parseFloat(level.amount) : level.amount;
  const total = typeof level.total === 'string' ? parseFloat(level.total) : level.total;
  const percentage = maxTotal > 0 ? (total / maxTotal) * 100 : 0;

  return (
    <div className="relative flex items-center py-1.5 px-2 hover:bg-(--surface-elevated)">
      <div
        className={`absolute inset-y-0 right-0 ${type === 'bid' ? 'bg-[#10b981]/10' : 'bg-[#ef4444]/10'}`}
        style={{ width: `${percentage}%` }}
      />
      <div className="relative flex-1 grid grid-cols-3 gap-2 text-sm">
        <span className={type === 'bid' ? 'text-[#10b981]' : 'text-[#ef4444]'}>
          {formatPrice(level.price)}
        </span>
        <span className="text-(--text-primary) text-right">{amount.toFixed(4)}</span>
        <span className="text-(--text-dim) text-right">{total.toFixed(4)}</span>
      </div>
    </div>
  );
}

function TradesPanel({ pairId, onClose }: { pairId: string; onClose: () => void }) {
  const [trades, setTrades] = useState<RecentTrade[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    let mounted = true;
    const fetchTrades = async () => {
      try {
        setLoading(true);
        const result = await getTrades(pairId, 50);
        if (mounted) setTrades(result);
      } catch (error) {
        console.error(error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchTrades();
    const interval = window.setInterval(fetchTrades, 5000);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [pairId]);

  return (
    <div className="absolute inset-0 bg-(--surface) z-10 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-(--border)">
        <h3 className="font-semibold text-(--text-primary)">Recent Trades</h3>
        <button
          onClick={onClose}
          className="text-xs text-(--text-dim) hover:text-(--text-primary)"
        >
          ✕ Close
        </button>
      </div>
      
      <div className="grid grid-cols-4 gap-2 px-4 py-2 text-xs text-(--text-dim) font-medium border-b border-(--border)">
        <span>Price</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Side</span>
        <span className="text-right">Time</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-(--text-dim)">Loading...</div>
        ) : trades.length === 0 ? (
          <div className="p-4 text-center text-(--text-dim)">No trades yet</div>
        ) : (
          trades.map((trade, i) => (
            <div key={i} className="grid grid-cols-4 gap-2 px-4 py-2 text-xs hover:bg-(--surface-elevated)">
              <span className={trade.side === 'buy' ? 'text-[#10b981]' : 'text-[#ef4444]'}>
                {formatPrice(trade.price)}
              </span>
              <span className="text-(--text-primary) text-right">
                {Number(trade.amount).toFixed(4)}
              </span>
              <span className={`text-right font-medium ${trade.side === 'buy' ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                {trade.side.toUpperCase()}
              </span>
              <span className="text-(--text-dim) text-right">
                {new Date(trade.time).toLocaleTimeString()}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function DesktopOrderbook({ orderbook, loading, pairId }: DesktopOrderbookProps) {
  const [showTrades, setShowTrades] = useState(false);

  if (!orderbook) {
    return (
      <div className="bg-(--surface) border border-(--border) rounded-xl p-4 h-96 flex items-center justify-center relative">
        <p className="text-(--text-dim)">Select a pair to view orderbook</p>
      </div>
    );
  }

  const maxBidTotal = Math.max(...orderbook.bids.map(b => typeof b.total === 'string' ? parseFloat(b.total) : b.total), 0);
  const maxAskTotal = Math.max(...orderbook.asks.map(a => typeof a.total === 'string' ? parseFloat(a.total) : a.total), 0);
  const maxTotal = Math.max(maxBidTotal, maxAskTotal);

  // Get best bid and best ask for display
  const bestBid = orderbook.bids.length > 0 ? (typeof orderbook.bids[0].price === 'string' ? parseFloat(orderbook.bids[0].price) : orderbook.bids[0].price) : 0;
  const bestAsk = orderbook.asks.length > 0 ? (typeof orderbook.asks[0].price === 'string' ? parseFloat(orderbook.asks[0].price) : orderbook.asks[0].price) : 0;

  return (
    <div className="bg-(--surface) border border-(--border) rounded-xl overflow-hidden relative">
      {showTrades && pairId ? (
        <TradesPanel pairId={pairId} onClose={() => setShowTrades(false)} />
      ) : (
        <>
          {/* Header with Mid-Price and Spread - Binance style */}
          <div className="px-4 py-3 border-b border-(--border)">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-(--text-primary)">Orderbook</h3>
              {pairId && (
                <button
                  onClick={() => setShowTrades(true)}
                  className="px-2 py-1 text-xs font-medium text-(--text-primary) bg-(--surface-elevated) hover:bg-(--surface-hover) rounded-md border border-(--border)"
                >
                  Trades
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 px-2 py-2 text-xs text-(--text-dim) font-medium">
            <span>Price</span>
            <span className="text-right">Amount</span>
            <span className="text-right">Total</span>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {orderbook.asks.slice().reverse().map((level, i) => (
              <OrderbookLevelRow key={`ask-${i}`} level={level} type="ask" maxTotal={maxTotal} />
            ))}
          </div>

          {/* Center price divider with Spread and Imbalance */}
          <div className="px-4 py-3 bg-(--surface-elevated) border-y border-(--border)">
            {/* Imbalance Bar */}
            {(() => {
              const { buyImbalance, sellImbalance } = calculateOrderbookImbalance(orderbook);
              return (
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-(--text-dim)">Buy</span>
                    <div className="w-24 h-2 bg-(--surface) rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#10b981]" 
                        style={{ width: `${buyImbalance}%` }} 
                      />
                    </div>
                    <span className="text-xs font-medium text-[#10b981]">{buyImbalance.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-[#ef4444]">{sellImbalance.toFixed(1)}%</span>
                    <div className="w-24 h-2 bg-(--surface) rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#ef4444] ml-auto" 
                        style={{ width: `${sellImbalance}%` }} 
                      />
                    </div>
                    <span className="text-xs text-(--text-dim)">Sell</span>
                  </div>
                </div>
              );
            })()}
            
            <div className="grid grid-cols-2 gap-3 px-3 py-2 bg-(--surface-elevated)/60 border-y border-(--border) flex-shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-xs text-(--text-dim)">Mid</span>
                <span className="text-xs font-medium text-(--text-primary)">
                  ${orderbook.midPrice > 0 ? formatPrice(orderbook.midPrice) : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-(--text-dim)">Spread</span>
                <span className="text-xs font-medium text-(--text-primary)">
                  {orderbook.spread > 0 ? formatPrice(orderbook.spread) : '-'}
                </span>
              </div>
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {orderbook.bids.map((level, i) => (
              <OrderbookLevelRow key={`bid-${i}`} level={level} type="bid" maxTotal={maxTotal} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
