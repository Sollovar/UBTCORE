import React from 'react';
import type { Pair } from '../../types';
import { MobilePairCard } from './MobilePairCard';
import { Loader } from '../common/Loader';
import { useTranslation } from '../../i18n/i18n';

interface MobileTrendingPairsProps {
  pairs: Pair[];
  loading: boolean;
  selectedPair?: Pair | null;
  onSelectPair: (pair: Pair) => void;
}

export function MobileTrendingPairs({ pairs, loading, selectedPair, onSelectPair }: MobileTrendingPairsProps) {
  const { t } = useTranslation();
  return (
    <section className="py-8 bg-(--background)">
      <div className="px-4 mb-4">
        <h2 className="text-xl font-bold text-(--text-primary) mb-1">{t('trending.title')}</h2>
        <p className="text-sm text-(--text-dim)">{t('trending.subtitle')}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader />
        </div>
      ) : (
        <div className="flex overflow-x-auto gap-3 px-4 pb-4 scrollbar-hide">
          {pairs.slice(0, 10).map((pair) => (
            <MobilePairCard
              key={pair.id}
              pair={pair}
              onClick={() => onSelectPair(pair)}
              isSelected={selectedPair?.id === pair.id}
            />
          ))}
        </div>
      )}
    </section>
  );
}
