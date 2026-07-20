import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronUp, ChevronDown, Flame, Star, Copy } from 'lucide-react';
import type { Pair } from '../../types';
import { Sparkline } from '../common/Sparkline';
import { getPairSparkline, tokenColor } from '../../utils/mockData';
import { formatPrice, formatPercent, formatNumber, formatUSD, formatPlainNumber, calculateQuoteTokenUSDValue, deriveStableMarketCapUSD } from '../../utils/formatters';
import { useStore } from '../../stores/useStore';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';
import { useTranslation } from '../../i18n/i18n';

interface MobilePairsTableProps {
  pairs: Pair[];
  loading?: boolean;
}

type FilterTab = 'all' | 'trending' | 'gainers' | 'losers';

function TokenAvatar({ symbol, logo, size = 24 }: { symbol: string; logo?: string; size?: number }) {
  const [hasError, setHasError] = useState(false);
  const color = tokenColor(symbol);
  const hasLogo = Boolean(logo) && !hasError;

  if (hasLogo) {
    return (
      <img
        src={logo}
        alt={symbol}
        className="rounded-full flex-shrink-0 object-cover"
        style={{ width: size, height: size, border: `1.5px solid ${color}44` }}
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
      style={{ width: size, height: size, background: `linear-gradient(135deg, ${color}cc, ${color}55)`, border: `1.5px solid ${color}44`, fontSize: size * 0.36 }}
    >
      {symbol.slice(0, 2)}
    </div>
  );
}

export function MobilePairsTable({ pairs, loading = false }: MobilePairsTableProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterTab>('all');
  const { watchlist, addToWatchlist, removeFromWatchlist } = useStore();
  const { copyToClipboard } = useCopyToClipboard();
  const { t } = useTranslation();

  const filtered = useMemo(() => {
    let list = [...pairs];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.baseToken.symbol.toLowerCase().includes(q) ||
        p.quoteToken.symbol.toLowerCase().includes(q) ||
        p.baseToken.name.toLowerCase().includes(q) ||
        p.baseToken.address?.toLowerCase() === q ||
        p.quoteToken.address?.toLowerCase() === q ||
        p.pairAddress?.toLowerCase() === q ||
        p.id.toLowerCase().includes(q)
      );
    }

    // Professional sorting: three-tier ranking - 1) price+volume, 2) price only, 3) no data
    const sortByDataComplete = (a: Pair, b: Pair) => {
      const aHasPrice = a.price > 0;
      const aHasVolume = a.volume24h > 0;
      const bHasPrice = b.price > 0;
      const bHasVolume = b.volume24h > 0;

      const aTier = (aHasPrice && aHasVolume) ? 1 : aHasPrice ? 2 : 3;
      const bTier = (bHasPrice && bHasVolume) ? 1 : bHasPrice ? 2 : 3;

      if (aTier !== bTier) {
        return aTier - bTier;
      }
      return 0;
    };

    if (filter === 'all') {
      list.sort((a, b) => {
        const dataComp = sortByDataComplete(a, b);
        return dataComp !== 0 ? dataComp : b.trendingScore - a.trendingScore;
      });
    }
    if (filter === 'trending') {
      list.sort((a, b) => {
        const dataComp = sortByDataComplete(a, b);
        return dataComp !== 0 ? dataComp : b.trendingScore - a.trendingScore;
      });
    }
    if (filter === 'gainers') {
      list = list.filter(p => p.priceChange24h > 0).sort((a, b) => {
        const dataComp = sortByDataComplete(a, b);
        return dataComp !== 0 ? dataComp : b.priceChange24h - a.priceChange24h;
      });
    }
    if (filter === 'losers') {
      list = list.filter(p => p.priceChange24h < 0).sort((a, b) => {
        const dataComp = sortByDataComplete(a, b);
        return dataComp !== 0 ? dataComp : a.priceChange24h - b.priceChange24h;
      });
    }
    return list;
  }, [pairs, search, filter]);

  const tabs: { id: FilterTab; label: string }[] = [
    { id: 'all', label: t('pairs.filter.all') },
    { id: 'trending', label: t('pairs.filter.hot') },
    { id: 'gainers', label: t('pairs.filter.gainers') },
    { id: 'losers', label: t('pairs.filter.losers') },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Search */}
      <div className="px-4 pt-4 pb-3 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-dim)" size={15} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('pairs.searchPlaceholder')}
            className="w-full bg-(--surface-elevated) border border-(--border) rounded-xl pl-9 pr-4 py-2.5 text-sm text-(--text-primary) placeholder-(--text-dim) focus:outline-none focus:border-[#6366f1] transition-colors"
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide flex-shrink-0">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === t.id
                ? 'bg-[#6366f1] text-white'
                : 'bg-(--surface-elevated) text-(--text-dim) border border-(--border)'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Horizontally scrollable pairs container */}
      <div className="flex-1 min-w-0 overflow-x-auto overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="min-w-[500px]">
          {/* Column headers */}
          <div className="flex items-center px-4 py-2 border-y border-(--border) bg-(--surface-elevated)/60 sticky top-0">
            <span className="w-8 text-[10px] font-semibold text-(--text-dim) uppercase tracking-wide flex-shrink-0"></span>
            <span className="flex-1 text-[10px] font-semibold text-(--text-dim) uppercase tracking-wide min-w-[140px]">{t('pairs.header.pair')}</span>
            <span className="w-24 text-[10px] font-semibold text-(--text-dim) uppercase tracking-wide text-right flex-shrink-0">{t('pairs.header.price')}</span>
            <span className="w-20 text-[10px] font-semibold text-(--text-dim) uppercase tracking-wide text-right flex-shrink-0">{t('pairs.header.change')}</span>
            <span className="w-24 text-[10px] font-semibold text-(--text-dim) uppercase tracking-wide text-right flex-shrink-0">{t('pairs.header.volume')}</span>
            <span className="w-28 text-[10px] font-semibold text-(--text-dim) uppercase tracking-wide text-right flex-shrink-0">{t('pairs.header.marketCap')}</span>
            <span className="w-24 text-[10px] font-semibold text-(--text-dim) uppercase tracking-wide text-right flex-shrink-0">{t('pairs.header.chart')}</span>
          </div>

          {/* List */}
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center px-4 py-4 border-b border-(--border)/50 animate-pulse gap-3">
                  <div className="w-6 h-6 rounded-full bg-(--surface-elevated) flex-shrink-0" />
                  <div className="flex-1">
                    <div className="h-3 w-24 bg-(--surface-elevated) rounded mb-2" />
                    <div className="h-2.5 w-16 bg-(--surface-elevated) rounded" />
                  </div>
                  <div className="h-3 w-20 bg-(--surface-elevated) rounded" />
                </div>
              ))
            : filtered.map((pair, idx) => {
                const isPos = pair.priceChange24h >= 0;
                const sparkline = getPairSparkline(pair);
                const shouldShowSparkline = Array.isArray(sparkline) && sparkline.length >= 2;
                return (
                  <div
                    key={pair.id}
                    onClick={() => navigate(`/trade/${pair.id}`)}
                    className="flex items-center px-4 py-3.5 border-b border-(--border)/50 cursor-pointer active:bg-(--surface-elevated) transition-colors"
                  >
                    {/* Watchlist star */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (watchlist.includes(pair.id)) {
                          removeFromWatchlist(pair.id);
                        } else {
                          addToWatchlist(pair.id);
                        }
                      }}
                      className="w-8 flex items-center justify-center p-1 rounded-lg transition-colors flex-shrink-0"
                    >
                      <Star
                        size={14}
                        className={watchlist.includes(pair.id) ? 'text-yellow-500 fill-yellow-500' : 'text-(--text-dim)'}
                      />
                    </button>
                    
                    {/* Icons + Pair name */}
                    <div className="flex items-center gap-2.5 flex-1 min-w-[140px]">
                      <div className="flex -space-x-1.5 flex-shrink-0">
                        <TokenAvatar symbol={pair.baseToken.symbol} logo={pair.baseToken.logo} size={24} />
                        <TokenAvatar symbol={pair.quoteToken.symbol} logo={pair.quoteToken.logo} size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-(--text-primary)">
                            {pair.baseToken.symbol}
                            <span className="text-(--text-dim) font-normal">/{pair.quoteToken.symbol}</span>
                          </span>
                          {pair.trendingScore >= 95 && <Flame size={11} className="text-[#f59e0b] flex-shrink-0" />}
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
                        <span className="text-[11px] text-(--text-dim)">{pair.dexName}</span>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="w-24 text-right flex-shrink-0">
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-semibold text-(--text-primary)">{formatPrice(pair.price)}</span>
                        {pair.priceUSD != null && (
                          <span className="text-[11px] text-(--text-dim)">{formatUSD(pair.priceUSD)}</span>
                        )}
                      </div>
                    </div>

                    {/* Change */}
                    <div className="w-20 text-right flex-shrink-0">
                      <span className={`text-xs font-semibold flex items-center justify-end gap-0.5 ${isPos ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                        {isPos ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                        {Math.abs(pair.priceChange24h).toFixed(1)}%
                      </span>
                    </div>

                    {/* Volume */}
                    <div className="w-24 text-right flex-shrink-0">
                      <div className="flex flex-col items-end">
                        <span className="text-xs text-(--text-primary)">{formatNumber(pair.volume24h)}</span>
                        {(() => {
                          const volume24hUSD = pair.volume24hUSD != null
                            ? pair.volume24hUSD
                            : calculateQuoteTokenUSDValue(pair.volume24h, pair.price, pair.priceUSD);
                          return volume24hUSD != null ? (
                            <span className="text-[11px] text-(--text-dim)">{formatUSD(volume24hUSD)}</span>
                          ) : null;
                        })()}
                      </div>
                    </div>

                    {/* Market Cap */}
                    <div className="w-28 text-right flex-shrink-0">
                      {(() => {
                        const marketCapValue = pair.marketCap != null && pair.marketCap > 0
                          ? pair.marketCap
                          : pair.marketCapUSD != null && pair.marketCapUSD > 0
                            ? pair.marketCapUSD
                            : undefined;
                        const marketCapUSDValue = pair.marketCapUSD != null && pair.marketCapUSD > 0
                          ? pair.marketCapUSD
                          : deriveStableMarketCapUSD(pair.marketCap, pair.baseToken.symbol, pair.quoteToken.symbol);

                        return (
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="text-xs text-(--text-primary)">{marketCapValue != null ? formatPlainNumber(marketCapValue) : '—'}</span>
                            {marketCapUSDValue != null ? (
                              <span className="text-[10px] text-(--text-dim)">{formatUSD(marketCapUSDValue)}</span>
                            ) : null}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Sparkline */}
                    <div className="w-24 flex justify-end flex-shrink-0">
                      {shouldShowSparkline ? (
                        <Sparkline data={sparkline} positive={isPos} width={60} height={24} />
                      ) : (
                        <div className="w-[60px] h-[24px] flex items-center justify-center text-xs text-(--text-dim)">-</div>
                      )}
                    </div>
                  </div>
                );
              })}

          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-(--text-dim)">
              <Search size={32} className="mb-3 opacity-40" />
              <p className="text-sm">{t('pairs.noResults')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}