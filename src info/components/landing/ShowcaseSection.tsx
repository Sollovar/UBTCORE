import React from 'react';
import { TrendingUp } from 'lucide-react';
import { useTranslation } from '../../i18n/i18n';

const ASKS = [
  { price: '0.001255', amount: '950,000',  total: '4.15M' },
  { price: '0.001250', amount: '500,000',  total: '3.20M' },
  { price: '0.001245', amount: '1,100,000',total: '2.70M' },
  { price: '0.001240', amount: '700,000',  total: '1.60M' },
  { price: '0.001235', amount: '900,000',  total: '0.90M' },
];

const BIDS = [
  { price: '0.001230', amount: '1,000,000',total: '1.00M' },
  { price: '0.001225', amount: '500,000',  total: '1.50M' },
  { price: '0.001220', amount: '800,000',  total: '2.30M' },
  { price: '0.001215', amount: '1,200,000',total: '3.50M' },
  { price: '0.001210', amount: '600,000',  total: '4.10M' },
];

const CHART_BARS = [
  { h: 38, up: true }, { h: 52, up: true }, { h: 44, up: false },
  { h: 61, up: true }, { h: 48, up: true }, { h: 72, up: true },
  { h: 55, up: false },{ h: 66, up: true }, { h: 58, up: true },
  { h: 75, up: false },{ h: 62, up: true }, { h: 82, up: true },
  { h: 68, up: false },{ h: 88, up: true }, { h: 74, up: true },
  { h: 92, up: true }, { h: 78, up: false },{ h: 96, up: true },
  { h: 84, up: true }, { h: 100, up: true },
];

const ANNOTATIONS = [
  { labelKey: 'showcase.annotation.liveOrderbook', top: '12%', left: '-8%', color: '#22d3ee' },
  { labelKey: 'showcase.annotation.realTimeChart', top: '12%', right: '-8%', color: '#6366f1' },
  { labelKey: 'showcase.annotation.oneClickTrade', bottom: '18%', right: '-6%', color: '#10b981' },
];

export function ShowcaseSection() {
  const { t } = useTranslation();
  return (
    <section className="py-20 lg:py-28 bg-(--background)">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <div
            className="inline-block text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-4"
            style={{ color: '#8b5cf6', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)' }}
          >
            {t('showcase.badge')}
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-(--text-primary) mb-4">
            {t('showcase.title.line1')}
            <span className="block gradient-text">{t('showcase.title.line2')}</span>
          </h2>
          <p className="text-(--text-secondary) text-lg max-w-xl mx-auto">
            {t('showcase.subtitle')}
          </p>
        </div>

        {/* Mockup wrapper — intentionally always dark as a product screenshot */}
        <div className="relative">
          <div
            className="absolute inset-0 pointer-events-none"
            aria-hidden="true"
            style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(99,102,241,0.1) 0%, transparent 70%)', filter: 'blur(40px)' }}
          />

          {ANNOTATIONS.map((a) => (
            <div
              key={a.labelKey}
              className="hidden xl:flex absolute items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold z-20"
              style={{ top: a.top, bottom: a.bottom, left: a.left, right: a.right, background: `${a.color}18`, border: `1px solid ${a.color}44`, color: a.color }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: a.color }} />
              {t(a.labelKey)}
            </div>
          ))}

          {/* UI Mockup — always dark theme */}
          <div className="relative rounded-2xl overflow-hidden border border-[#2e2e3a] gradient-border" style={{ background: '#0e0e16' }}>
            <div className="flex items-center justify-between px-4 h-10 border-b border-[#2e2e3a]" style={{ background: '#12121a' }}>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#ef4444' }} />
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#f59e0b' }} />
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#10b981' }} />
              </div>
              <div className="flex items-center gap-2 px-3 py-1 rounded-md text-xs text-[#64748b]" style={{ background: '#1a1a25' }}>
                <span className="w-2 h-2 rounded-full bg-[#10b981]" />
                PEPE / WETH  •  $0.001234
              </div>
              <div className="flex gap-2">
                {[t('showcase.tab.orderbook'), t('showcase.tab.chart'), t('showcase.tab.trades')].map((tab) => (
                  <span
                    key={tab}
                    className="text-xs px-2.5 py-1 rounded-md cursor-pointer"
                    style={{ background: tab === t('showcase.tab.chart') ? 'rgba(99,102,241,0.2)' : 'transparent', color: tab === t('showcase.tab.chart') ? '#818cf8' : '#64748b', border: tab === t('showcase.tab.chart') ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent' }}
                  >
                    {tab}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[240px_1fr_200px] min-h-[420px]">
              <div className="border-r border-[#2e2e3a] hidden md:flex flex-col">
                <div className="px-3 py-2.5 border-b border-[#2e2e3a]">
                  <span className="text-xs font-semibold text-[#94a3b8] tracking-wider uppercase">{t('showcase.orderbook')}</span>
                </div>
                <div className="grid grid-cols-3 px-3 py-1.5">
                  {[t('showcase.price'), t('showcase.amount'), t('showcase.total')].map((col) => (
                    <span key={col} className="text-[10px] text-[#64748b]">{col}</span>
                  ))}
                </div>
                {ASKS.map((row) => (
                  <div key={row.price} className="relative grid grid-cols-3 px-3 py-1 group cursor-default">
                    <div className="absolute inset-0" style={{ background: 'rgba(239,68,68,0.04)', width: `${(parseFloat(row.total) / 5) * 100}%` }} />
                    <span className="text-[11px] font-mono text-[#ef4444] z-10">{row.price}</span>
                    <span className="text-[11px] font-mono text-[#94a3b8] z-10">{row.amount}</span>
                    <span className="text-[11px] font-mono text-[#64748b] z-10">{row.total}</span>
                  </div>
                ))}
                <div className="px-3 py-1.5 border-y border-[#2e2e3a] flex items-center justify-between">
                  <span className="text-[10px] text-[#64748b]">{t('showcase.spread')}</span>
                  <span className="text-[10px] text-[#94a3b8] font-mono">0.000005</span>
                </div>
                {BIDS.map((row) => (
                  <div key={row.price} className="relative grid grid-cols-3 px-3 py-1 cursor-default">
                    <div className="absolute inset-0" style={{ background: 'rgba(16,185,129,0.04)', width: `${(parseFloat(row.total) / 5) * 100}%` }} />
                    <span className="text-[11px] font-mono text-[#10b981] z-10">{row.price}</span>
                    <span className="text-[11px] font-mono text-[#94a3b8] z-10">{row.amount}</span>
                    <span className="text-[11px] font-mono text-[#64748b] z-10">{row.total}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col">
                <div className="px-4 py-2.5 border-b border-[#2e2e3a] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <span className="text-lg font-bold text-[#f8fafc] font-mono">$0.001234</span>
                      <span className="text-xs ml-2 font-semibold" style={{ color: '#10b981' }}>+125.5%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[#64748b]">
                    <span>Vol <span className="text-[#94a3b8]">$15.2M</span></span>
                    <span>Liq <span className="text-[#94a3b8]">$5.0M</span></span>
                  </div>
                </div>
                <div className="flex-1 flex items-end gap-[3px] px-4 py-4 relative">
                  {[25, 50, 75].map((pct) => (
                    <div key={pct} className="absolute left-4 right-4 h-px pointer-events-none" style={{ bottom: `${pct}%`, background: 'rgba(46,46,58,0.5)' }} />
                  ))}
                  {CHART_BARS.map((bar, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-sm transition-opacity duration-200 hover:opacity-80"
                      style={{ height: `${bar.h}%`, background: bar.up ? 'linear-gradient(to top, #059669, #10b981)' : 'linear-gradient(to top, #b91c1c, #ef4444)', minWidth: 6, opacity: 0.85 }}
                    />
                  ))}
                </div>
                <div className="flex justify-between px-4 pb-2 border-t border-[#2e2e3a]">
                  {['12h', '8h', '4h', '2h', '1h', 'Now'].map((t) => (
                    <span key={t} className="text-[10px] text-[#64748b]">{t}</span>
                  ))}
                </div>
              </div>

              <div className="border-l border-[#2e2e3a] hidden md:flex flex-col">
                <div className="px-3 py-2.5 border-b border-[#2e2e3a]">
                  <div className="flex rounded-lg overflow-hidden border border-[#2e2e3a]">
                    <button className="flex-1 py-1.5 text-xs font-semibold" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>{t('showcase.button.buy')}</button>
                    <button className="flex-1 py-1.5 text-xs font-semibold text-[#64748b]">{t('showcase.button.sell')}</button>
                  </div>
                </div>
                <div className="flex-1 px-3 py-4 flex flex-col gap-3">
                  {[{ labelKey: 'showcase.price', value: '0.001234', unit: 'WETH' }, { labelKey: 'showcase.amount', value: '1,000,000', unit: 'PEPE' }].map(({ labelKey, value, unit }) => (
                    <div key={labelKey}>
                      <label className="text-[10px] text-[#64748b] block mb-1">{t(labelKey)}</label>
                      <div className="flex items-center justify-between px-2.5 py-2 rounded-lg border border-[#2e2e3a]" style={{ background: '#1a1a25' }}>
                        <span className="text-xs font-mono text-[#f8fafc]">{value}</span>
                        <span className="text-[10px] text-[#64748b]">{unit}</span>
                      </div>
                    </div>
                  ))}
                  <div className="text-[10px] text-[#64748b] space-y-1 mt-1">
                    <div className="flex justify-between"><span>{t('showcase.totalLabel')}</span><span className="text-[#94a3b8] font-mono">≈ 1.234 WETH</span></div>
                    <div className="flex justify-between"><span>{t('showcase.feeLabel')}</span><span className="text-[#94a3b8] font-mono">0.00123 WETH</span></div>
                  </div>
                  <button className="mt-auto w-full py-2.5 rounded-xl text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                    {t('showcase.buyButton')}
                  </button>
                  <div className="flex items-center gap-2 mt-1">
                    <TrendingUp size={11} className="text-[#10b981]" />
                    <span className="text-[10px] text-[#64748b]">{t('showcase.trendingScore')} <span className="text-[#94a3b8]">98/100</span></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
