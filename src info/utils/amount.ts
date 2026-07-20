import type { Token } from '../types';
import { createPublicClient, http } from 'viem';
import { bsc, base } from 'viem/chains';
import { Connection, PublicKey } from '@solana/web3.js';
import { getRpcUrl, Network } from './contracts';

const _tokenDecimalsCache: Record<string, number> = {};

const SOLANA_RPC_URL = 'https://mainnet.helius-rpc.com/?api-key=1bc62453-705c-40ea-81d7-37fea004e5fa';

export async function fetchTokenDecimals(tokenAddress: string, network: Network): Promise<number> {
  if (!tokenAddress) return 18;
  const key = `${network}:${tokenAddress}`.toLowerCase();
  if (_tokenDecimalsCache[key] !== undefined) {
    console.debug('[fetchTokenDecimals] cache hit', key, _tokenDecimalsCache[key]);
    return _tokenDecimalsCache[key];
  }

  try {
    if (network === 'solana') {
      const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
      const publicKey = new PublicKey(tokenAddress);
      const info = await connection.getParsedAccountInfo(publicKey);
      const decimals = Number((info.value as any)?.data?.parsed?.info?.decimals);
      if (!Number.isNaN(decimals)) {
        _tokenDecimalsCache[key] = decimals;
        console.debug('[fetchTokenDecimals] fetched', key, network, decimals);
        return decimals;
      }

      console.debug('[fetchTokenDecimals] defaulting decimals for Solana token', key);
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