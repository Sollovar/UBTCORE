import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, TrendingUp, Wallet, Settings, Star, FileText } from 'lucide-react';
import { useStore } from '../../stores/useStore';
import { useTranslation } from '../../i18n/i18n';

interface MobileBottomNavProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export function MobileBottomNav({ activeTab = 'home', onTabChange }: MobileBottomNavProps) {
  const navigate = useNavigate();
  const { watchlist } = useStore();
  const { t } = useTranslation();
  
  const tabs = [
    { id: 'home', icon: Home, label: t('nav.home'), action: () => navigate('/') },
    { id: 'trade', icon: TrendingUp, label: t('nav.trade'), action: () => navigate('/trade') },
    { id: 'orders', icon: FileText, label: t('nav.orders'), action: () => navigate('/orders') },
    { id: 'watchlist', icon: Star, label: t('nav.watchlist'), action: () => navigate('/watchlist'), badge: watchlist.length },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-(--background) border-t border-(--border)">
      <div className="grid grid-cols-4 gap-1 p-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={tab.action}
              className={`
                flex flex-col items-center gap-1 py-2 rounded-lg transition-colors relative
                ${isActive ? 'text-[#6366f1]' : 'text-(--text-dim) hover:text-(--text-primary)'}
              `}
            >
              <div className="relative">
                <Icon size={20} className={isActive ? 'text-[#6366f1]' : ''} />
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1 -right-2 w-4 h-4 text-[9px] bg-[#6366f1] text-white rounded-full flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium ${isActive ? 'text-[#6366f1]' : ''}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}