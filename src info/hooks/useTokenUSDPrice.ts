import { useState, useEffect, useCallback, useRef } from 'react';

const GECKO_API = 'https://api.geckoterminal.com/api/v2';

interface TokenPricesMap {
  [address: string]: number | null;
}

const priceCache = new Map<string, { price: number | null; timestamp: number }>();
const CACHE_DURATION = 60000;

function normalizeAddress(network: string, address: string): string {
  const trimmed = address.trim();
  return network === 'solana' ? trimmed : trimmed.toLowerCase();
}

async function fetchTokenPricesFromGecko(network: string, addresses: string[]): Promise<TokenPricesMap> {
  const normalizedAddresses = addresses
    .filter(Boolean)
    .map(address => normalizeAddress(network, address));
  const uniqueAddresses = [...new Set(normalizedAddresses)];
  
  const cachedPrices: TokenPricesMap = {};
  const addressesToFetch: string[] = [];
  
  for (const addr of uniqueAddresses) {
    const cached = priceCache.get(`${network}:${addr}`);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      cachedPrices[addr] = cached.price;
    } else {
      addressesToFetch.push(addr);
    }
  }
  
  if (addressesToFetch.length === 0) {
    return cachedPrices;
  }
  
  try {
    const addressesParam = addressesToFetch.join(',');
    const url = `${GECKO_API}/networks/${network}/tokens/multi/${addressesParam}?include_inactive_source=false&include=top_pools`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.warn('[useTokenPrices] fetch failed', { network, addressesToFetch, status: response.status, statusText: response.statusText });
      return cachedPrices;
    }
    
    const data = await response.json();
    const tokenDataArray = Array.isArray(data?.data) ? data.data : [];
    
    const newPrices: TokenPricesMap = {};
    
    for (const tokenItem of tokenDataArray) {
      const attrs = tokenItem?.attributes;
      const rawAddr = attrs?.address || '';
      const addr = normalizeAddress(network, rawAddr);
      const price = parseFloat(attrs?.price_usd) || null;
      
      if (addr) {
        newPrices[addr] = price;
        priceCache.set(`${network}:${addr}`, { price, timestamp: Date.now() });
      }
    }
    
    return { ...cachedPrices, ...newPrices };
  } catch (err) {
    return cachedPrices;
  }
}

interface UseTokenPricesResult {
  prices: TokenPricesMap;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useTokenPrices(
  addresses: string[],
  network: string
): UseTokenPricesResult {
  const [prices, setPrices] = useState<TokenPricesMap>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef(false);

  const fetchPrices = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await fetchTokenPricesFromGecko(network, addresses);
      setPrices(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch prices');
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [addresses.join(','), network]);

  useEffect(() => {
    if (addresses.length > 0) {
      fetchPrices();
    }
  }, [fetchPrices]);

  return { prices, loading, error, refetch: fetchPrices };
}

interface USDValueResult {
  baseTokenUSDValue: string | null;
  quoteTokenUSDValue: string | null;
  loading: boolean;
}

export function useUSDValues(
  baseTokenAddress: string,
  quoteTokenAddress: string,
  amount: string,
  price: number,
  network: string
): USDValueResult {
  const { prices, loading } = useTokenPrices(
    [baseTokenAddress, quoteTokenAddress],
    network
  );

  const baseTokenUSDPrice = prices[normalizeAddress(network, baseTokenAddress)] || null;
  const quoteTokenUSDPrice = prices[normalizeAddress(network, quoteTokenAddress)] || null;

  const amountNum = parseFloat(amount) || 0;
  const priceNum = price || 0;

  let baseTokenUSDValue: string | null = null;
  let quoteTokenUSDValue: string | null = null;

  if (amountNum > 0 && baseTokenUSDPrice) {
    const value = amountNum * baseTokenUSDPrice;
    baseTokenUSDValue = formatUSD(value);
  }

  if (amountNum > 0 && priceNum > 0 && quoteTokenUSDPrice) {
    const totalQuote = amountNum * priceNum;
    const value = totalQuote * quoteTokenUSDPrice;
    quoteTokenUSDValue = formatUSD(value);

    if (!baseTokenUSDValue) {
      // When base token USD is unavailable, derive base token USD from quote-token USD.
      const fallbackBaseValue = amountNum * priceNum * quoteTokenUSDPrice;
      baseTokenUSDValue = formatUSD(fallbackBaseValue);
    }
  }

  return { baseTokenUSDValue, quoteTokenUSDValue, loading };
}

function formatUSD(value: number): string {
  if (value >= 1) {
    return value.toLocaleString('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
  return value.toLocaleString('en-US', { 
    style: 'currency', 
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 6
  });
}