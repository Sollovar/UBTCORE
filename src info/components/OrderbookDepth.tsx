import React, { useMemo } from 'react';
import type { OrderbookLevel } from '../types';
import { formatPrice } from '../utils/formatters';
import { useTranslation } from '../i18n/i18n';

interface AggregatedLevel {
  price: number;
  amount: number;
  total: number;
  cumulative: number;
}

interface OrderbookDepthProps {
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
  pricePrecision?: number;
  maxRows?: number;
}

export function useOrderbookDepth(
  bids: OrderbookLevel[],
  asks: OrderbookLevel[],
  pricePrecision: number = 6,
  maxRows: number = 15
) {
  const aggregatedData = useMemo(() => {
    const groupByPrice = (levels: OrderbookLevel[], isBid: boolean): AggregatedLevel[] => {
      const grouped: Record<number, number> = {};
      
      for (const level of levels) {
        const price = Number(level.price);
        const amount = Number(level.amount);
        if (price > 0 && amount > 0) {
          const precision = Math.pow(10, -pricePrecision);
          const groupedPrice = Math.round(price / precision) * precision;
          grouped[groupedPrice] = (grouped[groupedPrice] || 0) + amount;
        }
      }
      
      const sorted = Object.entries(grouped)
        .map(([price, amount]) => ({
          price: parseFloat(price),
          amount,
          total: amount,
          cumulative: 0
        }))
        .sort((a, b) => isBid ? b.price - a.price : a.price - b.price);
      
      let cumulative = 0;
      for (const level of sorted) {
        cumulative += level.amount;
        level.cumulative = cumulative;
        level.total = level.amount;
      }
      
      return sorted;
    };
    
    const groupedBids = groupByPrice(bids, true);
    const groupedAsks = groupByPrice(asks, false);
    
    const maxCumulative = Math.max(
      groupedBids.reduce((sum, l) => Math.max(sum, l.cumulative), 0),
      groupedAsks.reduce((sum, l) => Math.max(sum, l.cumulative), 0),
      1
    );
    
    return {
      bids: groupedBids.slice(0, maxRows),
      asks: groupedAsks.slice(0, maxRows),
      maxCumulative
    };
  }, [bids, asks, pricePrecision, maxRows]);
  
  return aggregatedData;
}

interface DepthRowProps {
  price: number;
  amount: number;
  cumulative: number;
  maxCumulative: number;
  type: 'bid' | 'ask';
}

export function DepthRow({ price, amount, cumulative, maxCumulative, type }: DepthRowProps) {
  const percentage = maxCumulative > 0 ? (cumulative / maxCumulative) * 100 : 0;
  const isBid = type === 'bid';
  
  return (
    <div className="relative flex items-center py-1 px-3 hover:bg-(--surface-elevated)/50 transition-colors duration-150">
      <div
        className={`absolute inset-y-0 ${isBid 
          ? 'right-0 bg-gradient-to-l from-[#10b981]/20 to-transparent' 
          : 'right-0 bg-gradient-to-l from-[#ef4444]/20 to-transparent'}`}
        style={{ width: `${percentage}%` }}
      />
      <div className="relative grid grid-cols-3 w-full text-xs gap-1">
        <span className={isBid ? 'text-[#10b981]' : 'text-[#ef4444] font-medium'}>
          {formatPrice(price)}
        </span>
        <span className="text-(--text-secondary) text-right font-mono">{amount.toFixed(4)}</span>
        <span className="text-(--text-dim) text-right font-mono">{cumulative.toFixed(4)}</span>
      </div>
    </div>
  );
}

export function OrderbookDepth({ 
  bids: rawBids, 
  asks: rawAsks, 
  pricePrecision = 6,
  maxRows = 12
}: OrderbookDepthProps) {
  const { t } = useTranslation();
  const { bids, asks, maxCumulative } = useOrderbookDepth(
    rawBids,
    rawAsks,
    pricePrecision,
    maxRows
  );
  
  const midPrice = useMemo(() => {
    if (bids.length > 0 && asks.length > 0) {
      return (bids[0].price + asks[0].price) / 2;
    }
    return 0;
  }, [bids, asks]);
  
  const spread = useMemo(() => {
    if (bids.length > 0 && asks.length > 0) {
      return asks[0].price - bids[0].price;
    }
    return 0;
  }, [bids, asks]);
  
  return (
    <div className="flex flex-col h-full">
      <div className="grid grid-cols-3 px-3 py-2 text-[10px] font-semibold text-(--text-dim) uppercase border-b border-(--border)/50">
        <span>{t('trade.price')}</span>
        <span className="text-right">{t('trade.amount')}</span>
        <span className="text-right">{t('trade.cumulative')}</span>
      </div>
      
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="overflow-y-auto flex-1">
          {asks.length === 0 ? (
            <div className="py-4 text-center text-xs text-(--text-dim)">{t('trade.noAsks')}</div>
          ) : (
            asks.slice().reverse().map((level, i) => (
              <DepthRow
                key={`ask-${i}`}
                price={level.price}
                amount={level.amount}
                cumulative={level.cumulative}
                maxCumulative={maxCumulative}
                type="ask"
              />
            ))
          )}
        </div>
        
        <div className="flex items-center justify-between px-3 py-2 bg-(--surface-elevated)/80 border-y border-(--border) flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-(--text-dim)">{t('trade.spread')}</span>
            <span className="text-sm font-medium text-(--text-primary) font-mono">
              {spread > 0 ? formatPrice(spread) : '-'}
            </span>
          </div>
          <div className="text-xs font-medium text-(--text-dim)">
            {t('trade.midPrice')}: <span className="text-(--text-primary) font-mono">${midPrice > 0 ? formatPrice(midPrice) : '-'}</span>
          </div>
        </div>
        
        <div className="overflow-y-auto flex-1">
          {bids.length === 0 ? (
            <div className="py-4 text-center text-xs text-(--text-dim)">{t('trade.noBids')}</div>
          ) : (
            bids.map((level, i) => (
              <DepthRow
                key={`bid-${i}`}
                price={level.price}
                amount={level.amount}
                cumulative={level.cumulative}
                maxCumulative={maxCumulative}
                type="bid"
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}