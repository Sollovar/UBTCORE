import React from 'react';
import { ArrowRight, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n/i18n';

export function MobileCta() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <section className="py-12 px-4">
      <div className="bg-gradient-to-br from-[#6366f1]/10 via-transparent to-[#22d3ee]/10 rounded-2xl border border-[#2e2e3a] p-6 text-center">
        <div
          className="inline-block text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-6"
          style={{ color: '#22d3ee', background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.25)' }}
        >
          {t('cta.badge')}
        </div>

        <h2 className="text-2xl font-bold text-(--text-primary) mb-4 leading-tight">
          {t('cta.title.line1')}
          <span className="block gradient-text">{t('cta.title.line2')}</span>
        </h2>

        <p className="text-(--text-secondary) text-sm mb-6 max-w-sm mx-auto">
          {t('cta.subtitle')}
        </p>

        <div className="space-y-3 mb-6">
          <button
            className="w-full bg-gradient-to-r from-[#6366f1] to-[#22d3ee] text-white font-semibold py-4 px-6 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            onClick={() => navigate('/trade')}
          >
            {t('cta.launchApp')}
            <ArrowRight size={18} />
          </button>
          <button className="w-full bg-(--surface) border border-(--border) text-(--text-primary) font-semibold py-4 px-6 rounded-xl hover:border-(--primary)/40 transition-colors flex items-center justify-center gap-2">
            <BookOpen size={16} />
            {t('cta.readDocs')}
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-(--text-dim)">
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
    </section>
  );
}