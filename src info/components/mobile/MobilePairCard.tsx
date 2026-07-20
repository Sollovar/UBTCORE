import React, { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import type { Pair } from '../../types';
import { formatPrice, formatPercent, formatNumber } from '../../utils/formatters';

interface MobilePairCardProps {
  pair: Pair;
  onClick?: () => void;
  isSelected?: boolean;
}

function TokenLogo({ src, alt, fallbackColor, size = 24 }: { src?: string; alt: string; fallbackColor: string; size?: number }) {
  const [hasError, setHasError] = useState(false);
  const hasLogo = Boolean(src) && !hasError;

  return (
    <>
      {hasLogo ? (
        <img
          src={src}
          alt={alt}
          className="rounded-full border border-(--surface) object-cover"
          style={{ width: size, height: size }}
          onError={() => setHasError(true)}
        />
      ) : (
        <div
          className="rounded-full flex items-center justify-center border border-(--surface)"
          style={{ width: size, height: size, backgroundColor: fallbackColor }}
        >
          <span className="text-[8px] text-white font-bold">{alt.slice(0, 2)}</span>
        </div>
      )}
    </>
  );
}

export function MobilePairCard({ pair, onClick, isSelected }: MobilePairCardProps) {
  const isPositive = pair.priceChange24h >= 0;

  return (
    <div
      onClick={onClick}
      className={`
        flex-shrink-0 w-36 p-3 bg-(--surface) border rounded-xl cursor-pointer transition-all
        ${isSelected ? 'border-[#6366f1]' : 'border-(--border) hover:border-[#6366f1]'}
      `}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="flex -space-x-1">
          <TokenLogo src={pair.baseToken.logo} alt={pair.baseToken.symbol} fallbackColor="#6366f1" size={24} />
          <TokenLogo src={pair.quoteToken.logo} alt={pair.quoteToken.symbol} fallbackColor="#22d3ee" size={24} />
        </div>
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-(--surface-elevated)">
          <TrendingUp size={10} className="text-[#22d3ee]" />
          <span className="text-[10px] text-[#22d3ee] font-medium">{pair.trendingScore.toFixed(2)}</span>
        </div>
      </div>

      <p className="font-semibold text-(--text-primary) text-sm mb-1">{pair.baseToken.symbol}/{pair.quoteToken.symbol}</p>
      <p className="text-sm font-bold text-(--text-primary) font-mono">{formatPrice(pair.price)}</p>
      <p className={`text-xs font-medium ${isPositive ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
        {formatPercent(pair.priceChange24h)}
      </p>
      <p className="text-[10px] text-(--text-dim) mt-1">${formatNumber(pair.volume24h)}</p>
    </div>
  );
}
