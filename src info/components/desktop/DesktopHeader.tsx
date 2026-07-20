import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon, Star, ChevronDown, FileText } from 'lucide-react';
import { DynamicWidget, useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useStore } from '../../stores/useStore';
import { useConnectedNetwork, getStoredNetwork, setStoredNetwork, getNetworkName, Network } from '../../hooks/useConnectedNetwork';
import { useTranslation } from '../../i18n/i18n';
import { LanguageSelector } from '../common/LanguageSelector';

const NETWORKS: { id: Network; name: string }[] = [
  { id: 'bsc', name: 'BNB Chain' },
  { id: 'base', name: 'Base' },
  { id: 'ethereum', name: 'Ethereum' },
  { id: 'arbitrum', name: 'Arbitrum' },
  { id: 'avalanche', name: 'Avalanche' },
  { id: 'polygon', name: 'Polygon' },
  { id: 'solana', name: 'Solana' },
];

export function DesktopHeader() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useDynamicContext();
  const { theme, toggleTheme, watchlist } = useStore();
  const currentNetwork = useConnectedNetwork();
  const [showNetworkMenu, setShowNetworkMenu] = useState(false);
  const { t } = useTranslation();
  
  const walletAddress = user?.verifiedCredentials?.[0]?.address || null;
  const isConnected = isAuthenticated && !!walletAddress;

  const logoLightUrl = 'https://zhzihlfavquifmccvhqz.supabase.co/storage/v1/object/public/my%20logos/logo_transparent.png';
  const logoDarkUrl = 'https://zhzihlfavquifmccvhqz.supabase.co/storage/v1/object/public/my%20logos/IMG_7972.png';
  const logoUrl = theme === 'dark' ? logoDarkUrl : logoLightUrl;

  const handleNetworkSelect = (network: Network) => {
    setStoredNetwork(network);
    setShowNetworkMenu(false);
    window.dispatchEvent(new Event('network-change'));
  };

  const currentNetworkName = getNetworkName(currentNetwork);

  return (
    <header className="sticky top-0 z-40 bg-(--background)/80 backdrop-blur-xl border-b border-(--border)">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <button onClick={() => navigate('/')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-lg overflow-hidden">
                <img
                  src={logoUrl}
                  alt="Unbound"
                  className="w-8 h-8 object-cover"
                />
              </div>
              <span className="text-xl font-bold text-(--text-primary)">Unbound</span>
            </button>

            <nav className="hidden md:flex items-center gap-6">
              <button onClick={() => navigate('/trade')} className="text-(--text-secondary) hover:text-(--text-primary) transition-colors text-sm font-medium">
                {t('header.nav.trade')}
              </button>
              <button onClick={() => navigate('/trade')} className="text-(--text-secondary) hover:text-(--text-primary) transition-colors text-sm font-medium">
                {t('header.nav.pairs')}
              </button>
              <button 
                onClick={() => navigate('/watchlist')} 
                className="flex items-center gap-1.5 text-(--text-secondary) hover:text-(--text-primary) transition-colors text-sm font-medium relative"
              >
                <Star size={14} className={watchlist.length > 0 ? 'text-yellow-500 fill-yellow-500' : ''} />
                {t('header.nav.watchlist')}
                {watchlist.length > 0 && (
                  <span className="absolute -top-1 -right-3 w-4 h-4 text-[10px] bg-[#6366f1] text-white rounded-full flex items-center justify-center">
                    {watchlist.length}
                  </span>
                )}
              </button>
              <button 
                onClick={() => navigate('/orders')} 
                className="flex items-center gap-1.5 text-(--text-secondary) hover:text-(--text-primary) transition-colors text-sm font-medium"
              >
                <FileText size={14} />
                {t('header.nav.orders')}
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSelector />
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2 rounded-lg text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--surface-elevated) transition-colors"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <div className="dynamic-widget-container">
              <DynamicWidget />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
