import React from 'react';
import { Zap, BarChart3, DollarSign, Globe, Timer, ShieldCheck } from 'lucide-react';
import { useTranslation } from '../../i18n/i18n';

const FEATURES = [
  {
    id: 'early-access',
    icon: Zap,
    iconColor: '#6366f1',
    iconBg: 'rgba(99,102,241,0.12)',
    titleKey: 'feature.earlyAccess.title',
    descriptionKey: 'feature.earlyAccess.description',
    size: 'large',
    tagKey: 'feature.tag.core',
    tagColor: '#6366f1',
  },
  {
    id: 'orderbook',
    icon: BarChart3,
    iconColor: '#22d3ee',
    iconBg: 'rgba(34,211,238,0.12)',
    titleKey: 'feature.orderbook.title',
    descriptionKey: 'feature.orderbook.description',
    size: 'medium',
    tagKey: 'feature.tag.onchain',
    tagColor: '#22d3ee',
  },
  {
    id: 'zero-fees',
    icon: DollarSign,
    iconColor: '#10b981',
    iconBg: 'rgba(16,185,129,0.12)',
    titleKey: 'feature.zeroFees.title',
    descriptionKey: 'feature.zeroFees.description',
    size: 'medium',
    tagKey: 'feature.tag.freeForever',
    tagColor: '#10b981',
  },
  {
    id: 'multi-dex',
    icon: Globe,
    iconColor: '#8b5cf6',
    iconBg: 'rgba(139,92,246,0.12)',
    titleKey: 'feature.multiDex.title',
    descriptionKey: 'feature.multiDex.description',
    size: 'medium',
    tagKey: 'feature.tag.dexes',
    tagColor: '#8b5cf6',
  },
  {
    id: 'fast',
    icon: Timer,
    iconColor: '#f59e0b',
    iconBg: 'rgba(245,158,11,0.12)',
    titleKey: 'feature.fast.title',
    descriptionKey: 'feature.fast.description',
    size: 'small',
    tagKey: 'feature.tag.fast',
    tagColor: '#f59e0b',
  },
  {
    id: 'secure',
    icon: ShieldCheck,
    iconColor: '#ef4444',
    iconBg: 'rgba(239,68,68,0.12)',
    titleKey: 'feature.secure.title',
    descriptionKey: 'feature.secure.description',
    size: 'small',
    tagKey: 'feature.tag.audited',
    tagColor: '#ef4444',
  },
];

interface FeatureCardProps {
  feature: (typeof FEATURES)[0];
}

function FeatureCard({ feature }: FeatureCardProps) {
  const Icon = feature.icon;
  const { t } = useTranslation();

  return (
    <div className="bg-(--surface) border border-(--border) rounded-xl p-4 hover:border-(--primary)/30 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: feature.iconBg }}>
          <Icon size={20} style={{ color: feature.iconColor }} />
        </div>
        <span
          className="text-xs font-semibold px-2 py-1 rounded-full shrink-0"
          style={{ color: feature.tagColor, background: `${feature.tagColor}18`, border: `1px solid ${feature.tagColor}33` }}
        >
          {t(feature.tagKey)}
        </span>
      </div>

      <h3 className="text-base font-bold text-(--text-primary) mb-2">{t(feature.titleKey)}</h3>
      <p className="text-sm text-(--text-dim) leading-relaxed">{t(feature.descriptionKey)}</p>
    </div>
  );
}

export function MobileFeatures() {
  const { t } = useTranslation();

  return (
    <section className="py-12 px-4">
      <div className="mb-8 text-center">
        <div
          className="inline-block text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-4"
          style={{ color: '#6366f1', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)' }}
        >
          Why Unbound?
        </div>
        <h2 className="text-2xl font-bold text-(--text-primary) mb-3">
          {t('features.sectionTitle')}
        </h2>
        <p className="text-(--text-secondary) text-sm max-w-sm mx-auto">
          {t('features.sectionDescription')}
        </p>
      </div>

      <div className="space-y-4">
        {FEATURES.map((feature) => (
          <FeatureCard key={feature.id} feature={feature} />
        ))}
      </div>
    </section>
  );
}