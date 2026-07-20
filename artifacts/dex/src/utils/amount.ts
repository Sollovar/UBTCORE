import type { Token } from '../types';
import { createPublicClient, http } from 'viem';
import { bsc, base } from 'viem/chains';
import { Connection, PublicKey } from '@solana/web3.js';
import { getSolanaRpcUrls, Network, getRpcUrl } from './contracts';

const _tokenDecimalsCache: Record<string, number> = {};

// Well-known SPL token decimals — avoids RPC calls for common tokens
const KNOWN_SPL_DECIMALS: Record<string, number> = {
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 6,  // USDC
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 6,  // USDT
  'So11111111111111111111111111111111111111112':   9,  // Wrapped SOL
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': 9,  // mSOL
  '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs': 8,  // ETH (Wormhole)
  '9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E': 6,  // BTC (Wormhole)
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 5,  // BONK
};

export async function fetchTokenDecimals(tokenAddress: string, network: Network): Promise<number> {
  if (!tokenAddress) return 18;
  const key = `${network}:${tokenAddress}`.toLowerCase();
  if (_tokenDecimalsCache[key] !== undefined) {
    return _tokenDecimalsCache[key];
  }

  try {
    if (network === 'solana') {
      // Check well-known decimals first — avoids any RPC call
      if (KNOWN_SPL_DECIMALS[tokenAddress] !== undefined) {
        const d = KNOWN_SPL_DECIMALS[tokenAddress];
        _tokenDecimalsCache[key] = d;
        return d;
      }

      // Try each RPC in order (Helius first)
      const rpcUrls = getSolanaRpcUrls();
      for (const rpcUrl of rpcUrls) {
        try {
          const connection = new Connection(rpcUrl, 'confirmed');
          const publicKey = new PublicKey(tokenAddress);
          const info = await connection.getParsedAccountInfo(publicKey);
          const decimals = Number((info.value as any)?.data?.parsed?.info?.decimals);
          if (!Number.isNaN(decimals)) {
            _tokenDecimalsCache[key] = decimals;
            return decimals;
          }
          break; // got a response, just no decimals field
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes('403') || msg.includes('rate') || msg.includes('forbidden')) {
            continue; // try next RPC
          }
          throw err;
        }
      }

      _tokenDecimalsCache[key] = 9;
      return 9;
    }

    const chain = network === 'bsc' ? bsc : base;
    const rpcUrl = getRpcUrl(network);

    const publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });

    const decimals = await publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: [{
        inputs: [],
        name: 'decimals',
        outputs: [{ type: 'uint8' }],
        stateMutability: 'view',
        type: 'function',
      }],
      functionName: 'decimals',
    });

    const decNum = Number(decimals);
    _tokenDecimalsCache[key] = decNum;
    console.debug('[fetchTokenDecimals] fetched', key, network, decNum);
    return decNum;
  } catch (error) {
    console.error('[fetchTokenDecimals] failed', tokenAddress, network, error);
    return network === 'solana' ? 9 : 18;
  }
}

export function toWei(amount: string, decimals: number = 18): string {
  if (!amount || amount === '') return '0';
  
  const parts = amount.split('.');
  let integerPart = parts[0];
  let decimalPart = parts[1] || '';
  
  // Remove leading zeros
  integerPart = integerPart.replace(/^0+/, '') || '0';
  
  // Pad or truncate decimal part
  if (decimalPart.length > decimals) {
    decimalPart = decimalPart.slice(0, decimals);
  } else if (decimalPart.length < decimals) {
    decimalPart = decimalPart.padEnd(decimals, '0');
  }
  
  // Combine integer and decimal parts
  if (decimalPart) {
    return integerPart + decimalPart;
  }
  
  // If no decimals, multiply by 10^decimals
  return integerPart + '0'.repeat(decimals);
}

export function fromWei(amount: string, decimals: number = 18): string {
  if (!amount || amount === '0') return '0';
  
  // Ensure we have enough digits
  const padded = amount.padStart(decimals, '0');
  
  // Split into integer and decimal parts
  const intPart = padded.slice(0, -decimals) || '0';
  let decPart = padded.slice(-decimals);
  
  // Remove trailing zeros from decimal part
  decPart = decPart.replace(/0+$/, '');
  
  if (decPart) {
    return `${intPart}.${decPart}`;
  }
  
  return intPart;
}

export function formatAmount(amount: string, decimals: number = 18, displayDecimals: number = 4): string {
  const humanReadable = fromWei(amount, decimals);
  const num = parseFloat(humanReadable);
  
  if (isNaN(num)) return '0';
  
  // Format with appropriate precision
  if (num === 0) return '0';
  
  if (num < 0.0001) {
    return num.toExponential(2);
  }
  
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'M';
  }
  
  if (num >= 1000) {
    return (num / 1000).toFixed(2) + 'K';
  }
  
  return num.toFixed(displayDecimals).replace(/\.?0+$/, '');
}

export function getTokenDecimals(token: Token | undefined): number {
  if (!token) return 18;
  return token.decimals ?? 18;
}

export function parseAmount(value: string): string {
  // Remove commas and trim
  const cleaned = value.replace(/,/g, '').trim();
  
  // Handle empty or invalid input
  if (!cleaned || cleaned === '' || isNaN(parseFloat(cleaned))) {
    return '0';
  }
  
  return cleaned;
}