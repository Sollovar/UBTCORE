import React, { useState } from 'react';
import { TrendingUp, Droplets } from 'lucide-react';
import type { Pair } from '../../types';
import { Card } from '../common/Card';
import { formatPrice, formatPercent, formatNumber } from '../../utils/formatters';

interface DesktopPairCardProps {
  pair: Pair;
  onClick?: () => void;
  isSelected?: boolean;
}

function TokenLogo({ src, alt, fallbackColor }: { src?: string; alt: string; fallbackColor: string }) {
  const [hasError, setHasError] = useState(false);
  const hasLogo = Boolean(src) && !hasError;

  return (
    <>
      {hasLogo ? (
        <img
          src={src}
          alt={alt}
          className="w-8 h-8 rounded-full border-2 border-(--surface) object-cover"
          onError={() => setHasError(true)}
        />
      ) : (
        <div className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-(--surface)" style={{ backgroundColor: fallbackColor }}>
          <span className="text-xs text-white font-bold">{alt.slice(0, 2)}</span>
        </div>
      )}
    </>
  );
}

export function DesktopPairCard({ pair, onClick, isSelected }: DesktopPairCardProps) {
  const isPositive = pair.priceChange24h >= 0;
  const baseLogo = pair.baseToken?.logo || '';
  const quoteLogo = pair.quoteToken?.logo || '';

  return (
    <Card hover onClick={onClick} className={isSelected ? 'border-[#6366f1]' : ''}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            <TokenLogo src={baseLogo} alt={pair.baseToken?.symbol || '??'} fallbackColor="#6366f1" />
            <TokenLogo src={quoteLogo} alt={pair.quoteToken?.symbol || '??'} fallbackColor="#22d3ee" />
          </div>
          <div>
            <p className="font-semibold text-(--text-primary)">{pair.baseToken.symbol}/{pair.quoteToken.symbol}</p>
            <p className="text-xs text-(--text-dim)">{pair.dexName}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-(--surface-elevated)">
          <TrendingUp size={12} className="text-[#22d3ee]" />
          <span className="text-xs text-[#22d3ee] font-medium">{pair.trendingScore.toFixed(2)}</span>
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-lg font-bold text-(--text-primary) font-mono">{formatPrice(pair.price)}</p>
          <p className={`text-sm font-medium ${isPositive ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
            {formatPercent(pair.priceChange24h)}
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-xs text-(--text-dim) mb-1">
            <Droplets size={12} />
            <span>Vol 24h</span>
          </div>
          <p className="text-sm font-medium text-(--text-primary)">${formatNumber(pair.volume24h)}</p>
        </div>
      </div>
    </Card>
  );
}
