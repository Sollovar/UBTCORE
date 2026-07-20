import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useBreakpoint } from './hooks/useBreakpoint';
import { DynamicContextProvider } from '@dynamic-labs/sdk-react-core';
import { EthereumWalletConnectors } from '@dynamic-labs/ethereum';
import { SolanaWalletConnectors } from '@dynamic-labs/solana';
import { useStore } from './stores/useStore';
import { useConnectedNetwork, getStoredNetwork } from './hooks/useConnectedNetwork';
import { TranslationProvider, useTranslation } from './i18n/i18n';

const DYNAMIC_CONTEXT_SETTINGS = {
  environmentId: 'b64ba473-3830-4799-9a51-dce3c18b33be',
  walletConnectors: [EthereumWalletConnectors, SolanaWalletConnectors],
  enabledChains: ['ETH', 'SOL'],
  solanaSettings: {
    enabledWallets: ['phantom', 'solflare'],
  },
};

// Desktop components
import { DesktopHeader }      from './components/desktop/DesktopHeader';
import { DesktopFooter }      from './components/desktop/DesktopFooter';
import { DesktopPairsTable }  from './components/desktop/DesktopPairsTable';
import { DesktopTradingPage } from './components/desktop/DesktopTradingpage';
import { DesktopWatchlist }  from './components/desktop/DesktopWatchlist';
import { OrdersPage }  from './components/common/OrdersPage';

// Mobile components
import { MobileHeader }      from './components/mobile/MobileHeader';
import { MobileBottomNav }   from './components/mobile/MobileBottomNav';
import { MobilePairsTable }  from './components/mobile/MobilePairsTable';
import { MobileTradingPage } from './components/mobile/MobileTradingPage';
import { MobileWatchlist }  from './components/mobile/MobileWatchlist';

// Landing page
import { LandingPage } from './components/landing/LandingPage';
import { ToastProvider } from './components/common/Toast';

// Store & data
import { fetchPairsFromAPI } from './utils/mockData';

// ─── Dynamic Theme Wrapper ───────────────────────────────────────────
function DynamicThemeWrapper({ children }: { children: React.ReactNode }) {
  const theme = useStore(s => s.theme);
  const providerSettings = React.useMemo(() => DYNAMIC_CONTEXT_SETTINGS, []);
  
  return (
    <DynamicContextProvider
      theme={theme === 'light' ? 'light' : 'dark'}
      settings={providerSettings}
    >
      {children}
    </DynamicContextProvider>
  );
}

// ─── Desktop Pages ────────────────────────────────────────────────

function DesktopWatchlistLoader() {
  const { pairs, pairsFetchNetwork } = useStore();
  const connectedNetwork = useConnectedNetwork();
  const network = connectedNetwork || 'bsc';
  const [loading, setLoading] = React.useState(() => pairs.length === 0 || pairsFetchNetwork !== network);
  
  React.useEffect(() => {
    if (pairs.length > 0 && pairsFetchNetwork === network) {
      setLoading(false);
      return;
    }
    
    fetchPairsFromAPI(network).then(fetchedPairs => {
      useStore.getState().setPairs(fetchedPairs);
      useStore.getState().setPairsLoading(false, network);
      setLoading(false);
    }).catch(() => {
      useStore.getState().setPairsLoading(false, network);
      setLoading(false);
    });
  }, [network, pairsFetchNetwork, pairs.length]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <DesktopHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-[#6366f1] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return <DesktopWatchlist />;
}

function MobileWatchlistLoader() {
  const { pairs, pairsFetchNetwork } = useStore();
  const connectedNetwork = useConnectedNetwork();
  const network = connectedNetwork || 'bsc';
  const [loading, setLoading] = React.useState(() => pairs.length === 0 || pairsFetchNetwork !== network);
  
  React.useEffect(() => {
    if (pairs.length > 0 && pairsFetchNetwork === network) {
      setLoading(false);
      return;
    }
    
    fetchPairsFromAPI(network).then(fetchedPairs => {
      useStore.getState().setPairs(fetchedPairs);
      useStore.getState().setPairsLoading(false, network);
      setLoading(false);
    }).catch(() => {
      useStore.getState().setPairsLoading(false, network);
      setLoading(false);
    });
  }, [network, pairsFetchNetwork, pairs.length]);

  if (loading) {
    return (
      <div className="flex flex-col h-screen">
        <MobileHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-[#6366f1] border-t-transparent rounded-full animate-spin" />
        </div>
        <MobileBottomNav activeTab="watchlist" />
      </div>
    );
  }

  return <MobileWatchlist />;
}

function DesktopLanding() {
  return (
    <div className="min-h-screen flex flex-col">
      <DesktopHeader />
      <LandingPage />
    </div>
  );
}

function DesktopTradeMarket() {
  const { t } = useTranslation();
  const { pairs, pairsFetchNetwork } = useStore();
  const connectedNetwork = useConnectedNetwork();
  const network = connectedNetwork || 'bsc';
  const [loading, setLoading] = React.useState(() => pairs.length === 0 || pairsFetchNetwork !== network);
  
  React.useEffect(() => {
    if (pairs.length > 0 && pairsFetchNetwork === network) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    fetchPairsFromAPI(network).then(fetchedPairs => {
      useStore.getState().setPairs(fetchedPairs);
      useStore.getState().setPairsLoading(false, network);
      setLoading(false);
    }).catch(() => {
      useStore.getState().setPairsLoading(false, network);
      setLoading(false);
    });
  }, [network, pairsFetchNetwork, pairs.length]);

  return (
    <div className="min-h-screen flex flex-col">
      <DesktopHeader />
      <main className="flex-1 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-(--text-primary) mb-2">{t('trade.heading')}</h1>
            <p className="text-(--text-dim)">{t('trade.subtitle')}</p>
          </div>
          <DesktopPairsTable pairs={pairs} loading={loading} />
        </div>
      </main>
      <DesktopFooter />
    </div>
  );
}

function DesktopTradingPair() {
  const { id } = useParams<{ id: string }>();
  const { pairs } = useStore();
  const connectedNetwork = useConnectedNetwork();
  const network = connectedNetwork || 'bsc';
  const [loading, setLoading] = React.useState(true);
  
  React.useEffect(() => {
    if (pairs.length > 0) {
      setLoading(false);
      return;
    }
    // Only fetch if we don't have any pairs yet
    if (loading === false) return;
    
    fetchPairsFromAPI(network).then(fetchedPairs => {
      if (fetchedPairs.length > 0) {
        useStore.getState().setPairs(fetchedPairs);
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, [network, pairs.length, loading]);

  const pair = pairs.find(p => p.id === id);
  if (!pair) return <Navigate to="/trade" replace />;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <DesktopHeader />
      <DesktopTradingPage pair={pair} />
    </div>
  );
}

// ─── Mobile Pages ─────────────────────────────────────────────────

function MobileLanding() {
  return (
    <div className="min-h-screen flex flex-col pb-16">
      <MobileHeader />
      <LandingPage />
      <MobileBottomNav activeTab="home" />
    </div>
  );
}

function MobileTradeMarket() {
  const { t } = useTranslation();
  const { pairs, pairsFetchNetwork } = useStore();
  const connectedNetwork = useConnectedNetwork();
  const network = connectedNetwork || 'bsc';
  const [loading, setLoading] = React.useState(() => pairs.length === 0 || pairsFetchNetwork !== network);
  
  React.useEffect(() => {
    if (pairs.length > 0 && pairsFetchNetwork === network) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    fetchPairsFromAPI(network).then(fetchedPairs => {
      useStore.getState().setPairs(fetchedPairs);
      useStore.getState().setPairsLoading(false, network);
      setLoading(false);
    }).catch(() => {
      useStore.getState().setPairsLoading(false, network);
      setLoading(false);
    });
  }, [network, pairsFetchNetwork, pairs.length]);

  return (
    <div className="min-h-screen flex flex-col pb-16 overflow-x-hidden">
      <MobileHeader />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 pt-5 pb-2 flex-shrink-0">
          <h1 className="text-xl font-bold text-(--text-primary) mb-1">{t('trade.heading')}</h1>
          <p className="text-sm text-(--text-dim)">{t('trade.subtitle')}</p>
        </div>
        <MobilePairsTable pairs={pairs} loading={loading} />
      </main>
      <MobileBottomNav activeTab="trade" />
    </div>
  );
}

function MobileTradingPair() {
  const { id } = useParams<{ id: string }>();
  const { pairs } = useStore();
  const connectedNetwork = useConnectedNetwork();
  const network = connectedNetwork || 'bsc';
  const [loading, setLoading] = React.useState(true);
  
  React.useEffect(() => {
    if (pairs.length > 0) {
      setLoading(false);
      return;
    }
    // Only fetch if we don't have any pairs yet
    if (loading === false) return;
    
    fetchPairsFromAPI(network).then(fetchedPairs => {
      if (fetchedPairs.length > 0) {
        useStore.getState().setPairs(fetchedPairs);
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, [network, pairs.length, loading]);

  const pair = pairs.find(p => p.id === id);
  if (!pair) return <Navigate to="/trade" replace />;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <MobileTradingPage pair={pair} />
    </div>
  );
}

function DesktopApp() {
  return (
    <Routes>
      <Route path="/"          element={<DesktopLanding />} />
      <Route path="/trade"     element={<DesktopTradeMarket />} />
      <Route path="/trade/:id" element={<DesktopTradingPair />} />
      <Route path="/watchlist" element={<DesktopWatchlistLoader />} />
      <Route path="/orders"    element={<OrdersPage />} />
      <Route path="*"          element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function MobileApp() {
  return (
    <Routes>
      <Route path="/"          element={<MobileLanding />} />
      <Route path="/trade"     element={<MobileTradeMarket />} />
      <Route path="/trade/:id" element={<MobileTradingPair />} />
      <Route path="/watchlist" element={<MobileWatchlistLoader />} />
      <Route path="/orders"    element={<OrdersPage />} />
      <Route path="*"          element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// ─── Root ─────────────────────────────────────────────────────────

// Apply theme synchronously before any React rendering
const savedTheme = localStorage.getItem('cexdex-theme');
if (savedTheme === 'light') {
  document.documentElement.classList.add('light');
  document.documentElement.classList.remove('dark');
} else {
  document.documentElement.classList.remove('light');
  document.documentElement.classList.add('dark');
}

export default function App() {
  const breakpoint = useBreakpoint();
  const theme      = useStore(s => s.theme);

  // Also apply theme when it changes via the store
  React.useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }
  }, [theme]);

  return (
    <TranslationProvider>
      <DynamicThemeWrapper>
        <ToastProvider>
          <BrowserRouter>
            {breakpoint === 'mobile' ? <MobileApp /> : <DesktopApp />}
          </BrowserRouter>
        </ToastProvider>
      </DynamicThemeWrapper>
    </TranslationProvider>
  );
}
