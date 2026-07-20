import React from 'react';
import { Wallet, Search, TrendingUp, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n/i18n';

const STEPS = [
  {
    number: '01',
    icon: Wallet,
    color: '#6366f1',
    colorBg: 'rgba(99,102,241,0.12)',
    titleKey: 'howitworks.step.connect.title',
    descriptionKey: 'howitworks.step.connect.description',
  },
  {
    number: '02',
    icon: Search,
    color: '#22d3ee',
    colorBg: 'rgba(34,211,238,0.12)',
    titleKey: 'howitworks.step.discover.title',
    descriptionKey: 'howitworks.step.discover.description',
  },
  {
    number: '03',
    icon: TrendingUp,
    color: '#10b981',
    colorBg: 'rgba(16,185,129,0.12)',
    titleKey: 'howitworks.step.trade.title',
    descriptionKey: 'howitworks.step.trade.description',
  },
];

export function MobileHowItWorks() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <section className="py-12 px-4">
      <div className="mb-8 text-center">
        <div
          className="inline-block text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-4"
          style={{ color: '#22d3ee', background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.25)' }}
        >
          {t('howitworks.badge')}
        </div>
        <h2 className="text-2xl font-bold text-(--text-primary) mb-3">
          {t('howitworks.title.line1')}
          <span className="block gradient-text">{t('howitworks.title.line2')}</span>
        </h2>
        <p className="text-(--text-secondary) text-sm max-w-sm mx-auto">
          {t('howitworks.subtitle')}
        </p>
      </div>

      <div className="space-y-6 mb-8">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <div
              key={step.number}
              className="bg-(--surface) border border-(--border) rounded-xl p-5 relative"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: step.colorBg }}>
                  <Icon size={24} style={{ color: step.color }} />
                </div>
                <div className="flex-1">
                  <div
                    className="text-2xl font-bold mb-2 leading-none"
                    style={{ background: `linear-gradient(135deg, ${step.color}, ${step.color}44)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
                  >
                    {step.number}
                  </div>
                  <h3 className="text-lg font-bold text-(--text-primary) mb-2">{t(step.titleKey)}</h3>
                  <p className="text-sm text-(--text-dim) leading-relaxed">{t(step.descriptionKey)}</p>
                </div>
              </div>

              {i < STEPS.length - 1 && (
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-10">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center bg-(--surface-elevated) border border-(--border)"
                  >
                    <ArrowRight size={12} className="text-(--text-dim)" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="text-center">
        <button
          className="w-full bg-gradient-to-r from-[#6366f1] to-[#22d3ee] text-white font-semibold py-4 px-6 rounded-xl hover:opacity-90 transition-opacity"
          onClick={() => navigate('/trade')}
        >
          {t('howitworks.launchApp')}
          <ArrowRight size={18} className="inline ml-2" />
        </button>
      </div>
    </section>
  );
}