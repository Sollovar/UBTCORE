import React from 'react';
import { ArrowRight, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n/i18n';

export function CtaSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <section className="py-20 lg:py-28 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 700, height: 500, background: 'radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 65%)', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 500, height: 350, background: 'radial-gradient(ellipse, rgba(34,211,238,0.07) 0%, transparent 65%)', filter: 'blur(40px)' }} />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="relative rounded-3xl overflow-hidden gradient-border">
          <div
            className="relative z-10 px-8 py-14 sm:px-16 sm:py-20"
            style={{ background: 'var(--cta-card-bg)', backdropFilter: 'blur(20px)' }}
          >
            <div
              className="inline-block text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-6"
              style={{ color: '#22d3ee', background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.25)' }}
            >
              {t('cta.badge')}
            </div>

            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-(--text-primary) mb-5 leading-tight">
              {t('cta.title.line1')}
              <span className="block gradient-text">{t('cta.title.line2')}</span>
            </h2>

            <p className="text-lg text-(--text-secondary) mb-10 max-w-lg mx-auto">
              {t('cta.subtitle')}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button className="btn-cta-primary" onClick={() => navigate('/trade')}>
                {t('cta.launchApp')}
                <ArrowRight size={18} />
              </button>
              <button className="btn-cta-secondary">
                <BookOpen size={16} />
                {t('cta.readDocs')}
              </button>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-(--text-dim)">
              {[
                t('cta.benefits.noSignUp'),
                t('cta.benefits.nonCustodial'),
                t('cta.benefits.audited'),
                t('cta.benefits.support'),
              ].map((item) => (
                <span key={item} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
