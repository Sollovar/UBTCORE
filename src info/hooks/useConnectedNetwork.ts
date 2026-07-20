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
  if (sol.isPhantom || sol.isSolflare || sol.isConnected || sol.publicKey) {
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
  const solanaProvider = getSolanaProvider();
  if (solanaProvider) return 'solana';

  const ethereum = getEthereumProvider();
  if (!ethereum) return undefined;

  try {
    const chainId = await ethereum.request({ method: 'eth_chainId' });
    const chainIdNum = parseInt(String(chainId).replace('0x', ''), 16);
    return chainIdToNetwork[String(chainIdNum)];
  } catch (err) {
    console.error('[useConnectedNetwork] Browser provider network lookup failed:', err);
    return undefined;
  }
};

export function useConnectedNetwork(): Network {
  const [network, setNetwork] = useState<Network>(() => getStoredNetwork());
  const { primaryWallet, network: dynamicNetwork } = useDynamicContext();
  const isDetecting = useRef(false);

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
      if (dynamicNetwork) {
        const normalized = normalizeNetworkValue(dynamicNetwork);
        if (normalized) {
          setNetworkState(normalized);
          return;
        }
      }

      if (primaryWallet) {
        const walletDetected = await getNetworkFromWallet(primaryWallet);
        if (walletDetected) {
          setNetworkState(walletDetected);
          return;
        }
      }

      const browserDetected = await getNetworkFromBrowserProvider();
      if (browserDetected) {
        setNetworkState(browserDetected);
        return;
      }
    } catch (err) {
      console.error('[useConnectedNetwork] Error:', err);
    } finally {
      isDetecting.current = false;
    }
  }, [dynamicNetwork, primaryWallet]);

  useEffect(() => {
    async function initNetwork() {
      if (dynamicNetwork) {
        const normalized = normalizeNetworkValue(dynamicNetwork);
        if (normalized) {
          setNetworkState(normalized);
          return;
        }
      }

      if (primaryWallet) {
        const walletDetected = await getNetworkFromWallet(primaryWallet);
        if (walletDetected) {
          setNetworkState(walletDetected);
          return;
        }
      }

      const browserDetected = await getNetworkFromBrowserProvider();
      if (browserDetected) {
        setNetworkState(browserDetected);
        return;
      }
      
      const stored = getStoredNetwork();
      setNetwork(stored);
    }
    
    initNetwork();
  }, [primaryWallet, dynamicNetwork]);

  useEffect(() => {
    if (primaryWallet || dynamicNetwork) {
      const timer = window.setTimeout(detectNetwork, 500);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [primaryWallet, dynamicNetwork, detectNetwork]);



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
