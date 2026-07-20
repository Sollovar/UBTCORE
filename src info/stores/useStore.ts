import { create } from 'zustand';
import type { Pair, Order, Orderbook } from '../types';

type Theme = 'dark' | 'light';

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
  selectedPair: Pair | null;
  orderbook: Orderbook | null;
  pairsLoading: boolean;
  pairsFetchNetwork: string | null;

  userOrders: Order[];
  walletAddress: string | null;
  isConnected: boolean;
  theme: Theme;
  chainId: number | null;
  watchlist: string[];
  network: string;
  authToken: string | null;

  setPairs: (pairs: Pair[]) => void;
  setSelectedPair: (pair: Pair | null) => void;
  setOrderbook: (orderbook: Orderbook | null) => void;
  setUserOrders: (orders: Order[] | ((currentOrders: Order[]) => Order[])) => void;
  updateUserOrder: (orderId: number, updates: Partial<Pick<Order, 'filledAmount' | 'status'>>) => void;
  updatePair: (pairId: string, updates: Partial<Pick<Pair, 'price' | 'priceUSD' | 'priceChange24h' | 'volume24h' | 'volume24hUSD' | 'liquidity' | 'liquidityUSD' | 'priceLow24h' | 'priceHigh24h' | 'trendingScore'>>) => void;
  setPairsLoading: (loading: boolean, network?: string) => void;

  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  toggleTheme: () => void;
  addToWatchlist: (pairId: string) => void;
  removeFromWatchlist: (pairId: string) => void;
  isInWatchlist: (pairId: string) => boolean;
  setNetwork: (network: string) => void;
  setAuthToken: (token: string | null) => void;
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
  selectedPair: null,
  orderbook: null,
  pairsLoading: false,
  pairsFetchNetwork: null,

  userOrders: [],
  walletAddress: null,
  isConnected: false,
  theme: (localStorage.getItem('cexdex-theme') as Theme) || 'dark',
  chainId: null,
  watchlist: loadWatchlist(),
  network: 'bsc',
  authToken: localStorage.getItem('cexdex-auth-token'),

  setPairs: (pairs) => set({ pairs }),
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
      const pairs = state.pairs.map((p) => (p.id === pairId ? { ...p, ...updates } : p));
      const selectedPair = state.selectedPair && state.selectedPair.id === pairId
        ? { ...state.selectedPair, ...updates }
        : state.selectedPair;
      return { pairs, selectedPair };
    }),



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

        window.ethereum.on('accountsChanged', (accounts: unknown) => {
          const newAccounts = accounts as string[];
          if (newAccounts.length === 0) {
            set({ walletAddress: null, isConnected: false, chainId: null });
          } else {
            set({ walletAddress: newAccounts[0] });
          }
        });

        window.ethereum.on('chainChanged', (chainId: unknown) => {
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


}));