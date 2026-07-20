export const API_BASE_URL = import.meta.env.VITE_API_URL || '';
export const GECKO_TERMINAL_API = 'https://api.geckoterminal.com/api/v2';

export const SUPPORTED_DEXES = [
  { name: 'Uniswap', logo: '/dex/uniswap.png' },
  { name: 'PancakeSwap', logo: '/dex/pancakeswap.png' },
  { name: 'Raydium', logo: '/dex/raydium.png' },
  { name: 'Orca', logo: '/dex/orca.png' },
  { name: 'Jupiter', logo: '/dex/jupiter.png' },
  { name: 'Aerodrome', logo: '/dex/aerodrome.png' },
];

export const NETWORK = 'eth';
export const TRENDING_PAIRS_LIMIT = 50;
export const SYNC_INTERVAL = 5 * 60 * 1000;

// Blockchain explorer URLs by network
export const EXPLORER_URLS: Record<string, string> = {
  bsc: 'https://bscscan.com/tx',
  base: 'https://basescan.org/tx',
  solana: 'https://solscan.io/tx',
};

// Get explorer URL for a transaction
function normalizeTxHash(txHash?: string): string | undefined {
  if (!txHash) {
    return undefined;
  }
  const cleaned = txHash.trim();
  if (!cleaned) {
    return undefined;
  }
  const parts = cleaned.split(/[,;\s]+/).filter(Boolean);
  return parts.length > 0 ? parts[0] : undefined;
}

export function getExplorerUrl(txHash: string, network?: string): string {
  const normalizedHash = normalizeTxHash(txHash);
  const explorerBase = network ? EXPLORER_URLS[network] : EXPLORER_URLS['bsc'];
  return normalizedHash ? `${explorerBase}/${normalizedHash}` : '#';
}
