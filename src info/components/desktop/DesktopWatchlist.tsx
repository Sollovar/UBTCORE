import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronUp, ChevronDown, Star, Trash2, Copy } from 'lucide-react';
import type { Pair } from '../../types';
import { useStore } from '../../stores/useStore';
import { Sparkline } from '../common/Sparkline';
import { getPairSparkline, tokenColor } from '../../utils/mockData';
import { formatPrice, formatPercent, formatNumber, formatPlainNumber, formatUSD, calculateQuoteTokenUSDValue, deriveStableMarketCapUSD } from '../../utils/formatters';
import { useTranslation } from '../../i18n/i18n';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';

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

export function DesktopWatchlist() {
  const navigate = useNavigate();
  const { pairs, watchlist, removeFromWatchlist } = useStore();
  const { t } = useTranslation();
  const { copyToClipboard } = useCopyToClipboard();
  
  const watchlistPairs = useMemo(() => {
    return pairs.filter(p => watchlist.includes(p.id));
  }, [pairs, watchlist]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-(--text-primary) mb-1">{t('header.nav.watchlist')}</h1>
          <p className="text-(--text-dim)">{t('watchlist.pairsCount').replace('{{count}}', String(watchlistPairs.length))}</p>
        </div>
      </div>

      {watchlistPairs.length === 0 ? (
        <div className="bg-(--surface) border border-(--border) rounded-xl p-12 text-center">
          <Star size={48} className="mx-auto text-(--text-dim) mb-4" />
          <h2 className="text-lg font-semibold text-(--text-primary) mb-2">{t('watchlist.emptyTitle')}</h2>
          <p className="text-(--text-dim) mb-6">{t('watchlist.emptyDescription')}</p>
          <button
            onClick={() => navigate('/trade')}
            className="px-4 py-2 bg-[#6366f1] text-white rounded-lg font-medium hover:bg-[#818cf8] transition-colors"
          >
            {t('watchlist.browsePairs')}
          </button>
        </div>
      ) : (
        <div className="bg-(--surface) border border-(--border) rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-(--border) bg-(--surface-elevated)/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-(--text-dim) uppercase tracking-wide w-8"></th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-(--text-dim) uppercase tracking-wide">{t('watchlist.col.pair')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-(--text-dim) uppercase tracking-wide">{t('pairs.col.price')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-(--text-dim) uppercase tracking-wide">{t('pairs.col.change')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-(--text-dim) uppercase tracking-wide">{t('pairs.col.volume')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-(--text-dim) uppercase tracking-wide">Market Cap</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-(--text-dim) uppercase tracking-wide hidden lg:table-cell">{t('pairs.col.liquidity')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-(--text-dim) uppercase tracking-wide hidden xl:table-cell">{t('pairs.col.chart')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-(--text-dim) uppercase tracking-wide w-10"></th>
                </tr>
              </thead>
              <tbody>
                {watchlistPairs.map((pair, idx) => {
                  const isPos = pair.priceChange24h >= 0;
                  const sparkline = getPairSparkline(pair);
                  const shouldShowSparkline = pair.lastTradeAt && (new Date().getTime() - new Date(pair.lastTradeAt).getTime()) <= (7 * 24 * 60 * 60 * 1000);
                  
                  return (
                    <tr
                      key={pair.id}
                      onClick={() => navigate(`/trade/${pair.id}`)}
                      className="border-b border-(--border)/50 cursor-pointer transition-colors hover:bg-(--surface-elevated)"
                    >
                      <td className="px-4 py-4 text-sm text-(--text-dim) font-medium">{idx + 1}</td>
                      
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex -space-x-2">
                              <TokenAvatar symbol={pair.baseToken.symbol} logo={pair.baseToken.logo} size={28} />
                              <TokenAvatar symbol={pair.quoteToken.symbol} logo={pair.quoteToken.logo} size={22} />
                            </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-(--text-primary) text-sm">
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
                            <span className="text-[11px] text-(--text-dim)">{pair.dexName}</span>
                          </div>
                        </div>
                      </td>

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

                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1 font-semibold text-sm ${isPos ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                          {isPos ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          {formatPercent(pair.priceChange24h)}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-sm">
                        <div className="flex flex-col">
                          <span className="text-(--text-primary)">
                            {formatNumber(pair.volume24h)}
                          </span>
                          {(() => {
                            const volume24hUSD = pair.volume24hUSD != null
                              ? pair.volume24hUSD
                              : calculateQuoteTokenUSDValue(pair.volume24h, pair.price, pair.priceUSD);
                            return volume24hUSD != null ? (
                              <span className="text-xs text-(--text-dim)">{formatUSD(volume24hUSD)}</span>
                            ) : null;
                          })()}
                        </div>
                      </td>

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

                      <td className="px-4 py-4 text-sm hidden lg:table-cell">
                        <div className="flex flex-col">
                          <span className="text-(--text-secondary)">
                            {formatNumber(pair.liquidity)}
                          </span>
                          {(() => {
                            const liquidityUSD = pair.liquidityUSD != null
                              ? pair.liquidityUSD
                              : calculateQuoteTokenUSDValue(pair.liquidity, pair.price, pair.priceUSD);
                            return liquidityUSD != null ? (
                              <span className="text-xs text-(--text-dim)">{formatUSD(liquidityUSD)}</span>
                            ) : null;
                          })()}
                        </div>
                      </td>

                      <td className="px-4 py-4 hidden xl:table-cell">
                        {shouldShowSparkline ? (
                          <Sparkline data={sparkline} positive={isPos} width={80} height={28} />
                        ) : (
                          <div className="w-[80px] h-[28px] flex items-center justify-center text-xs text-(--text-dim)">{t('watchlist.noChart')}</div>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromWatchlist(pair.id);
                          }}
                          className="p-2 rounded-lg text-(--text-dim) hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}