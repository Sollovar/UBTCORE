import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronUp, ChevronDown, Star, Trash2, TrendingUp, Copy } from 'lucide-react';
import type { Pair } from '../../types';
import { useStore } from '../../stores/useStore';
import { formatPrice, formatPercent, formatNumber, formatUSD, calculateQuoteTokenUSDValue } from '../../utils/formatters';
import { useTranslation } from '../../i18n/i18n';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';

export function MobileWatchlist() {
  const navigate = useNavigate();
  const { pairs, watchlist, removeFromWatchlist } = useStore();
  const { t } = useTranslation();
  const { copyToClipboard } = useCopyToClipboard();
  
  const watchlistPairs = useMemo(() => {
    return pairs.filter(p => watchlist.includes(p.id));
  }, [pairs, watchlist]);

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-(--text-primary)">{t('header.nav.watchlist')}</h1>
          <p className="text-xs text-(--text-dim)">{t('watchlist.pairsCount').replace('{{count}}', String(watchlistPairs.length))}</p>
        </div>
      </div>

      {watchlistPairs.length === 0 ? (
        <div className="bg-(--surface) border border-(--border) rounded-xl p-8 text-center">
          <Star size={40} className="mx-auto text-(--text-dim) mb-4" />
          <h2 className="text-base font-semibold text-(--text-primary) mb-2">{t('watchlist.emptyTitle')}</h2>
          <p className="text-sm text-(--text-dim) mb-6">{t('watchlist.emptyDescriptionMobile')}</p>
          <button
            onClick={() => navigate('/trade')}
            className="px-4 py-2.5 bg-[#6366f1] text-white rounded-lg font-medium hover:bg-[#818cf8] transition-colors"
          >
            {t('watchlist.browsePairs')}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {watchlistPairs.map((pair, idx) => {
            const isPos = pair.priceChange24h >= 0;
            
            return (
              <div
                key={pair.id}
                onClick={() => navigate(`/trade/${pair.id}`)}
                className="flex items-center gap-3 p-3 bg-(--surface) border border-(--border) rounded-xl cursor-pointer active:bg-(--surface-elevated) transition-colors"
              >
                <span className="text-xs text-(--text-dim) w-4">{idx + 1}</span>
                
                <div className="flex -space-x-1.5 flex-shrink-0">
                  <img
                    src={pair.baseToken.logo}
                    alt={pair.baseToken.symbol}
                    className="w-8 h-8 rounded-full border border-(--surface) object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                  <img
                    src={pair.quoteToken.logo}
                    alt={pair.quoteToken.symbol}
                    className="w-8 h-8 rounded-full border border-(--surface) object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-(--text-primary)">
                      {pair.baseToken.symbol}
                      <span className="text-(--text-dim) font-normal">/{pair.quoteToken.symbol}</span>
                    </span>
                    {pair.trendingScore >= 95 && <TrendingUp size={11} className="text-[#f59e0b] flex-shrink-0" />}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(pair.baseToken.address, t('common.copied'));
                      }}
                      className="p-1 opacity-60 hover:opacity-100 transition-opacity rounded hover:bg-(--surface-elevated) flex-shrink-0"
                      title={`Copy: ${pair.baseToken.address}`}
                    >
                      <Copy size={12} className="text-(--text-dim)" />
                    </button>
                  </div>
                  <span className="text-[10px] text-(--text-dim)">{pair.dexName}</span>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="flex flex-col">
                    <p className="text-sm font-semibold text-(--text-primary)">
                      {formatPrice(pair.price)}
                    </p>
                    {pair.priceUSD != null && (
                      <p className="text-[10px] text-(--text-dim)">{formatUSD(pair.priceUSD)}</p>
                    )}
                  </div>
                  <span className={`text-xs font-medium ${isPos ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                    {isPos ? '+' : ''}{formatPercent(pair.priceChange24h)}
                  </span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromWatchlist(pair.id);
                  }}
                  className="p-2 rounded-lg text-(--text-dim) hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors flex-shrink-0"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}