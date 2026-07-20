import React, { useEffect, useState } from 'react';
import { ArrowRight, TrendingUp, Zap, Shield, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getTrendingPairs } from '../../services/pairs';
import { formatUSD, formatPercent } from '../../utils/formatters';
import { tokenColor } from '../../utils/mockData';
import type { Pair } from '../../types';
import { useTranslation } from '../../i18n/i18n';
import { useConnectedNetwork } from '../../hooks/useConnectedNetwork';

const TRUST_STATS = [
  { icon: TrendingUp, value: '$2.4B+',  labelKey: 'hero.trust.totalVolume',     color: '#22d3ee' },
  { icon: Zap,        value: '50+',     labelKey: 'hero.trust.trendingPairs',   color: '#6366f1' },
  { icon: Shield,     value: '100K+',   labelKey: 'hero.trust.tradesExecuted',  color: '#10b981' },
  { icon: Clock,      value: '<1s',     labelKey: 'hero.trust.execSpeed',       color: '#f59e0b' },
];

export function HeroSection() {
  const navigate = useNavigate();
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
    <section className="relative min-h-[calc(100vh-64px)] flex flex-col items-center justify-center overflow-hidden py-16">
      {/* Aurora orb background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div
          className="absolute rounded-full anim-orb"
          style={{ top: '-18%', left: '-10%', width: 720, height: 720, background: '#6366f1', filter: 'blur(150px)' }}
        />
        <div
          className="absolute rounded-full anim-orb"
          style={{ bottom: '-22%', right: '-12%', width: 620, height: 620, background: '#22d3ee', filter: 'blur(140px)', animationDelay: '2.5s' }}
        />
        <div
          className="absolute rounded-full anim-orb"
          style={{ top: '38%', right: '8%', width: 360, height: 360, background: '#8b5cf6', filter: 'blur(100px)', animationDelay: '5s' }}
        />
      </div>

      {/* Dot-grid overlay */}
      <div className="absolute inset-0 dot-grid pointer-events-none" aria-hidden="true" />

      {/* Main content */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">

        {/* Live badge */}
        <div
          className="anim-fade-up inline-flex items-center gap-2.5 px-4 py-2 rounded-full glass-card mb-8 cursor-default"
          style={{ animationDelay: '0ms' }}
        >
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span
              className="absolute inline-flex h-full w-full rounded-full opacity-60"
              style={{ background: '#22d3ee', animation: 'ping-dot 1.5s cubic-bezier(0,0,0.2,1) infinite' }}
            />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: '#22d3ee' }} />
          </span>
          <span className="text-sm font-medium text-(--text-secondary)">
            {t('hero.badge')}
          </span>
        </div>

        {/* Headline */}
        <h1
          className="anim-fade-up text-5xl sm:text-6xl lg:text-[5.25rem] xl:text-[6rem] font-bold text-(--text-primary) leading-[1.06] tracking-tight mb-6"
          style={{ animationDelay: '100ms' }}
        >
          {t('hero.title')}
        </h1>

        {/* Subheading */}
        <p
          className="anim-fade-up max-w-2xl mx-auto text-lg sm:text-xl text-(--text-secondary) leading-relaxed mb-10"
          style={{ animationDelay: '180ms' }}
        >
          {t('hero.subtitle')}
        </p>

        {/* CTA buttons */}
        <div
          className="anim-fade-up flex flex-col sm:flex-row items-center justify-center gap-4 mb-14"
          style={{ animationDelay: '260ms' }}
        >
          <button className="btn-cta-primary group" onClick={() => navigate('/trade')}>
            {t('hero.cta.startTrading')}
            <ArrowRight size={20} className="transition-transform duration-200 group-hover:translate-x-1" />
          </button>
          <button className="btn-cta-secondary" onClick={() => navigate('/trade')}>
            {t('hero.cta.viewPairs')}
          </button>
        </div>

        {/* Marquee pair cards */}
        <div
          className="anim-fade-up w-full overflow-hidden mb-14"
          style={{ animationDelay: '340ms', maskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)' }}
        >
          {loading ? (
            <div className="glass-card rounded-3xl p-6 text-center text-sm text-(--text-secondary)">
              {t('hero.trending.loading')}
            </div>
          ) : error ? (
            <div className="glass-card rounded-3xl p-6 text-center text-sm text-(--text-secondary)">
              {t('hero.trending.error')}
            </div>
          ) : trendingPairs.length === 0 ? (
            <div className="glass-card rounded-3xl p-6 text-center text-sm text-(--text-secondary)">
              {t('hero.trending.empty')}
            </div>
          ) : (
            <div className="marquee-track">
              {[...trendingPairs, ...trendingPairs].map((pair, i) => {
                const symbol = `${pair.baseToken.symbol}/${pair.quoteToken.symbol}`;
                const change = pair.priceChange24h || 0;
                const positive = change >= 0;
                const color = tokenColor(pair.baseToken.symbol);

                return (
                  <div
                    key={`${pair.id}-${i}`}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl glass-card flex-shrink-0 transition-all duration-200 hover:border-[#6366f1]/50"
                    style={{ minWidth: 190 }}
                  >
                    <div className="relative w-12 h-12 shrink-0">
                      <div
                        className="absolute left-0 top-0 w-9 h-9 rounded-full overflow-hidden border border-white/10 bg-slate-900/80"
                        style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.04)' }}
                      >
                        {pair.baseToken.logo ? (
                          <img src={pair.baseToken.logo} alt={pair.baseToken.symbol} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full text-[10px] font-bold uppercase text-white" style={{ background: `linear-gradient(135deg, ${color}cc, ${color}55)` }}>
                            {pair.baseToken.symbol.slice(0, 2)}
                          </div>
                        )}
                      </div>
                      <div
                        className="absolute right-0 bottom-0 w-9 h-9 rounded-full overflow-hidden border border-white/10 bg-slate-900/80"
                        style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.04)' }}
                      >
                        {pair.quoteToken.logo ? (
                          <img src={pair.quoteToken.logo} alt={pair.quoteToken.symbol} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full text-[10px] font-bold uppercase text-white" style={{ background: `linear-gradient(135deg, ${color}cc, ${color}55)` }}>
                            {pair.quoteToken.symbol.slice(0, 2)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="text-sm font-semibold text-(--text-primary) truncate">{symbol}</div>
                      <div className="text-xs text-(--text-dim)">{formatUSD(pair.volume24hUSD ?? pair.volume24h)} vol</div>
                    </div>
                    <span className="text-sm font-bold shrink-0" style={{ color: positive ? '#10b981' : '#ef4444' }}>
                      {formatPercent(change)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Trust stats strip */}
        <div
          className="anim-fade-up grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-3xl mx-auto"
          style={{ animationDelay: '420ms' }}
        >
          {TRUST_STATS.map(({ icon: Icon, value, labelKey, color }) => (
            <div key={labelKey} className="glass-card rounded-xl p-4 sm:p-5 text-center hover-lift cursor-default">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: `${color}18` }}>
                <Icon size={20} style={{ color }} />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-(--text-primary)">{value}</div>
              <div className="text-xs text-(--text-dim) mt-1">{t(labelKey)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, transparent, var(--background))' }}
        aria-hidden="true"
      />
    </section>
  );
}
