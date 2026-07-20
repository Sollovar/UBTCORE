import type { Pair, Orderbook, OrderbookLevel, Candle, RecentTrade } from '../types';
import { parseFormattedNumber } from './formatters';
import { fromWei } from './amount';

// ─── Seeded RNG for deterministic mock data ───────────────────────
function seededRng(seed: number) {
  let s = Math.abs(seed) || 12345;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  }
  return Math.abs(h);
}

// ─── Generators ───────────────────────────────────────────────────

export function generateSparkline(basePrice: number, priceChange24h: number, seed: number): number[] {
  const rng = seededRng(seed);
  const startPrice = basePrice / (1 + priceChange24h / 100);
  const pts: number[] = [];
  
  // Generate 48 data points for smoother, more detailed chart (30min intervals)
  for (let i = 0; i < 48; i++) {
    const t = i / 47;
    
    // Create more realistic price movement with multiple trends
    const trend = startPrice + (basePrice - startPrice) * t;
    
    // Add realistic volatility that changes over time
    const volatility = 0.015 + 0.01 * Math.sin(t * Math.PI * 2) + 0.005 * rng();
    const noise = (rng() - 0.5) * startPrice * volatility;
    
    // Add some momentum effects (prices tend to continue in their direction)
    const momentum = i > 1 ? (pts[i-1] - pts[i-2]) * 0.3 : 0;
    
    const price = Math.max(0.0000001, trend + noise + momentum);
    pts.push(price);
  }
  
  // Ensure the final price matches the current price
  pts[47] = basePrice;
  
  return pts;
}

export function generateCandles(basePrice: number, numCandles = 100, seed = 1): Candle[] {
  const rng = seededRng(seed);
  const candles: Candle[] = [];
  let price = basePrice * (0.82 + rng() * 0.36);
  const now = Date.now();
  const intervalMs = 4 * 60 * 60 * 1000; // 4 h base

  for (let i = numCandles - 1; i >= 0; i--) {
    const open = price;
    const change = (rng() - 0.5) * 0.065;
    const close = open * (1 + change);
    const high = Math.max(open, close) * (1 + rng() * 0.018);
    const low  = Math.min(open, close) * (1 - rng() * 0.018);
    const volume = basePrice * (150000 + rng() * 900000);
    candles.push({ time: new Date(now - i * intervalMs).toISOString(), open, high, low, close, volume });
    price = close;
  }
  return candles;
}

export function generateRecentTrades(basePrice: number, count = 30, seed = 1): RecentTrade[] {
  const rng = seededRng(seed + 200);
  const trades: RecentTrade[] = [];
  const now = Date.now();
  let price = basePrice;

  for (let i = 0; i < count; i++) {
    const side: 'buy' | 'sell' = rng() > 0.48 ? 'buy' : 'sell';
    price *= 1 + (rng() - 0.5) * 0.005;
    trades.push({
      id: `t-${seed}-${i}`,
      price,
      amount: rng() * 4.5 + 0.05,
      side,
      time: new Date(now - i * (7000 + rng() * 5000)).toISOString(),
    });
  }
  return trades;
}

export function generateOrderbook(pairId: string, basePrice: number): Orderbook {
  const rng = seededRng(hashCode(pairId) + 500);
  const asks: OrderbookLevel[] = [];
  const bids: OrderbookLevel[] = [];
  let askPrice = basePrice * 1.0008;
  let bidPrice = basePrice * 0.9992;
  let askTotal = 0;
  let bidTotal = 0;

  for (let i = 0; i < 16; i++) {
    const amt = rng() * 9 + 0.25;
    askTotal += amt;
    asks.push({ price: askPrice, amount: amt, total: askTotal });
    askPrice *= 1 + rng() * 0.0018;
  }
  for (let i = 0; i < 16; i++) {
    const amt = rng() * 9 + 0.25;
    bidTotal += amt;
    bids.push({ price: bidPrice, amount: amt, total: bidTotal });
    bidPrice *= 1 - rng() * 0.0018;
  }

  return { pairId, bids, asks, spread: asks[0].price - bids[0].price, lastUpdated: new Date().toISOString() };
}

// ─── Caches ───────────────────────────────────────────────────────
const _candleCache: Record<string, Candle[]> = {};
const _tradeCache: Record<string, RecentTrade[]> = {};
const _bookCache: Record<string, Orderbook> = {};

export function getCachedCandles(pairId: string, basePrice: number): Candle[] {
  if (!_candleCache[pairId]) _candleCache[pairId] = generateCandles(basePrice, 100, hashCode(pairId));
  return _candleCache[pairId];
}
export function getCachedTrades(pairId: string, basePrice: number): RecentTrade[] {
  if (!_tradeCache[pairId]) _tradeCache[pairId] = generateRecentTrades(basePrice, 30, hashCode(pairId));
  return _tradeCache[pairId];
}
export function getCachedOrderbook(pairId: string, basePrice: number): Orderbook {
  if (!_bookCache[pairId]) _bookCache[pairId] = generateOrderbook(pairId, basePrice);
  return _bookCache[pairId];
}

// ─── Token color palette ──────────────────────────────────────────
export const TOKEN_COLORS: Record<string, string> = {
  BTC:  '#f7931a', ETH:  '#627eea', BNB:  '#f3ba2f', SOL:  '#9945ff',
  ARB:  '#12aaff', PEPE: '#38a169', WIF:  '#e94f7b', JUP:  '#16c784',
  RNDR: '#6d4aff', BONK: '#ff6b00', USDT: '#26a17b', USDC: '#2775ca',
  WETH: '#627eea', WBNB: '#f3ba2f',
};

export function tokenColor(symbol: string): string {
  return TOKEN_COLORS[symbol.toUpperCase()] ?? '#6366f1';
}

// ─── Extended Pairs List ──────────────────────────────────────────
export const MOCK_PAIRS: Pair[] = [
  {
    id: '1', pairAddress: '0xBTC', dexName: 'Uniswap v3',
    baseToken: { address: '0x1', name: 'Bitcoin', symbol: 'BTC', logo: '' },
    quoteToken: { address: '0x2', name: 'Tether USD', symbol: 'USDT', logo: '' },
    price: 67234.5, priceChange24h: 2.4, volume24h: 1_240_000_000, liquidity: 890_000_000, low24h: 65000, high24h: 68000, trendingScore: calculateTrendingScore(1_240_000_000, 890_000_000, 2.4),
    logoUrl: '', createdAt: '2024-01-01T00:00:00Z', updatedAt: new Date().toISOString(),
  },
  {
    id: '2', pairAddress: '0xETH', dexName: 'Uniswap v3',
    baseToken: { address: '0x3', name: 'Ethereum', symbol: 'ETH', logo: '' },
    quoteToken: { address: '0x4', name: 'Tether USD', symbol: 'USDT', logo: '' },
    price: 3456.78, priceChange24h: 1.8, volume24h: 890_000_000, liquidity: 650_000_000, low24h: 3300, high24h: 3500, trendingScore: calculateTrendingScore(890_000_000, 650_000_000, 1.8),
    logoUrl: '', createdAt: '2024-01-01T00:00:00Z', updatedAt: new Date().toISOString(),
  },
  {
    id: '3', pairAddress: '0xSOL', dexName: 'Raydium',
    baseToken: { address: '0x5', name: 'Solana', symbol: 'SOL', logo: '' },
    quoteToken: { address: '0x6', name: 'Tether USD', symbol: 'USDT', logo: '' },
    price: 189.56, priceChange24h: 5.2, volume24h: 678_000_000, liquidity: 420_000_000, low24h: 180, high24h: 195, trendingScore: calculateTrendingScore(678_000_000, 420_000_000, 5.2),
    logoUrl: '', createdAt: '2024-03-01T00:00:00Z', updatedAt: new Date().toISOString(),
  },
  {
    id: '4', pairAddress: '0xBNB', dexName: 'PancakeSwap',
    baseToken: { address: '0x7', name: 'BNB', symbol: 'BNB', logo: '' },
    quoteToken: { address: '0x8', name: 'Tether USD', symbol: 'USDT', logo: '' },
    price: 412.34, priceChange24h: -0.8, volume24h: 456_000_000, liquidity: 310_000_000, low24h: 405, high24h: 420, trendingScore: calculateTrendingScore(456_000_000, 310_000_000, -0.8),
    logoUrl: '', createdAt: '2024-01-01T00:00:00Z', updatedAt: new Date().toISOString(),
  },
  {
    id: '5', pairAddress: '0xARB', dexName: 'Uniswap v3',
    baseToken: { address: '0x9', name: 'Arbitrum', symbol: 'ARB', logo: '' },
    quoteToken: { address: '0xa', name: 'Tether USD', symbol: 'USDT', logo: '' },
    price: 1.234, priceChange24h: -2.1, volume24h: 234_000_000, liquidity: 145_000_000, low24h: 1.20, high24h: 1.25, trendingScore: calculateTrendingScore(234_000_000, 145_000_000, -2.1),
    logoUrl: '', createdAt: '2024-02-15T00:00:00Z', updatedAt: new Date().toISOString(),
  },
  {
    id: '6', pairAddress: '0xPEPE', dexName: 'Uniswap v2',
    baseToken: { address: '0xb', name: 'Pepe', symbol: 'PEPE', logo: '' },
    quoteToken: { address: '0xc', name: 'Wrapped Ether', symbol: 'WETH', logo: '' },
    price: 0.00002341, priceChange24h: 125.5, volume24h: 15_000_000, liquidity: 5_200_000, low24h: 0.000020, high24h: 0.000025, trendingScore: calculateTrendingScore(15_000_000, 5_200_000, 125.5),
    logoUrl: '', createdAt: '2024-04-01T00:00:00Z', updatedAt: new Date().toISOString(),
  },
  {
    id: '7', pairAddress: '0xWIF', dexName: 'Raydium',
    baseToken: { address: '0xd', name: 'dogwifhat', symbol: 'WIF', logo: '' },
    quoteToken: { address: '0xe', name: 'Solana', symbol: 'SOL', logo: '' },
    price: 2.456, priceChange24h: 88.7, volume24h: 32_000_000, liquidity: 12_000_000, low24h: 2.1, high24h: 2.6, trendingScore: calculateTrendingScore(32_000_000, 12_000_000, 88.7),
    logoUrl: '', createdAt: '2024-04-01T00:00:00Z', updatedAt: new Date().toISOString(),
  },
  {
    id: '8', pairAddress: '0xJUP', dexName: 'Orca',
    baseToken: { address: '0xf', name: 'Jupiter', symbol: 'JUP', logo: '' },
    quoteToken: { address: '0x10', name: 'Solana', symbol: 'SOL', logo: '' },
    price: 0.85, priceChange24h: 42.1, volume24h: 8_000_000, liquidity: 3_100_000, low24h: 0.8, high24h: 0.9, trendingScore: calculateTrendingScore(8_000_000, 3_100_000, 42.1),
    logoUrl: '', createdAt: '2024-04-01T00:00:00Z', updatedAt: new Date().toISOString(),
  },
  {
    id: '9', pairAddress: '0xRNDR', dexName: 'Uniswap v3',
    baseToken: { address: '0x11', name: 'Render', symbol: 'RNDR', logo: '' },
    quoteToken: { address: '0x12', name: 'USD Coin', symbol: 'USDC', logo: '' },
    price: 7.82, priceChange24h: 15.3, volume24h: 18_000_000, liquidity: 7_800_000, low24h: 7.5, high24h: 8.0, trendingScore: calculateTrendingScore(18_000_000, 7_800_000, 15.3),
    logoUrl: '', createdAt: '2024-03-10T00:00:00Z', updatedAt: new Date().toISOString(),
  },
  {
    id: '10', pairAddress: '0xBONK', dexName: 'Raydium',
    baseToken: { address: '0x13', name: 'Bonk', symbol: 'BONK', logo: '' },
    quoteToken: { address: '0x14', name: 'Wrapped Ether', symbol: 'WETH', logo: '' },
    price: 0.0000312, priceChange24h: 201.2, volume24h: 11_000_000, liquidity: 4_200_000, low24h: 0.000025, high24h: 0.000035, trendingScore: calculateTrendingScore(11_000_000, 4_200_000, 201.2),
    logoUrl: '', createdAt: '2024-04-01T00:00:00Z', updatedAt: new Date().toISOString(),
  },
];

// Pre-attach sparklines to pairs (lazy-init per pair)
const _sparklineCache: Record<string, number[]> = {};
export function getPairSparkline(pair: Pair): number[] {
  if (!_sparklineCache[pair.id])
    _sparklineCache[pair.id] = generateSparkline(pair.price, pair.priceChange24h, hashCode(pair.id));
  return _sparklineCache[pair.id];
}

// Calculate trending score like professional DEXes (0-100 scale)
function calculateTrendingScore(volume24h: number, liquidity: number, priceChange24h: number): number {
  // Base score from volume (log scale to handle large ranges)
  const volumeScore = Math.min(Math.log10(Math.max(volume24h, 1)) * 10, 50);
  
  // Liquidity score (log scale)
  const liquidityScore = Math.min(Math.log10(Math.max(liquidity, 1)) * 8, 30);
  
  // Price change boost (positive changes increase score, negative slightly decrease)
  const priceChangeScore = Math.max(-10, Math.min(20, priceChange24h * 0.5));
  
  // Combine scores and clamp to 0-100
  const totalScore = volumeScore + liquidityScore + priceChangeScore;
  return Math.max(0, Math.min(100, totalScore));
}

export function normalizeApiPair(p: any): Pair {
  let baseToken = { address: '', name: '', symbol: '', logo: '' };
  let quoteToken = { address: '', name: '', symbol: '', logo: '' };

  if (typeof p.base_token === 'string') {
    try { baseToken = JSON.parse(p.base_token); } catch {}
  } else if (typeof p.base_token === 'object') {
    baseToken = p.base_token;
  }

  if (typeof p.quote_token === 'string') {
    try { quoteToken = JSON.parse(p.quote_token); } catch {}
  } else if (typeof p.quote_token === 'object') {
    quoteToken = p.quote_token;
  }

  // Extract detailed token info from base_token_info and quote_token_info
  let baseTokenInfo = null;
  let quoteTokenInfo = null;

  if (typeof p.base_token_info === 'string') {
    try { baseTokenInfo = JSON.parse(p.base_token_info); } catch {}
  } else if (typeof p.base_token_info === 'object') {
    baseTokenInfo = p.base_token_info;
  }

  if (typeof p.quote_token_info === 'string') {
    try { quoteTokenInfo = JSON.parse(p.quote_token_info); } catch {}
  } else if (typeof p.quote_token_info === 'object') {
    quoteTokenInfo = p.quote_token_info;
  }

  // Merge detailed info into baseToken
  if (baseTokenInfo) {
    baseToken = {
      ...baseToken,
      decimals: baseTokenInfo.decimals ?? baseToken.decimals,
      website: baseTokenInfo.websites?.[0] || baseToken.website,
      links: {
        homepage: baseTokenInfo.websites || [],
        twitter_screen_name: baseTokenInfo.twitter_handle,
        telegram_channel_identifier: baseTokenInfo.telegram_handle,
        discord_url: baseTokenInfo.discord_url,
        ...baseToken.links,
      },
      about: baseTokenInfo.description || baseToken.about,
    };
  }

  // Merge detailed info into quoteToken
  if (quoteTokenInfo) {
    quoteToken = {
      ...quoteToken,
      decimals: quoteTokenInfo.decimals ?? quoteToken.decimals,
      website: quoteTokenInfo.websites?.[0] || quoteToken.website,
      links: {
        homepage: quoteTokenInfo.websites || [],
        twitter_screen_name: quoteTokenInfo.twitter_handle,
        telegram_channel_identifier: quoteTokenInfo.telegram_handle,
        discord_url: quoteTokenInfo.discord_url,
        ...quoteToken.links,
      },
      about: quoteTokenInfo.description || quoteToken.about,
    };
  }

  let poolAddr = p.pool_address || p.pair_address || '';
  if (!poolAddr && p.id) {
    const parts = p.id.split('_');
    if (parts.length >= 2) poolAddr = parts[1];
  }

  // Extract values from API response (already normalized by backend)
  const volume24hStr = p.volume_24h || p.volume24h || '0';
  const liquidityStr = p.liquidity || '0';
  
  // Parse as floats directly (backend already normalized)
  const volume24hHuman = parseFloat(volume24hStr) || 0;
  const liquidityHuman = parseFloat(liquidityStr) || 0;
  const priceChange = parseFloat(p.price_change_24h ?? p.priceChange24h) || 0;

  // Calculate professional trending score
  const calculatedScore = calculateTrendingScore(volume24hHuman, liquidityHuman, priceChange);
  const low24hValue = parseFloat(p.low_24h ?? p.low24h ?? p.price_low_24h ?? p.priceLow24h) || 0;
  const high24hValue = parseFloat(p.high_24h ?? p.high24h ?? p.price_high_24h ?? p.priceHigh24h) || 0;

  return {
    id: p.id,
    pairAddress: poolAddr,
    network: p.network || '',
    dexName: p.dex_name || p.dex || p.dexName || '',
    baseToken,
    quoteToken,
    price: parseFloat(p.price) || 0,
    priceUSD: parseFloat(p.price_usd) || undefined,
    priceChange24h: priceChange,
    volume24h: volume24hHuman,
    volume24hUSD: parseFloat(p.volume_24h_usd) || undefined,
    liquidity: liquidityHuman,
    liquidityUSD: parseFloat(p.liquidity_usd) || undefined,
    marketCap: parseFloat(p.market_cap) || parseFloat(p.market_cap_usd) || undefined,
    marketCapUSD: parseFloat(p.market_cap_usd) || parseFloat(p.market_cap) || undefined,
    low24h: low24hValue,
    high24h: high24hValue,
    priceLow24h: low24hValue,
    priceHigh24h: high24hValue,
    trendingScore: typeof p.trending_score === 'number'
      ? p.trending_score
      : parseFloat(p.trending_score) || calculatedScore,
    logoUrl: p.logoUrl || p.logo_url || baseToken.logo || '',
    createdAt: p.created_at || p.createdAt || new Date().toISOString(),
    updatedAt: p.updated_at || p.updatedAt || new Date().toISOString(),
    lastTradeAt: p.last_trade_at || p.lastTradeAt,
  };
}

// ─── API Functions for fetching real pairs from server ────────────────
const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : 'http://localhost:8080/api/v1';

export async function fetchPairsFromAPI(network?: string): Promise<Pair[]> {
  try {
    const url = network ? `${API_BASE}/pairs?network=${network}` : `${API_BASE}/pairs`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch pairs: ${response.status} ${response.statusText}`);
    const rawPairs = await response.json();
    
    const pairsArray = Array.isArray(rawPairs) ? rawPairs : (rawPairs.data || []);
    
    if (!Array.isArray(pairsArray)) {
      console.error('Unexpected response format:', rawPairs);
      return [];
    }

    const normalized = pairsArray.map(normalizeApiPair);
    return normalized;
  } catch (error) {
    console.error('Error fetching pairs from API:', error);
    return [];
  }
}

export async function fetchTrendingPairsFromAPI(): Promise<Pair[]> {
  try {
    const response = await fetch(`${API_BASE}/pairs/trending`);
    if (!response.ok) throw new Error('Failed to fetch trending pairs');
    const rawPairs = await response.json();
    const pairsArray = Array.isArray(rawPairs) ? rawPairs : (rawPairs.data || rawPairs);
    if (!Array.isArray(pairsArray)) {
      console.error('Unexpected response format:', rawPairs);
      return MOCK_PAIRS;
    }
    return pairsArray.map(normalizeApiPair);
  } catch (error) {
    console.error('Error fetching trending pairs from API:', error);
    return MOCK_PAIRS;
  }
}
