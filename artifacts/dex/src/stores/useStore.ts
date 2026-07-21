import { create } from 'zustand';
import type { Pair, Order, Orderbook } from '../types';

type Theme = 'dark' | 'light';
export type FlashDir = 'up' | 'down' | null;
export type FlashMap = Record<string, FlashDir>;

declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, callback: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, callback: (...args: unknown[]) => void) => void;
    };
  }
}

interface AppState {
  pairs: Pair[];
  pairsLoaded: boolean;         // true once pairs have been successfully fetched at least once
  pairsNetwork: string;         // network for which pairs were last fetched
  selectedPair: Pair | null;
  orderbook: Orderbook | null;
  pairsLoading: boolean;
  pairsFetchNetwork: string | null;
  flashMap: FlashMap;           // Global price flash map for all pairs

  userOrders: Order[];
  walletAddress: string | null;
  isConnected: boolean;
  theme: Theme;
  chainId: number | null;
  watchlist: string[];
  network: string;
  authToken: string | null;
  orderRefreshTick: number;

  setPairs: (pairs: Pair[], network?: string) => void;
  setPairsLoaded: (loaded: boolean) => void;
  setSelectedPair: (pair: Pair | null) => void;
  setOrderbook: (orderbook: Orderbook | null) => void;
  setUserOrders: (orders: Order[] | ((currentOrders: Order[]) => Order[])) => void;
  updateUserOrder: (orderId: string, updates: Partial<Pick<Order, 'filledAmount' | 'status'>>) => void;
  updatePair: (pairId: string, updates: Partial<Pick<Pair, 'price' | 'priceUSD' | 'priceChange24h' | 'volume24h' | 'volume24hUSD' | 'liquidity' | 'liquidityUSD' | 'marketCap' | 'marketCapUSD' | 'priceLow24h' | 'priceHigh24h' | 'trendingScore' | 'geckoPrice' | 'geckoPriceUSD' | 'geckoPriceChange24h' | 'geckoHigh24h' | 'geckoLow24h' | 'geckoLiquidity' | 'geckoLiquidityUSD' | 'geckoMarketCap' | 'geckoMarketCapUSD' | 'lastTradePrice'>>) => void;
  setPairsLoading: (loading: boolean, network?: string) => void;
  setFlash: (pairId: string, direction: FlashDir) => void;

  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  toggleTheme: () => void;
  addToWatchlist: (pairId: string) => void;
  removeFromWatchlist: (pairId: string) => void;
  isInWatchlist: (pairId: string) => boolean;
  setNetwork: (network: string) => void;
  setAuthToken: (token: string | null) => void;
  bumpOrderRefreshTick: () => void;
}

const loadWatchlist = (): string[] => {
  try {
    const saved = localStorage.getItem('cexdex-watchlist');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const saveWatchlist = (watchlist: string[]) => {
  localStorage.setItem('cexdex-watchlist', JSON.stringify(watchlist));
};

export const useStore = create<AppState>((set, get) => ({
  pairs: [],
  pairsLoaded: false,
  pairsNetwork: '',
  selectedPair: null,
  orderbook: null,
  pairsLoading: false,
  pairsFetchNetwork: null,
  flashMap: {},               // Global flash map

  userOrders: [],
  walletAddress: null,
  isConnected: false,
  theme: (localStorage.getItem('cexdex-theme') as Theme) || 'dark',
  chainId: null,
  watchlist: loadWatchlist(),
  network: 'bsc',
  authToken: localStorage.getItem('cexdex-auth-token'),
  orderRefreshTick: 0,

  setPairs: (pairs, network) => set({ pairs, pairsLoaded: pairs.length > 0, pairsNetwork: network ?? '' }),
  setPairsLoaded: (loaded) => set({ pairsLoaded: loaded }),
  setSelectedPair: (pair) => set({ selectedPair: pair }),
  setOrderbook: (orderbook) => set({ orderbook }),
  setUserOrders: (orders) => set((state) => ({
    userOrders: typeof orders === 'function' ? orders(state.userOrders) : orders,
  })),
  setPairsLoading: (loading, network) => set({ pairsLoading: loading, pairsFetchNetwork: network || null }),
  updateUserOrder: (orderId, updates) =>
    set((state) => {
      const currentOrders = Array.isArray(state.userOrders) ? state.userOrders : [];
      const userOrders = currentOrders.map((o) =>
        o.id === orderId ? { ...o, ...updates } : o
      );
      return { userOrders };
    }),
  updatePair: (pairId, updates) =>
    set((state) => {
      // Strip undefined values so WS updates with missing optional fields
      // don't overwrite good cached values (e.g. volume24hUSD) with undefined.
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([, v]) => v !== undefined)
      ) as typeof updates;
      const pairs = state.pairs.map((p) => (p.id === pairId ? { ...p, ...cleanUpdates } : p));
      const selectedPair = state.selectedPair && state.selectedPair.id === pairId
        ? { ...state.selectedPair, ...cleanUpdates }
        : state.selectedPair;
      return { pairs, selectedPair };
    }),
  setFlash: (pairId, direction) =>
    set((state) => ({
      flashMap: { ...state.flashMap, [pairId]: direction },
    })),



  connectWallet: async () => {
    if (!window.ethereum) {
      alert('No wallet detected. Please install MetaMask or another wallet.');
      return;
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      }) as string[];

      if (accounts.length > 0) {
        const chainId = await window.ethereum.request({
          method: 'eth_chainId',
        }) as string;

        set({ 
          walletAddress: accounts[0], 
          isConnected: true,
          chainId: parseInt(chainId, 16)
        });

        window.ethereum?.on?.('accountsChanged', (accounts: unknown) => {
          const newAccounts = accounts as string[];
          if (newAccounts.length === 0) {
            set({ walletAddress: null, isConnected: false, chainId: null });
          } else {
            set({ walletAddress: newAccounts[0] });
          }
        });

        window.ethereum?.on?.('chainChanged', (chainId: unknown) => {
          set({ chainId: parseInt(chainId as string, 16) });
        });
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  },

  disconnectWallet: () => set({ walletAddress: null, isConnected: false, chainId: null }),
  
  toggleTheme: () =>
    set((state) => {
      const newTheme: Theme = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('cexdex-theme', newTheme);
      return { theme: newTheme };
    }),

  addToWatchlist: (pairId: string) => {
    const current = get().watchlist;
    if (!current.includes(pairId)) {
      const updated = [...current, pairId];
      saveWatchlist(updated);
      set({ watchlist: updated });
    }
  },

  removeFromWatchlist: (pairId: string) => {
    const current = get().watchlist;
    const updated = current.filter(id => id !== pairId);
    saveWatchlist(updated);
    set({ watchlist: updated });
  },

  isInWatchlist: (pairId: string) => {
    return get().watchlist.includes(pairId);
  },

  setNetwork: (network: string) => set({ network }),

  setAuthToken: (token: string | null) => {
    if (token) {
      localStorage.setItem('cexdex-auth-token', token);
    } else {
      localStorage.removeItem('cexdex-auth-token');
    }
    set({ authToken: token });
  },

  bumpOrderRefreshTick: () => set((state) => ({ orderRefreshTick: state.orderRefreshTick + 1 })),

}));