import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronUp, ChevronDown, Flame, TrendingUp, Clock, Zap, Star, Copy } from 'lucide-react';
import type { Pair } from '../../types';
import { Sparkline } from '../common/Sparkline';
import { getPairSparkline, tokenColor } from '../../utils/mockData';
import { formatPrice, formatPercent, formatNumber, formatPlainNumber, formatUSD, calculateQuoteTokenUSDValue, deriveStableMarketCapUSD } from '../../utils/formatters';
import { useStore } from '../../stores/useStore';
import { useTranslation } from '../../i18n/i18n';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';

interface DesktopPairsTableProps {
  pairs: Pair[];
  loading?: boolean;
}

type FilterTab = 'all' | 'trending' | 'gainers' | 'losers';
type SortKey = 'rank' | 'price' | 'change' | 'volume' | 'liquidity' | 'score';

function TokenAvatar({ symbol, logo, size = 28 }: { symbol: string; logo?: string; size?: number }) {
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
      style={{ width: size, height: size, background: `linear-gradient(135deg, ${color}cc, ${color}66)`, border: `1.5px solid ${color}44`, fontSize: size * 0.36 }}
    >
      {symbol.slice(0, 2)}
    </div>
  );
}

function SortIndicator({ col, sortKey, dir }: { col: SortKey; sortKey: SortKey; dir: 'asc' | 'desc' }) {
  if (col !== sortKey) return <ChevronUp size={12} className="text-(--text-dim) opacity-0 group-hover:opacity-50 transition-opacity" />;
  return dir === 'asc'
    ? <ChevronUp size={12} className="text-[#6366f1]" />
    : <ChevronDown size={12} className="text-[#6366f1]" />;
}

export function DesktopPairsTable({ pairs, loading = false }: DesktopPairsTableProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterTab>('all');
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const { watchlist, addToWatchlist, removeFromWatchlist } = useStore();
  const { copyToClipboard } = useCopyToClipboard();
  const { t } = useTranslation();

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }, [sortKey]);

  const filtered = useMemo(() => {
    let list = [...pairs];

    // search - supports symbol, name, token address, pool address, pair ID/address
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.baseToken.symbol.toLowerCase().includes(q) ||
        p.quoteToken.symbol.toLowerCase().includes(q) ||
        p.baseToken.name.toLowerCase().includes(q) ||
        p.dexName.toLowerCase().includes(q) ||
        p.baseToken.address?.toLowerCase() === q ||
        p.quoteToken.address?.toLowerCase() === q ||
        p.pairAddress?.toLowerCase() === q ||
        p.id.toLowerCase().includes(q)
      );
    }

    // filter tab
    if (filter === 'gainers') list = list.filter(p => p.priceChange24h > 0);
    if (filter === 'losers')  list = list.filter(p => p.priceChange24h < 0);

    // sort - three-tier ranking: 1) price+volume, 2) price only, 3) no data
    list.sort((a, b) => {
      // Tier categorization
      const aHasPrice = a.price > 0;
      const aHasVolume = a.volume24h > 0;
      const bHasPrice = b.price > 0;
      const bHasVolume = b.volume24h > 0;

      const aTier = (aHasPrice && aHasVolume) ? 1 : aHasPrice ? 2 : 3;
      const bTier = (bHasPrice && bHasVolume) ? 1 : bHasPrice ? 2 : 3;

      // Prioritize by tier: pairs with both data first, then price only, then no data
      if (aTier !== bTier) {
        return aTier - bTier;
      }

      // Within same tier, sort by selected key
      let av = 0, bv = 0;
      if (sortKey === 'rank')      { av = a.trendingScore; bv = b.trendingScore; }
      if (sortKey === 'price')     { av = a.price;         bv = b.price; }
      if (sortKey === 'change')    { av = a.priceChange24h; bv = b.priceChange24h; }
      if (sortKey === 'volume')    { av = a.volume24h;     bv = b.volume24h; }
      if (sortKey === 'liquidity') { av = a.liquidity;     bv = b.liquidity; }
      if (sortKey === 'score')     { av = a.trendingScore; bv = b.trendingScore; }
      return sortDir === 'desc' ? bv - av : av - bv;
    });

    return list;
  }, [pairs, search, filter, sortKey, sortDir]);

  const tabs: { id: FilterTab; label: string; icon: React.ReactNode }[] = [
    { id: 'all',      label: t('pairs.tab.all'),      icon: <Zap size={13} /> },
    { id: 'trending', label: t('pairs.tab.trending'), icon: <Flame size={13} /> },
    { id: 'gainers',  label: t('pairs.tab.gainers'),  icon: <TrendingUp size={13} /> },
    { id: 'losers',   label: t('pairs.tab.losers'),   icon: <Clock size={13} /> },
  ];

  const ColHeader = ({ col, label }: { col: SortKey; label: string }) => (
    <th
      className="group px-4 py-3 text-left text-xs font-semibold text-(--text-dim) uppercase tracking-wide cursor-pointer select-none hover:text-(--text-primary) transition-colors"
      onClick={() => handleSort(col)}
    >
      <div className="flex items-center gap-1">
        {label}
        <SortIndicator col={col} sortKey={sortKey} dir={sortDir} />
      </div>
    </th>
  );

  return (
    <div className="w-full">
      {/* Table header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-1 p-1 bg-(--surface-elevated) rounded-lg border border-(--border)">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filter === t.id
                  ? 'bg-[#6366f1] text-white shadow-sm'
                  : 'text-(--text-dim) hover:text-(--text-primary)'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-dim)" size={15} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('pairs.search.placeholder')}
            className="w-64 bg-(--surface-elevated) border border-(--border) rounded-lg pl-9 pr-4 py-2 text-sm text-(--text-primary) placeholder-(--text-dim) focus:outline-none focus:border-[#6366f1] transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-(--surface) border border-(--border) rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead>
              <tr className="border-b border-(--border) bg-(--surface-elevated)/50">
                <th className="px-2 py-3 text-left text-xs font-semibold text-(--text-dim) uppercase tracking-wide w-10"></th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-(--text-dim) uppercase tracking-wide w-12">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-(--text-dim) uppercase tracking-wide">Pair</th>
                <ColHeader col="price"     label={t('pairs.col.price')} />
                <ColHeader col="change"    label={t('pairs.col.change')} />
                <ColHeader col="volume"    label={t('pairs.col.volume')} />
                <ColHeader col="liquidity" label={t('pairs.col.liquidity')} />
                <th className="px-4 py-3 text-left text-xs font-semibold text-(--text-dim) uppercase tracking-wide">Market Cap</th>
                <ColHeader col="score"     label={t('pairs.col.score')} />
                <th className="px-4 py-3 text-left text-xs font-semibold text-(--text-dim) uppercase tracking-wide">{t('pairs.col.chart')}</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-(--border)/50 animate-pulse">
                      <td className="px-4 py-4"><div className="h-3 w-6 bg-(--surface-elevated) rounded" /></td>
                      <td className="px-4 py-4"><div className="h-4 w-32 bg-(--surface-elevated) rounded" /></td>
                      <td className="px-4 py-4"><div className="h-3 w-20 bg-(--surface-elevated) rounded" /></td>
                      <td className="px-4 py-4"><div className="h-3 w-14 bg-(--surface-elevated) rounded" /></td>
                      <td className="px-4 py-4"><div className="h-3 w-24 bg-(--surface-elevated) rounded" /></td>
                      <td className="px-4 py-4"><div className="h-3 w-20 bg-(--surface-elevated) rounded" /></td>
                      <td className="px-4 py-4"><div className="h-3 w-16 bg-(--surface-elevated) rounded" /></td>
                      <td className="px-4 py-4"><div className="h-3 w-10 bg-(--surface-elevated) rounded" /></td>
                      <td className="px-4 py-4"><div className="h-8 w-20 bg-(--surface-elevated) rounded" /></td>
                    </tr>
                  ))
                : filtered.map((pair, idx) => {
                    const isPos = pair.priceChange24h >= 0;
                    const sparkline = getPairSparkline(pair);
                    const shouldShowSparkline = Array.isArray(sparkline) && sparkline.length >= 2;

                    return (
                      <tr
                        key={pair.id}
                        onClick={() => navigate(`/trade/${pair.id}`)}
                        className="border-b border-(--border)/50 cursor-pointer transition-colors hover:bg-(--surface-elevated) group"
                      >
                        {/* Watchlist */}
                        <td className="px-2 py-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (watchlist.includes(pair.id)) {
                                removeFromWatchlist(pair.id);
                              } else {
                                addToWatchlist(pair.id);
                              }
                            }}
                            className="p-1.5 rounded-lg transition-colors"
                          >
                            <Star
                              size={16}
                              className={watchlist.includes(pair.id) ? 'text-yellow-500 fill-yellow-500' : 'text-(--text-dim) group-hover:text-(--text-primary)'}
                            />
                          </button>
                        </td>

                        {/* Rank */}
                        <td className="px-4 py-4 text-sm text-(--text-dim) font-medium">{idx + 1}</td>

                        {/* Pair */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex -space-x-2">
                              <TokenAvatar symbol={pair.baseToken.symbol} logo={pair.baseToken.logo} size={28} />
                              <TokenAvatar symbol={pair.quoteToken.symbol} logo={pair.quoteToken.logo} size={22} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-(--text-primary) text-sm group-hover:text-[#6366f1] transition-colors">
                                  {pair.baseToken.symbol}
                                  <span className="text-(--text-dim) font-normal">/{pair.quoteToken.symbol}</span>
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyToClipboard(pair.baseToken.address, 'Base token address copied');
                                  }}
                                  className="p-1 opacity-0 group-hover:opacity-100 transition-opacity rounded hover:bg-(--surface-elevated)"
                                  title={`Copy base token address: ${pair.baseToken.address}`}
                                >
                                  <Copy size={14} className="text-(--text-dim) hover:text-(--text-primary)" />
                                </button>
                              </div>
                              <span className="text-[11px] text-(--text-dim) bg-(--surface-elevated) group-hover:bg-(--surface-hover) transition-colors px-1.5 py-0.5 rounded mt-0.5 inline-block">
                                {pair.dexName}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Price */}
                        <td className="px-4 py-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-(--text-primary) text-sm">
                              {formatPrice(pair.price)}
                            </span>
                            {pair.priceUSD != null && (
                              <span className="text-xs text-(--text-dim)">
                                {formatUSD(pair.priceUSD)}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 24h % */}
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-1 font-semibold text-sm ${isPos ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                            {isPos ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            {formatPercent(pair.priceChange24h)}
                          </span>
                        </td>

                        {/* Volume */}
                        <td className="px-4 py-4 text-sm">
                          <div className="flex flex-col">
                            <span className="text-(--text-primary)">
                              {formatPlainNumber(pair.volume24h)}
                            </span>
                            {(() => {
                              const volume24hUSD = pair.volume24hUSD != null
                                ? pair.volume24hUSD
                                : calculateQuoteTokenUSDValue(pair.volume24h, pair.price, pair.priceUSD);
                              return volume24hUSD != null ? (
                                <span className="text-xs text-(--text-dim)">
                                  {formatUSD(volume24hUSD)}
                                </span>
                              ) : null;
                            })()}
                          </div>
                        </td>

                        {/* Liquidity */}
                        <td className="px-4 py-4 text-sm">
                          <div className="flex flex-col">
                            <span className="text-(--text-secondary)">
                              {formatPlainNumber(pair.liquidity)}
                            </span>
                            {(() => {
                              const liquidityUSD = pair.liquidityUSD != null
                                ? pair.liquidityUSD
                                : calculateQuoteTokenUSDValue(pair.liquidity, pair.price, pair.priceUSD);
                              return liquidityUSD != null ? (
                                <span className="text-xs text-(--text-dim)">
                                  {formatUSD(liquidityUSD)}
                                </span>
                              ) : null;
                            })()}
                          </div>
                        </td>

                        {/* Market Cap */}
                        <td className="px-4 py-4 text-sm">
                          <div className="flex flex-col gap-1">
                            <span className="text-(--text-primary)">{(() => {
                              const marketCapValue = pair.marketCap != null && pair.marketCap > 0
                                ? pair.marketCap
                                : pair.marketCapUSD != null && pair.marketCapUSD > 0
                                  ? pair.marketCapUSD
                                  : undefined;
                              return marketCapValue != null ? formatPlainNumber(marketCapValue) : '—';
                            })()}</span>
                            {(() => {
                              const marketCapUSDValue = pair.marketCapUSD != null && pair.marketCapUSD > 0
                                ? pair.marketCapUSD
                                : deriveStableMarketCapUSD(pair.marketCap, pair.baseToken.symbol, pair.quoteToken.symbol);
                              return marketCapUSDValue != null ? (
                                <span className="text-xs text-(--text-dim)">{formatUSD(marketCapUSDValue)}</span>
                              ) : null;
                            })()}
                          </div>
                        </td>

                        {/* Score */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-(--surface-elevated) rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-[#6366f1] to-[#22d3ee] transition-all"
                                style={{ width: `${pair.trendingScore}%` }}
                              />
                            </div>
                          <span className="text-sm font-semibold text-(--text-primary)">{pair.trendingScore.toFixed(2)}</span>
                          </div>
                        </td>

                        {/* Sparkline */}
                        <td className="px-4 py-4">
                          {shouldShowSparkline ? (
                            <Sparkline data={sparkline} positive={isPos} width={88} height={32} />
                          ) : (
                            <div className="w-[88px] h-[32px] flex items-center justify-center text-xs text-(--text-dim)">No chart</div>
                          )}
                        </td>
                      </tr>
                    );
                  })}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-(--text-dim)">
                    No pairs match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
