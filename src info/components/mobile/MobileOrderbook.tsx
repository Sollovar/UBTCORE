import React, { useState } from 'react';
import type { Orderbook, OrderbookLevel } from '../../types';
import { formatPrice, formatSpread } from '../../utils/formatters';
import { useTranslation } from '../../i18n/i18n';

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

interface MobileOrderbookProps {
  orderbook: Orderbook | null;
}

export function MobileOrderbook({ orderbook }: MobileOrderbookProps) {
  const [activeSide, setActiveSide] = useState<'asks' | 'bids'>('asks');
  const { t } = useTranslation();

  if (!orderbook) {
    return (
      <div className="bg-(--surface) border border-(--border) rounded-xl p-4 m-4">
        <p className="text-(--text-dim) text-center">{t('orderbook.selectPair')}</p>
      </div>
    );
  }

  const maxTotal = Math.max(
    ...(activeSide === 'asks' ? orderbook.asks : orderbook.bids).map(a => typeof a.total === 'string' ? parseFloat(a.total) : a.total),
    0
  );

  // Get best bid and best ask for display
  const bestBid = orderbook.bids.length > 0 ? (typeof orderbook.bids[0].price === 'string' ? parseFloat(orderbook.bids[0].price) : orderbook.bids[0].price) : 0;
  const bestAsk = orderbook.asks.length > 0 ? (typeof orderbook.asks[0].price === 'string' ? parseFloat(orderbook.asks[0].price) : orderbook.asks[0].price) : 0;

  return (
    <div className="bg-(--surface) border border-(--border) rounded-xl overflow-hidden m-4">
      {/* Header with Mid-Price and Spread - Mobile optimized */}
      <div className="px-4 py-3 border-b border-(--border)">
        <h3 className="font-semibold text-(--text-primary)">{t('orderbook.title')}</h3>
        
        {/* Mid-Price and Spread Display */}
        {orderbook.midPrice > 0 && (
          <div className="flex items-center justify-between mt-2">
            <div>
              <span className="text-xs text-(--text-dim)">{t('orderbook.mid')}</span>
              <span className="text-sm font-medium text-(--text-primary) font-mono">
                {formatPrice(orderbook.midPrice)}
              </span>
            </div>
            <div>
              <span className="text-xs text-(--text-dim)">{t('orderbook.spread')}</span>
              <span className="text-sm font-medium text-(--text-primary) font-mono">
                {formatSpread(orderbook.spread)}
              </span>
            </div>
          </div>
        )}
        
        {/* Best Bid/Ask */}
        {(bestBid > 0 || bestAsk > 0) && (
          <div className="flex items-center justify-between mt-1">
            {bestBid > 0 && (
              <div>
                <span className="text-xs text-(--text-dim)">{t('orderbook.bid')}</span>
                <span className="text-xs font-medium text-[#10b981] font-mono">
                  {formatPrice(bestBid)}
                </span>
              </div>
            )}
            {bestAsk > 0 && (
              <div>
                <span className="text-xs text-(--text-dim)">{t('orderbook.ask')}</span>
                <span className="text-xs font-medium text-[#ef4444] font-mono">
                  {formatPrice(bestAsk)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex">
        <button
          onClick={() => setActiveSide('asks')}
          className={`flex-1 py-2 text-sm font-medium ${
            activeSide === 'asks' ? 'text-[#ef4444] border-b-2 border-[#ef4444]' : 'text-(--text-dim)'
          }`}
        >
          {t('orderbook.asks')}
        </button>
        <button
          onClick={() => setActiveSide('bids')}
          className={`flex-1 py-2 text-sm font-medium ${
            activeSide === 'bids' ? 'text-[#10b981] border-b-2 border-[#10b981]' : 'text-(--text-dim)'
          }`}
        >
          {t('orderbook.bids')}
        </button>
      </div>

      {/* Orderbook Imbalance Indicator */}
      {(() => {
        const { buyImbalance, sellImbalance } = calculateOrderbookImbalance(orderbook);
        return (
          <div className="flex items-center justify-between px-4 py-2 bg-(--surface-elevated) border-y border-(--border)">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-(--text-dim)">{t('orderbook.buy')}</span>
              <div className="w-20 h-1.5 bg-(--surface) rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#10b981]" 
                  style={{ width: `${buyImbalance}%` }} 
                />
              </div>
              <span className="text-xs font-medium text-[#10b981]">{buyImbalance.toFixed(1)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-[#ef4444]">{sellImbalance.toFixed(1)}%</span>
              <div className="w-20 h-1.5 bg-(--surface) rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#ef4444] ml-auto" 
                  style={{ width: `${sellImbalance}%` }} 
                />
              </div>
              <span className="text-[10px] text-(--text-dim)">{t('orderbook.sell')}</span>
            </div>
          </div>
        );
      })()}

      <div className="grid grid-cols-3 gap-2 px-4 py-2 text-[10px] text-(--text-dim) font-medium">
        <span>{t('orderbook.price')}</span>
        <span className="text-right">{t('orderbook.amount')}</span>
        <span className="text-right">{t('orderbook.total')}</span>
      </div>

      <div className="max-h-48 overflow-y-auto px-2">
        {(activeSide === 'asks' ? orderbook.asks.slice().reverse() : orderbook.bids).map((level, i) => {
          const amount = typeof level.amount === 'string' ? parseFloat(level.amount) : level.amount;
          const total = typeof level.total === 'string' ? parseFloat(level.total) : level.total;
          const percentage = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
          const isAsk = activeSide === 'asks';

          return (
            <div key={i} className="relative flex items-center py-1.5">
              <div
                className={`absolute inset-y-0 right-0 ${isAsk ? 'bg-[#ef4444]/10' : 'bg-[#10b981]/10'}`}
                style={{ width: `${percentage}%` }}
              />
              <div className="relative flex-1 grid grid-cols-3 gap-2 text-xs">
                <span className={isAsk ? 'text-[#ef4444]' : 'text-[#10b981]'}>
                  {formatPrice(level.price)}
                </span>
                <span className="text-(--text-primary) text-right font-mono">{amount.toFixed(4)}</span>
                <span className="text-(--text-dim) text-right font-mono">{total.toFixed(4)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
