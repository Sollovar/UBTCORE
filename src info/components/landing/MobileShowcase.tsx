import React from 'react';
import { TrendingUp } from 'lucide-react';
import { useTranslation } from '../../i18n/i18n';

const CHART_BARS = [
  { h: 38, up: true }, { h: 52, up: true }, { h: 44, up: false },
  { h: 61, up: true }, { h: 48, up: true }, { h: 72, up: true },
  { h: 55, up: false },{ h: 66, up: true }, { h: 58, up: true },
  { h: 75, up: false },{ h: 62, up: true }, { h: 82, up: true },
  { h: 68, up: false },{ h: 88, up: true }, { h: 74, up: true },
  { h: 92, up: true }, { h: 78, up: false },{ h: 96, up: true },
  { h: 84, up: true }, { h: 100, up: true },
];

export function MobileShowcase() {
  const { t } = useTranslation();

  return (
    <section className="py-12 px-4">
      <div className="mb-8 text-center">
        <div
          className="inline-block text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-4"
          style={{ color: '#8b5cf6', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)' }}
        >
          {t('showcase.badge')}
        </div>
        <h2 className="text-2xl font-bold text-(--text-primary) mb-3">
          {t('showcase.title.line1')}
          <span className="block gradient-text">{t('showcase.title.line2')}</span>
        </h2>
        <p className="text-(--text-secondary) text-sm max-w-sm mx-auto">
          {t('showcase.subtitle')}
        </p>
      </div>

      {/* Mobile UI Mockup */}
      <div className="bg-(--surface) border border-(--border) rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 h-12 border-b border-(--border) flex items-center justify-between bg-(--surface)">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-(--danger)"></div>
            <div className="w-2 h-2 rounded-full bg-(--text-secondary)"></div>
            <div className="w-2 h-2 rounded-full bg-(--success)"></div>
          </div>
          <div className="text-xs text-(--text-dim)">PEPE / WETH • $0.001234</div>
          <div className="flex gap-1">
            {[t('showcase.tabOrderbook'), t('showcase.tabChart'), t('showcase.tabTrades')].map((tab, i) => (
              <span
                key={tab}
                className="text-[10px] px-2 py-1 rounded"
                style={{
                  background: i === 1 ? 'rgba(99,102,241,0.2)' : 'transparent',
                  color: i === 1 ? '#818cf8' : 'var(--text-dim)',
                  border: i === 1 ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent'
                }}
              >
                {tab}
              </span>
            ))}
          </div>
        </div>

        {/* Chart Area */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-lg font-bold text-(--text-primary) font-mono">$0.001234</span>
              <span className="text-xs ml-2 font-semibold text-(--success)">+125.5%</span>
            </div>
            <div className="text-xs text-(--text-dim)">
              {t('showcase.volumeLabel')} <span className="text-(--text-secondary)">$15.2M</span>
            </div>
          </div>

          {/* Chart */}
          <div className="flex items-end gap-[2px] h-32 mb-3 relative">
            {CHART_BARS.slice(0, 12).map((bar, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm"
                style={{
                  height: `${bar.h}%`,
                  background: bar.up ? 'linear-gradient(to top, #059669, #10b981)' : 'linear-gradient(to top, #b91c1c, #ef4444)',
                  minWidth: 4,
                  opacity: 0.85
                }}
              />
            ))}
          </div>

          {/* Trade Panel */}
          <div className="bg-(--surface) border border-(--border) rounded-xl p-4">
            <div className="flex rounded-lg overflow-hidden border border-[#2e2e3a] mb-4">
              <button className="flex-1 py-2 text-xs font-semibold text-[#10b981]" style={{ background: 'rgba(16,185,129,0.15)' }}>
                {t('trade.buy')}
              </button>
              <button className="flex-1 py-2 text-xs font-semibold text-[#64748b]">
                {t('trade.sell')}
              </button>
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <label className="text-[10px] text-(--text-dim) block mb-1">{t('trade.price')}</label>
                <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-(--border) bg-(--surface)">
                  <span className="text-xs font-mono text-(--text-primary)">0.001234</span>
                  <span className="text-[10px] text-(--text-dim)">WETH</span>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-(--text-dim) block mb-1">{t('trade.amount')}</label>
                <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-(--border) bg-(--surface)">
                  <span className="text-xs font-mono text-(--text-primary)">1,000,000</span>
                  <span className="text-[10px] text-(--text-dim)">PEPE</span>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-(--text-dim) space-y-1 mb-4">
              <div className="flex justify-between">
                <span>{t('showcase.total')}</span>
                <span className="text-(--text-secondary) font-mono">≈ 1.234 WETH</span>
              </div>
              <div className="flex justify-between">
                <span>{t('showcase.fee')}</span>
                <span className="text-(--text-secondary) font-mono">0.00123 WETH</span>
              </div>
            </div>

            <button className="w-full py-3 rounded-xl text-sm font-bold text-white mb-3" style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
              {t('trade.buy')} PEPE
            </button>

            <div className="flex items-center justify-center gap-2">
              <TrendingUp size={11} className="text-(--success)" />
              <span className="text-[10px] text-(--text-dim)">
                {t('showcase.trendingScore')} <span className="text-(--text-secondary)">98/100</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}