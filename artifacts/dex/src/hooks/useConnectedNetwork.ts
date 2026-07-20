import { useState, useEffect, useRef, useCallback } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';

export type Network = 'bsc' | 'base' | 'ethereum' | 'arbitrum' | 'avalanche' | 'polygon' | 'solana';

const chainIdToNetwork: Record<string, Network> = {
  '56': 'bsc',
  '8453': 'base',
  '1': 'ethereum',
  '42161': 'arbitrum',
  '43114': 'avalanche',
  '137': 'polygon',
  '84532': 'base',
  '97': 'bsc',
};

const dynamicChainToNetwork: Record<string, Network> = {
  'SOL': 'solana',
  'SOLANA': 'solana',
};

const STORAGE_KEY = 'cexdex-v2-network';

export function getStoredNetwork(): Network {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'bsc' || stored === 'base' || stored === 'ethereum' || 
      stored === 'arbitrum' || stored === 'avalanche' || stored === 'polygon' || stored === 'solana') {
    return stored;
  }
  return 'bsc';
}

export function setStoredNetwork(network: Network): void {
  localStorage.setItem(STORAGE_KEY, network);
}

const normalizeNetworkValue = (rawValue: string | number | undefined): Network | undefined => {
  if (rawValue === undefined || rawValue === null) return undefined;

  let normalized = typeof rawValue === 'number' ? String(rawValue) : rawValue.toLowerCase();

  if (normalized.startsWith('0x')) {
    normalized = String(parseInt(normalized.replace('0x', ''), 16));
  }

  if (normalized === 'sol' || normalized === 'solana' || normalized === '101' || normalized === '102' || normalized === '201') {
    return 'solana';
  }

  return chainIdToNetwork[normalized] as Network | undefined;
};

const getNetworkFromWallet = async (primaryWallet: any): Promise<Network | undefined> => {
  try {
    const connectedChain = String(primaryWallet?.connector?.connectedChain || '').toUpperCase();
    if (dynamicChainToNetwork[connectedChain]) {
      return dynamicChainToNetwork[connectedChain];
    }

    if (typeof primaryWallet.getNetwork === 'function') {
      const walletNetwork = await primaryWallet.getNetwork();
      const normalized = normalizeNetworkValue(walletNetwork);
      if (normalized) return normalized;
    }
  } catch (err) {
    console.error('[useConnectedNetwork] Wallet network lookup failed:', err);
  }

  // Fallback for known Solana wallets to prevent them from hitting the EVM fallback
  if (primaryWallet?.chain === 'SOL' || primaryWallet?.connector?.key === 'phantom' || primaryWallet?.connector?.key === 'solflare') {
    return 'solana';
  }

  return undefined;
};

const getSolanaProvider = (): { isPhantom?: boolean; isSolflare?: boolean; publicKey?: { toString: () => string }; isConnected?: boolean } | null => {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as Record<string, unknown>;
  const sol = win.solana as Record<string, unknown> | undefined;
  if (!sol || typeof sol !== 'object') return null;
  
  // Only return provider if it's actually CONNECTED (not just installed)
  // Check isConnected property or publicKey existence
  const isConnected = (sol.isConnected === true) || (sol.publicKey !== undefined && sol.publicKey !== null);
  if (isConnected && (sol.isPhantom || sol.isSolflare)) {
    return sol as { isPhantom?: boolean; isSolflare?: boolean; publicKey?: { toString: () => string }; isConnected?: boolean };
  }
  return null;
};

const getEthereumProvider = (): { request: (args: { method: string }) => Promise<string>; on?: (event: string, handler: () => void) => void; removeListener?: (event: string, handler: () => void) => void } | null => {
  if (typeof window === 'undefined') return null;
  
  const win = window as unknown as Record<string, unknown>;
  
  if (win.ethereum && typeof win.ethereum === 'object') {
    const eth = win.ethereum as Record<string, unknown>;
    if (eth.isMetaMask || eth.isRabby || eth.coinbaseWallet) {
      return win.ethereum as { request: (args: { method: string }) => Promise<string> };
    }
  }
  
  if (win.okxwallet) {
    return win.okxwallet as { request: (args: { method: string }) => Promise<string> };
  }
  if (win.leapwallet) {
    return win.leapwallet as { request: (args: { method: string }) => Promise<string> };
  }
  if (win.cosmostation) {
    return win.cosmostation as { request: (args: { method: string }) => Promise<string> };
  }
  if (win.keplr) {
    return win.keplr as { request: (args: { method: string }) => Promise<string> };
  }
  
  if (win.ethereum) {
    return win.ethereum as { request: (args: { method: string }) => Promise<string> };
  }
  
  return null;
};

const getNetworkFromBrowserProvider = async (): Promise<Network | undefined> => {
  // Only check Solana if it's actively connected
  const solanaProvider = getSolanaProvider();
  if (solanaProvider) {
    console.debug('[useConnectedNetwork] Detected connected Solana wallet');
    return 'solana';
  }

  // Then check EVM providers
  const ethereum = getEthereumProvider();
  if (!ethereum) {
    console.debug('[useConnectedNetwork] No connected wallet provider detected');
    return undefined;
  }

  try {
    const chainId = await ethereum.request({ method: 'eth_chainId' });
    const chainIdNum = parseInt(String(chainId).replace('0x', ''), 16);
    const network = chainIdToNetwork[String(chainIdNum)];
    if (network) {
      console.debug('[useConnectedNetwork] Detected EVM chain:', network, 'chainId:', chainIdNum);
    }
    return network;
  } catch (err) {
    console.error('[useConnectedNetwork] Browser provider network lookup failed:', err);
    return undefined;
  }
};

export function useConnectedNetwork(): Network {
  const [network, setNetwork] = useState<Network>(() => getStoredNetwork());
  const { primaryWallet, network: dynamicNetwork } = useDynamicContext();
  const isDetecting = useRef(false);
  const prevWalletRef = useRef<any>(null);

  const setNetworkState = useCallback((nextNetwork: Network) => {
    setNetwork((currentNetwork) => {
      if (currentNetwork === nextNetwork) return currentNetwork;
      setStoredNetwork(nextNetwork);
      return nextNetwork;
    });
  }, []);

  const detectNetwork = useCallback(async () => {
    if (isDetecting.current) return;
    isDetecting.current = true;
    
    try {
      // Priority 1: Dynamic network from connected wallet
      if (dynamicNetwork) {
        const normalized = normalizeNetworkValue(dynamicNetwork);
        if (normalized) {
          console.debug('[useConnectedNetwork] Detected network from dynamicNetwork:', normalized);
          setNetworkState(normalized);
          isDetecting.current = false;
          return;
        }
      }

      // Priority 2: Primary wallet connection
      if (primaryWallet) {
        const walletDetected = await getNetworkFromWallet(primaryWallet);
        if (walletDetected) {
          console.debug('[useConnectedNetwork] Detected network from primaryWallet:', walletDetected);
          setNetworkState(walletDetected);
          prevWalletRef.current = primaryWallet;
          isDetecting.current = false;
          return;
        }
      }

      // Priority 3: Browser provider (MetaMask, etc.)
      const browserDetected = await getNetworkFromBrowserProvider();
      if (browserDetected) {
        console.debug('[useConnectedNetwork] Detected network from browser provider:', browserDetected);
        setNetworkState(browserDetected);
        isDetecting.current = false;
        return;
      }

      // Priority 4: If no wallet is connected now, but we had one before, use stored network
      // This handles the case where user disconnected their wallet
      if (!primaryWallet && prevWalletRef.current) {
        const stored = getStoredNetwork();
        console.debug('[useConnectedNetwork] Wallet disconnected, restoring stored network:', stored);
        setNetworkState(stored);
        prevWalletRef.current = null;
        isDetecting.current = false;
        return;
      }

      // Priority 5: Fallback to stored network (should always have a value, defaults to 'bsc')
      const stored = getStoredNetwork();
      console.debug('[useConnectedNetwork] Using stored network (default):', stored);
      setNetworkState(stored);
    } catch (err) {
      console.error('[useConnectedNetwork] Error during detection:', err);
      // On error, always fall back to stored network
      const stored = getStoredNetwork();
      console.debug('[useConnectedNetwork] Error fallback to stored network:', stored);
      setNetworkState(stored);
    } finally {
      isDetecting.current = false;
    }
  }, [dynamicNetwork, primaryWallet, setNetworkState]);

  // Initial network load on mount
  useEffect(() => {
    const stored = getStoredNetwork();
    setNetwork(stored);
    detectNetwork();
  }, []);

  // Detect network when wallet connection status changes
  useEffect(() => {
    detectNetwork();
  }, [primaryWallet, dynamicNetwork, detectNetwork]);

  // Listen for manual chain changes on browser provider
  useEffect(() => {
    const ethereum = getEthereumProvider();
    if (!ethereum) return;

    const handleChainChange = () => {
      detectNetwork();
    };

    if (ethereum.on) {
      ethereum.on('chainChanged', handleChainChange);
    }

    return () => {
      ethereum.removeListener?.('chainChanged', handleChainChange);
    };
  }, [detectNetwork]);

  // Listen for manual network change events
  useEffect(() => {
    const handleManualChange = () => {
      const stored = getStoredNetwork();
      setNetwork(stored);
    };

    window.addEventListener('network-change', handleManualChange);
    return () => window.removeEventListener('network-change', handleManualChange);
  }, []);

  return network;
}

export function useSetNetwork() {
  return (network: Network) => {
    setStoredNetwork(network);
    window.dispatchEvent(new Event('network-change'));
  };
}

export function getNetworkName(network: Network | string | null): string {
  if (!network) return 'All Networks';
  
  const names: Record<string, string> = {
    'bsc': 'BNB Chain',
    'base': 'Base',
    'ethereum': 'Ethereum',
    'arbitrum': 'Arbitrum',
    'avalanche': 'Avalanche',
    'polygon': 'Polygon',
    'solana': 'Solana',
  };
  
  return names[network] || network;
}
