import React, { useEffect, useState } from 'react';
import { ArrowRight, Zap, TrendingUp, Shield, Globe } from 'lucide-react';
import { Button } from '../common/Button';
import { getTrendingPairs } from '../../services/pairs';
import { formatUSD, formatPercent } from '../../utils/formatters';
import { tokenColor } from '../../utils/mockData';
import type { Pair } from '../../types';
import { useTranslation } from '../../i18n/i18n';
import { useConnectedNetwork } from '../../hooks/useConnectedNetwork';

interface MobileHeroProps {
  onLaunchApp?: () => void;
}

export function MobileHero({ onLaunchApp }: MobileHeroProps) {
  const [trendingPairs, setTrendingPairs] = useState<Pair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();
  const connectedNetwork = useConnectedNetwork();

  useEffect(() => {
    let cancelled = false;

    async function loadTrendingPairs() {
      try {
        const data = await getTrendingPairs(connectedNetwork);
        if (!cancelled) {
          setTrendingPairs(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load trending pairs');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTrendingPairs();
    return () => {
      cancelled = true;
    };
  }, [connectedNetwork]);

  return (
    <section className="relative overflow-hidden py-12">
      <div className="absolute inset-0 bg-gradient-to-br from-[#6366f1]/10 via-transparent to-[#22d3ee]/10" />

      <div className="relative px-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-(--surface-elevated) border border-(--border) mb-4">
          <Zap size={12} className="text-(--accent)" />
          <span className="text-xs text-(--text-secondary)">{t('hero.badge')}</span>
        </div>

        <h1 className="text-3xl font-bold text-(--text-primary) mb-3 leading-tight">
          {t('hero.title.line1')}
          <span className="block gradient-text">{t('hero.title.line2')}</span>
        </h1>

        <p className="text-base text-(--text-secondary) mb-6">
          {t('hero.subtitle')}
        </p>

        <Button className="w-full justify-center mb-6" onClick={onLaunchApp}>
          {t('hero.launchApp')}
          <ArrowRight size={18} className="ml-2" />
        </Button>

        {/* Mobile trending pairs marquee */}
        <div className="mb-6">
          {loading ? (
            <div className="bg-(--surface) border border-(--border) rounded-xl p-4 text-center">
              <div className="text-sm text-(--text-dim)">{t('hero.loading')}</div>
            </div>
          ) : error ? (
            <div className="bg-(--surface) border border-(--border) rounded-xl p-4 text-center">
              <div className="text-sm text-(--text-dim)">{t('hero.error')}</div>
            </div>
          ) : trendingPairs.length === 0 ? (
            <div className="bg-(--surface) border border-(--border) rounded-xl p-4 text-center">
              <div className="text-sm text-(--text-dim)">{t('hero.noPairs')}</div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl" style={{ maskImage: 'linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)' }}>
              <div className="marquee-track-mobile">
                {[...trendingPairs, ...trendingPairs].map((pair, i) => {
                  const symbol = `${pair.baseToken.symbol}/${pair.quoteToken.symbol}`;
                  const change = pair.priceChange24h || 0;
                  const positive = change >= 0;
                  const color = tokenColor(pair.baseToken.symbol);

                  return (
                    <div
                      key={`${pair.id}-${i}`}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-(--surface) border border-(--border) flex-shrink-0 mx-1"
                      style={{ minWidth: 140 }}
                    >
                      <div className="relative w-8 h-8 shrink-0">
                        <div
                          className="absolute left-0 top-0 w-6 h-6 rounded-full overflow-hidden border border-white/10 bg-slate-900/80"
                          style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.04)' }}
                        >
                          {pair.baseToken.logo ? (
                            <img src={pair.baseToken.logo} alt={pair.baseToken.symbol} className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex items-center justify-center w-full h-full text-[8px] font-bold uppercase text-white" style={{ background: `linear-gradient(135deg, ${color}cc, ${color}55)` }}>
                              {pair.baseToken.symbol.slice(0, 2)}
                            </div>
                          )}
                        </div>
                        <div
                          className="absolute right-0 bottom-0 w-6 h-6 rounded-full overflow-hidden border border-white/10 bg-slate-900/80"
                          style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.04)' }}
                        >
                          {pair.quoteToken.logo ? (
                            <img src={pair.quoteToken.logo} alt={pair.quoteToken.symbol} className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex items-center justify-center w-full h-full text-[8px] font-bold uppercase text-white" style={{ background: `linear-gradient(135deg, ${color}cc, ${color}55)` }}>
                              {pair.quoteToken.symbol.slice(0, 2)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-(--text-primary) truncate">{symbol}</div>
                        <div className="text-[10px] text-(--text-dim)">{formatUSD(pair.volume24hUSD ?? pair.volume24h)} vol</div>
                      </div>
                      <span className="text-xs font-bold shrink-0" style={{ color: positive ? '#10b981' : '#ef4444' }}>
                        {formatPercent(change)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-(--surface) border border-(--border) rounded-xl p-3 text-center">
            <TrendingUp size={20} className="text-(--accent) mx-auto mb-2" />
            <p className="text-lg font-bold text-(--text-primary)">50+</p>
            <p className="text-[10px] text-(--text-dim)">Pairs</p>
          </div>
          <div className="bg-(--surface) border border-(--border) rounded-xl p-3 text-center">
            <Shield size={20} className="text-(--success) mx-auto mb-2" />
            <p className="text-lg font-bold text-(--text-primary)">$0</p>
            <p className="text-[10px] text-(--text-dim)">Fees</p>
          </div>
          <div className="bg-(--surface) border border-(--border) rounded-xl p-3 text-center">
            <Globe size={20} className="text-(--primary) mx-auto mb-2" />
            <p className="text-lg font-bold text-(--text-primary)">24/7</p>
            <p className="text-[10px] text-(--text-dim)">Trading</p>
          </div>
        </div>

        <div className="mt-6">
          <h2 className="text-lg font-bold text-(--text-primary) mb-4">Why Unbound?</h2>
          <div className="space-y-3">
            <div className="bg-(--surface) border border-(--border) rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Zap size={14} className="text-(--primary)" />
                <span className="text-sm font-medium text-(--text-primary)">Early Access</span>
              </div>
              <p className="text-xs text-(--text-dim)">Trade trending tokens before CEX listing</p>
            </div>
            <div className="bg-(--surface) border border-(--border) rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={14} className="text-(--accent)" />
                <span className="text-sm font-medium text-(--text-primary)">Orderbook</span>
              </div>
              <p className="text-xs text-(--text-dim)">Decentralized orderbook for better prices</p>
            </div>
            <div className="bg-(--surface) border border-(--border) rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Globe size={14} className="text-(--success)" />
                <span className="text-sm font-medium text-(--text-primary)">Multi-DEX</span>
              </div>
              <p className="text-xs text-(--text-dim)">Aggregated liquidity from top DEXes</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
