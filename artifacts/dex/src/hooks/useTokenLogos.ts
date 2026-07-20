// Custom hook to manage token logo loading and caching
import { useState, useEffect } from 'react';

interface TokenLogoCache {
  [key: string]: string;
}

const useTokenLogos = () => {
  const [logoCache, setLogoCache] = useState<TokenLogoCache>({});

  // Preload token logos to avoid flickering
  const preloadLogo = async (symbol: string, url: string): Promise<void> => {
    if (!url || logoCache[symbol]) return;

    try {
      // Check if image exists by creating a temporary element
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });
      
      setLogoCache(prev => ({
        ...prev,
        [symbol]: url
      }));
    } catch (error) {
      console.error(`Failed to load logo for ${symbol}:`, error);
      // Set a default logo if loading fails
      setLogoCache(prev => ({
        ...prev,
        [symbol]: '/icons/default-token.svg'
      }));
    }
  };

  const getLogoForToken = (symbol: string, apiUrl?: string): string => {
    if (apiUrl && !logoCache[symbol]) {
      // If we have an API URL but haven't cached it yet, start preloading
      preloadLogo(symbol, apiUrl);
    }
    
    return logoCache[symbol] || '/icons/default-token.svg';
  };

  return { getLogoForToken, logoCache };
};

export default useTokenLogos;
