import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../../i18n/i18n';

const STATS = [
  { value: '$2.4B+', labelKey: 'stats.volume.label',    sublabelKey: 'stats.volume.sublabel', color: '#22d3ee' },
  { value: '50+',    labelKey: 'stats.trending.label',   sublabelKey: 'stats.trending.sublabel', color: '#6366f1' },
  { value: '100K+',  labelKey: 'stats.trades.label',     sublabelKey: 'stats.trades.sublabel', color: '#10b981' },
  { value: '0%',     labelKey: 'stats.fees.label',       sublabelKey: 'stats.fees.sublabel', color: '#f59e0b' },
];

const DEX_LOGOS = [
  { name: 'Uniswap',      color: '#ff007a', bg: 'rgba(255,0,122,0.1)' },
  { name: 'PancakeSwap',  color: '#fcd34d', bg: 'rgba(252,211,77,0.1)' },
  { name: 'Raydium',      color: '#7c3aed', bg: 'rgba(124,58,237,0.1)' },
  { name: 'Orca',         color: '#06b6d4', bg: 'rgba(6,182,212,0.1)'  },
  { name: 'Jupiter',      color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  { name: 'Aerodrome',    color: '#818cf8', bg: 'rgba(129,140,248,0.1)'},
];

export function StatsSection() {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setRevealed(true); observer.disconnect(); } },
      { threshold: 0.25 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="py-20 lg:py-28 relative overflow-hidden" ref={sectionRef}>
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 50% at 50% 50%, rgba(99,102,241,0.05) 0%, transparent 70%)' }} />
        <div className="dot-grid absolute inset-0 opacity-25" style={{ backgroundSize: '32px 32px' }} />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <div
            className="inline-block text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-4"
            style={{ color: '#10b981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}
          >
            {t('stats.badge')}
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-(--text-primary) mb-4">
            {t('stats.title.line1')}
            <span className="block gradient-text">{t('stats.title.line2')}</span>
          </h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {STATS.map((stat, i) => (
            <div
              key={stat.labelKey}
              className="bg-(--surface) border border-(--border) rounded-2xl p-6 sm:p-8 text-center hover-lift cursor-default overflow-hidden relative"
              style={revealed ? { animation: `stat-reveal 0.7s ease-out ${i * 120}ms both` } : { opacity: 0 }}
            >
              <div
                className="absolute inset-0 pointer-events-none"
                aria-hidden="true"
                style={{ background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${stat.color}10 0%, transparent 70%)` }}
              />
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-16 rounded-full"
                style={{ background: `linear-gradient(to right, transparent, ${stat.color}, transparent)` }}
              />
              <div
                className="text-4xl sm:text-5xl font-bold mb-2 relative"
                style={{ background: `linear-gradient(135deg, ${stat.color}, ${stat.color}88)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
              >
                {stat.value}
              </div>
              <div className="text-sm font-semibold text-(--text-primary) mb-1">{t(stat.labelKey)}</div>
              <div className="text-xs text-(--text-dim)">{t(stat.sublabelKey)}</div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <p className="text-xs font-semibold tracking-widest uppercase text-(--text-dim) mb-6">
            {t('stats.supportedDexes')}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {DEX_LOGOS.map((dex) => (
              <div
                key={dex.name}
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-(--border) transition-all duration-200 hover:border-[#6366f1]/40 hover:scale-105 cursor-default"
                style={{ background: dex.bg }}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dex.color }} />
                <span className="text-sm font-semibold" style={{ color: dex.color }}>{dex.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
