import React, { useEffect, useRef, useState } from 'react';
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

export function HowItWorksSection() {
  const navigate = useNavigate();
  const sectionRef = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setRevealed(true); observer.disconnect(); } },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { t } = useTranslation();

  return (
    <section className="py-20 lg:py-28 relative overflow-hidden" ref={sectionRef}>
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(99,102,241,0.04) 0%, transparent 70%)' }}
      />
      <div className="dot-grid absolute inset-0 pointer-events-none opacity-30" aria-hidden="true" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div
            className="inline-block text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-4"
            style={{ color: '#22d3ee', background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.25)' }}
          >
            {t('howitworks.badge')}
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-(--text-primary) mb-4">
            {t('howitworks.title.line1')}
            <span className="block gradient-text">{t('howitworks.title.line2')}</span>
          </h2>
          <p className="text-(--text-secondary) text-lg max-w-xl mx-auto">
            {t('howitworks.subtitle')}
          </p>
        </div>

        <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div
            className="hidden lg:block absolute top-14 left-[calc(33.3%+24px)] right-[calc(33.3%+24px)] h-px pointer-events-none"
            aria-hidden="true"
            style={{ background: 'linear-gradient(to right, #6366f1, #22d3ee)', maskImage: 'repeating-linear-gradient(to right, black 0px, black 8px, transparent 8px, transparent 16px)' }}
          />

          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const delay = i * 150;
            return (
              <div
                key={step.number}
                className="relative bg-(--surface) border border-(--border) rounded-2xl p-7 hover-lift"
                style={revealed ? { animation: `fade-in-up 0.65s ease-out ${delay}ms both` } : { opacity: 0 }}
              >
                <div
                  className="text-6xl font-bold mb-5 leading-none select-none"
                  style={{ background: `linear-gradient(135deg, ${step.color}, ${step.color}44)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
                >
                  {step.number}
                </div>

                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ background: step.colorBg }}>
                  <Icon size={22} style={{ color: step.color }} />
                </div>

                <h3 className="text-xl font-bold text-(--text-primary) mb-3">{t(step.titleKey)}</h3>
                <p className="text-sm text-(--text-dim) leading-relaxed">{t(step.descriptionKey)}</p>

                {i < STEPS.length - 1 && (
                  <div className="lg:hidden absolute -bottom-4 left-1/2 -translate-x-1/2 z-10">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}
                    >
                      <ArrowRight size={14} className="text-(--text-secondary) rotate-90" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="text-center mt-14">
          <button className="btn-cta-primary" onClick={() => navigate('/trade')}>
            {t('howitworks.launchApp')}
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}
