import React, { useState } from 'react';
import { TrendingUp, Flame, Clock } from 'lucide-react';
import type { Pair } from '../../types';
import { DesktopPairCard } from './DesktopPairCard';
import { Loader } from '../common/Loader';

interface DesktopTrendingPairsProps {
  pairs: Pair[];
  loading: boolean;
  selectedPair?: Pair | null;
  onSelectPair: (pair: Pair) => void;
}

type SortOption = 'trending' | 'volume' | 'new';

export function DesktopTrendingPairs({ pairs, loading, selectedPair, onSelectPair }: DesktopTrendingPairsProps) {
  const [sortBy, setSortBy] = useState<SortOption>('trending');

  const sortedPairs = [...pairs].sort((a, b) => {
    // Three-tier ranking: 1) price+volume, 2) price only, 3) no data
    const aHasPrice = a.price > 0;
    const aHasVolume = a.volume24h > 0;
    const bHasPrice = b.price > 0;
    const bHasVolume = b.volume24h > 0;

    const aTier = (aHasPrice && aHasVolume) ? 1 : aHasPrice ? 2 : 3;
    const bTier = (bHasPrice && bHasVolume) ? 1 : bHasPrice ? 2 : 3;

    // Prioritize by tier first
    if (aTier !== bTier) {
      return aTier - bTier;
    }

    // Within same tier, sort by selected option
    if (sortBy === 'trending') return b.trendingScore - a.trendingScore;
    if (sortBy === 'volume') return b.volume24h - a.volume24h;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const sortOptions: { id: SortOption; label: string; icon: React.ReactNode }[] = [
    { id: 'trending', label: 'Trending', icon: <Flame size={14} /> },
    { id: 'volume', label: 'Volume', icon: <TrendingUp size={14} /> },
    { id: 'new', label: 'New', icon: <Clock size={14} /> },
  ];

  return (
    <section className="py-12 bg-(--background)">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-(--text-primary) mb-2">Trending Pairs</h2>
            <p className="text-(--text-dim)">Hot tokens trending on DEX aggregators</p>
          </div>

          <div className="flex items-center gap-2 p-1 bg-(--surface-elevated) rounded-lg border border-(--border)">
            {sortOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setSortBy(option.id)}
                className={`
                  flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                  ${sortBy === option.id
                    ? 'bg-[#6366f1] text-white'
                    : 'text-(--text-dim) hover:text-(--text-primary)'}
                `}
              >
                {option.icon}
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader size="lg" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedPairs.map((pair) => (
              <DesktopPairCard
                key={pair.id}
                pair={pair}
                onClick={() => onSelectPair(pair)}
                isSelected={selectedPair?.id === pair.id}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
