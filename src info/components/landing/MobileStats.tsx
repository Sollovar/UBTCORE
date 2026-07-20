import React from 'react';
import { useTranslation } from '../../i18n/i18n';

const STATS = [
  { value: '$2.4B+', labelKey: 'stats.volume.label', color: '#22d3ee' },
  { value: '50+',    labelKey: 'stats.trending.label', color: '#6366f1' },
  { value: '100K+',  labelKey: 'stats.trades.label', color: '#10b981' },
  { value: '0%',     labelKey: 'stats.fees.label', color: '#f59e0b' },
];

const DEX_LOGOS = [
  { name: 'Uniswap',      color: '#ff007a' },
  { name: 'PancakeSwap',  color: '#fcd34d' },
  { name: 'Raydium',      color: '#7c3aed' },
  { name: 'Orca',         color: '#06b6d4' },
  { name: 'Jupiter',      color: '#10b981' },
  { name: 'Aerodrome',    color: '#818cf8' },
];

export function MobileStats() {
  const { t } = useTranslation();

  return (
    <section className="py-12 px-4">
      <div className="mb-8 text-center">
        <div
          className="inline-block text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-4"
          style={{ color: '#10b981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}
        >
          {t('stats.badge')}
        </div>
        <h2 className="text-2xl font-bold text-(--text-primary) mb-3">
          {t('stats.title.line1')}
          <span className="block gradient-text">{t('stats.title.line2')}</span>
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        {STATS.map((stat) => (
          <div
            key={stat.labelKey}
            className="bg-(--surface) border border-(--border) rounded-xl p-4 text-center hover:border-(--primary)/30 transition-colors"
          >
            <div
              className="text-2xl font-bold mb-2"
              style={{ background: `linear-gradient(135deg, ${stat.color}, ${stat.color}88)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
            >
              {stat.value}
            </div>
            <div className="text-sm font-semibold text-(--text-primary) mb-1">{t(stat.labelKey)}</div>
            <div className="text-xs text-(--text-dim)">{t(`${stat.labelKey.replace('.label', '.sublabel')}`)}</div>
          </div>
        ))}
      </div>

      <div className="text-center">
        <p className="text-xs font-semibold tracking-widest uppercase text-(--text-dim) mb-4">
          {t('stats.supportedDexes')}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {DEX_LOGOS.map((dex) => (
            <div
              key={dex.name}
              className="flex items-center gap-2 px-3 py-2 rounded-full bg-(--surface) border border-(--border) hover:border-(--primary)/40 transition-colors cursor-default"
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dex.color }} />
              <span className="text-sm font-semibold text-(--text-primary)">{dex.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}