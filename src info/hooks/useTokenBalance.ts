import { useState, useEffect, useCallback } from 'react';
import { createPublicClient, http, Chain } from 'viem';
import { Connection, PublicKey } from '@solana/web3.js';
import { Network, getRpcUrl } from '../utils/contracts';
import { formatInputNumber } from '../utils/formatters';

const bsc: Chain = {
  id: 56,
  name: 'BNB Smart Chain',
  nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://bsc-dataseed-public.bnbchain.org/'] },
    public: { http: ['https://bnb.rpc.subquery.network/public'] },
  },
  blockExplorers: {
    default: { name: 'BscScan', url: 'https://bscscan.com' },
  },
};

const base: Chain = {
  id: 8453,
  name: 'Base',
  nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://1rpc.io/base'] },
    public: { http: ['https://1rpc.io/base'] },
  },
  blockExplorers: {
    default: { name: 'BaseScan', url: 'https://basescan.org' },
  },
};

const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const NATIVE_TOKEN_DECIMALS = 18;
const WRAPPED_SOL_MINT = 'So11111111111111111111111111111111111111112';

interface TokenBalance {
  raw: bigint;
  formatted: string;
  decimals: number;
}

interface UseTokenBalanceResult {
  balance: TokenBalance | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useTokenBalance(
  tokenAddress: string | undefined,
  walletAddress: string | undefined,
  network: Network = 'bsc',
  decimals: number = 18
): UseTokenBalanceResult {
  const [balance, setBalance] = useState<TokenBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!tokenAddress || !walletAddress) {
      setBalance(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let tokenDecimals: number;
      let rawBalance: bigint;
      const normalizedAddress = tokenAddress.trim();
      const isNativeToken = normalizedAddress === '' ||
        normalizedAddress.toLowerCase() === '0x' ||
        normalizedAddress.toLowerCase() === '0x0000000000000000000000000000000000000000' ||
        (network === 'solana' && ['sol', 'solana', 'native'].includes(normalizedAddress.toLowerCase()));

      if (network === 'solana') {
        const connection = new Connection(getRpcUrl('solana'), 'confirmed');
        const owner = new PublicKey(walletAddress);

        if (isNativeToken) {
          const balance = await connection.getBalance(owner);
          rawBalance = BigInt(balance);
          tokenDecimals = 9;
        } else {
          const mint = new PublicKey(normalizedAddress);
          const tokenAccounts = await connection.getParsedTokenAccountsByOwner(owner, { mint });

          if (!tokenAccounts.value.length) {
            if (normalizedAddress === WRAPPED_SOL_MINT) {
              const balance = await connection.getBalance(owner);
              rawBalance = BigInt(balance);
              tokenDecimals = 9;
            } else {
              rawBalance = 0n;
              tokenDecimals = decimals ?? 9;
            }
          } else {
            rawBalance = tokenAccounts.value.reduce((sum, item) => {
              const tokenAmount = (item.account.data as any)?.parsed?.info?.tokenAmount;
              if (!tokenAmount?.amount) return sum;
              return sum + BigInt(tokenAmount.amount);
            }, 0n);

            const tokenAmount = (tokenAccounts.value[0].account.data as any)?.parsed?.info?.tokenAmount;
            tokenDecimals = tokenAmount?.decimals ?? decimals ?? 9;
          }
        }
      } else {
        const chainConfig = network === 'bsc' ? bsc : base;
        const publicClient = createPublicClient({
          chain: chainConfig,
          transport: http(getRpcUrl(network)),
        });

        if (isNativeToken) {
          rawBalance = await publicClient.getBalance({ address: walletAddress });
          tokenDecimals = NATIVE_TOKEN_DECIMALS;
        } else {
          tokenDecimals = await publicClient.readContract({
            address: tokenAddress as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'decimals',
          });
          rawBalance = await publicClient.readContract({
            address: tokenAddress as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [walletAddress],
          });
        }
      }

      const humanAmount = Number(rawBalance) / Math.pow(10, tokenDecimals);
      const formatted = formatInputNumber(humanAmount, Math.min(tokenDecimals, 6));

      setBalance({
        raw: rawBalance,
        formatted,
        decimals: tokenDecimals,
      });
    } catch (err) {
      console.error('[useTokenBalance] fetchBalance error', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch balance');
      setBalance(null);
    } finally {
      setLoading(false);
    }
  }, [tokenAddress, walletAddress, network, decimals]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return { balance, loading, error, refetch: fetchBalance };
}

interface UseBalancesResult {
  quoteBalance: TokenBalance | null;
  baseBalance: TokenBalance | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useBalances(
  baseTokenAddress: string,
  quoteTokenAddress: string,
  walletAddress: string | undefined,
  network: Network,
  baseTokenDecimals: number = 18,
  quoteTokenDecimals: number = 18
): UseBalancesResult {
  const {
    balance: baseBalance,
    loading: baseLoading,
    error: baseError,
    refetch: refetchBase,
  } = useTokenBalance(baseTokenAddress, walletAddress, network, baseTokenDecimals);

  const {
    balance: quoteBalance,
    loading: quoteLoading,
    error: quoteError,
    refetch: refetchQuote,
  } = useTokenBalance(quoteTokenAddress, walletAddress, network, quoteTokenDecimals);

  const loading = baseLoading || quoteLoading;
  const error = baseError || quoteError;

  const refetch = useCallback(() => {
    refetchBase();
    refetchQuote();
  }, [refetchBase, refetchQuote]);

  return { quoteBalance, baseBalance, loading, error, refetch };
}
