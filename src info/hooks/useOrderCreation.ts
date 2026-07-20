import { useState, useCallback, useEffect } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { createOrder, cancelOrder, getUserOrders } from '../services/orderbook';
import { getSettlementAddress, Network, getRpcUrl } from '../utils/contracts';
import { signOrder, signLadderAuth, approveToken, checkTokenApproval, clearApprovalCache, WalletClient, PublicClient } from '../utils/orderSigning';
import { fetchTokenDecimals, toWei } from '../utils/amount';
import { useStore } from '../stores/useStore';
import { addCachedUserOrderHash, addCachedUserOrderRef } from './useFillNotifications';
import { createPublicClient, http, keccak256, encodePacked } from 'viem';
import { bsc, base } from 'viem/chains';
import type { Order } from '../types';

// Token decimals cache to avoid repeated contract calls
const _tokenDecimalsCache: Record<string, number> = {};

function base64EncodeBytes(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function normalizeSolanaSignature(rawSignature: unknown): string {
  if (rawSignature instanceof Uint8Array) {
    return base64EncodeBytes(rawSignature);
  }

  if (Array.isArray(rawSignature)) {
    return base64EncodeBytes(new Uint8Array(rawSignature));
  }

  if (rawSignature && typeof rawSignature === 'object') {
    const signatureValue = (rawSignature as any).signature;
    if (signatureValue instanceof Uint8Array) {
      return base64EncodeBytes(signatureValue);
    }
    if (Array.isArray(signatureValue)) {
      return base64EncodeBytes(new Uint8Array(signatureValue));
    }
    if (typeof signatureValue === 'string') {
      return signatureValue;
    }
  }

  if (typeof rawSignature === 'string') {
    return rawSignature;
  }

  throw new Error('Unsupported Solana signature format');
}

async function getSolanaSignerClient(primaryWallet: any): Promise<any> {
  if (!primaryWallet) return null;

  const candidateClients: any[] = [];
  if (typeof primaryWallet.getWalletClient === 'function') {
    try {
      const walletClient = await primaryWallet.getWalletClient();
      candidateClients.push(walletClient);
    } catch (err) {
      // ignore and try primaryWallet directly
    }
  }

  candidateClients.push(primaryWallet);

  for (const client of candidateClients) {
    if (!client) continue;

    if (typeof client.getSigner === 'function') {
      const signer = await client.getSigner();
      if (signer) return signer;
    }

    if (typeof client.signMessage === 'function') {
      return client;
    }
  }

  return null;
}

function getSolanaAddress(client: any): string | undefined {
  if (!client) return undefined;
  if (typeof client.account?.address === 'string') return client.account.address;
  if (typeof client.address === 'string') return client.address;
  if (client?.publicKey?.toString && typeof client.publicKey.toString === 'function') return client.publicKey.toString();
  return undefined;
}

async function fetchTokenDecimalsFromContract(tokenAddress: string, network: Network): Promise<number> {
  const cacheKey = `${network}:${tokenAddress}`.toLowerCase();
  if (_tokenDecimalsCache[cacheKey] !== undefined) {
    return _tokenDecimalsCache[cacheKey];
  }

  try {
    const decimals = await fetchTokenDecimals(tokenAddress, network);
    _tokenDecimalsCache[cacheKey] = decimals;
    return decimals;
  } catch (e) {
    console.error(`Failed to fetch token decimals for ${tokenAddress}:`, e);
    return network === 'solana' ? 9 : 18;
  }
}

export interface OrderParams {
  pairId: string;
  side: 'buy' | 'sell';
  orderType: 'limit' | 'market' | 'take_profit' | 'stop_loss';
  price: string;
  amount: string;
  network: Network;
  receiver?: string;
  nonce?: string;
  advanced?: 'none' | 'postOnly' | 'takeProfit' | 'stopLoss';
  triggerPrice?: string;
  expiration?: number;
  isLadder?: boolean;
  ladderConfig?: {
    priceStart: string;
    priceEnd: string;
    levels: number;
  };
  onBackendConfirm?: (success: boolean) => void;
  onOrderCreated?: (order: any) => void;
  depositMemo?: string;
  depositAmount?: string;
  depositType?: 'sol' | 'spl';
  depositTokenMint?: string;
  depositTxHash?: string;
}

export interface OrderResult {
  success: boolean;
  orderId?: string;
  error?: string;
}

export function useOrderCreation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { primaryWallet } = useDynamicContext();
  const pairs = useStore(s => s.pairs);
  const setUserOrders = useStore(s => s.setUserOrders);
  const walletAddress = useStore(s => s.walletAddress);

  const getPairDecimals = useCallback(async (pairId: string, network: Network) => {
    const pair = pairs.find(p => p.id === pairId);
    
    if (!pair) {
      return { baseDecimals: 18, quoteDecimals: 18 };
    }
    
    const baseTokenAddress = pair.baseToken?.address || '';
    const quoteTokenAddress = pair.quoteToken?.address || '';
    
    if (!baseTokenAddress || !quoteTokenAddress) {
      return { baseDecimals: 18, quoteDecimals: 18 };
    }
    
    const [baseDec, quoteDec] = await Promise.all([
      fetchTokenDecimalsFromContract(baseTokenAddress, network),
      fetchTokenDecimalsFromContract(quoteTokenAddress, network),
    ]);
    
    return {
      baseDecimals: baseDec,
      quoteDecimals: quoteDec,
    };
  }, [pairs]);

  const createOrderWithSignature = useCallback(async (params: OrderParams): Promise<OrderResult> => {
    if (!primaryWallet) {
      return { success: false, error: 'Wallet not connected' };
    }

    setLoading(true);
    setError(null);

    try {
      // Get wallet client - different handling for Solana vs EVM
      let walletClient: any;
      
      if (params.network === 'solana') {
        walletClient = await getSolanaSignerClient(primaryWallet);
      } else {
        walletClient = await (primaryWallet as any).getWalletClient();
      }

      if (!walletClient) {
        throw new Error('Failed to get wallet client');
      }

      // Resolve the user address correctly per network.
      // EVM wallets expose it via walletClient.account.address.
      // Solana wallets use a different shape, so we fall back to the
      // Solana-specific helper only for that network.
      let userAddress: string;
      if (params.network === 'solana') {
        userAddress = getSolanaAddress(walletClient) || (primaryWallet as any)?.address || (primaryWallet as any)?.publicKey?.toString();
        if (!userAddress) {
          throw new Error('Solana wallet address not available');
        }
      } else {
        // EVM: walletClient is a standard viem WalletClient
        userAddress = walletClient.account?.address;
        if (!userAddress) {
          throw new Error('EVM wallet address not available');
        }
      }
      const receiverAddress = params.receiver || userAddress;
      
      const { baseDecimals, quoteDecimals } = await getPairDecimals(params.pairId, params.network);
      
      const tokenInDecimals = params.side === 'buy' ? quoteDecimals : baseDecimals;
      const tokenOutDecimals = params.side === 'buy' ? baseDecimals : quoteDecimals;

      const pair = pairs.find(p => p.id === params.pairId);
      const baseTokenAddress = pair?.baseToken?.address || '';
      const quoteTokenAddress = pair?.quoteToken?.address || '';
      
      const tokenIn = params.side === 'buy' ? quoteTokenAddress : baseTokenAddress;
      const tokenOut = params.side === 'sell' ? quoteTokenAddress : baseTokenAddress;

      const priceNum = parseFloat(params.price);
      const amountNum = parseFloat(params.amount);

      let amountInWei: string;
      let amountOutMinWei: string;
      
      // For ladder orders, we need special handling
      const isLadder = params.isLadder && params.ladderConfig;
      
      if (params.side === 'buy') {
        if (isLadder && params.ladderConfig) {
          const levels = params.ladderConfig.levels;
          const priceStart = parseFloat(params.ladderConfig.priceStart);
          const priceEnd = parseFloat(params.ladderConfig.priceEnd);
          const priceStep = (priceEnd - priceStart) / (levels - 1);
          
          const amountPerLevel = amountNum / levels;
          let totalBaseTokens = 0;
          for (let i = 0; i < levels; i++) {
            const levelPrice = i === levels - 1 ? priceEnd : priceStart + (priceStep * i);
            totalBaseTokens += amountPerLevel / levelPrice;
          }
          
          amountInWei = toWei(params.amount, quoteDecimals);
          amountOutMinWei = toWei(totalBaseTokens.toFixed(baseDecimals), baseDecimals);
        } else {
          amountOutMinWei = toWei(params.amount, baseDecimals);
          const amountInQuote = amountNum * priceNum;
          amountInWei = toWei(amountInQuote.toFixed(quoteDecimals), quoteDecimals);
        }
      } else {
        amountInWei = toWei(params.amount, baseDecimals);
        const amountOutNum = amountNum * priceNum;
        amountOutMinWei = toWei(amountOutNum.toFixed(quoteDecimals), quoteDecimals);
      }

      // expirationTime, nonce, and salt are declared inside each network branch below
      // so that the values used for signing are guaranteed to be the same values
      // sent in the order payload. Declaring them here and re-declaring inside the
      // EVM block caused the outer (Solana-path) values to be used in orderPayload
      // while signOrder used the inner (EVM-path) values → BadSignature on BSC/Base.
      let expirationTime: number;
      let nonce: number;
      let salt: number;

      let orderSignature: string;
      let orderHash: string;

      if (params.network === 'solana') {
        if (!walletClient.signMessage) {
          throw new Error('Solana wallet not connected or does not support signing');
        }

        expirationTime = Math.floor(Date.now() / 1000) + (params.expiration || 20) * 60;
        nonce = params.nonce ? parseInt(params.nonce) : Math.floor(Math.random() * 1000000);
        salt = Math.floor(Math.random() * 1000000);

        const orderData = {
          maker: userAddress,
          tokenIn,
          tokenOut,
          amountIn: amountInWei,
          amount: params.side === 'buy' ? amountOutMinWei : amountInWei,
          amountOutMin: amountOutMinWei,
          expiration: expirationTime,
          nonce,
          receiver: receiverAddress,
          salt,
        };

        const encodedMessage = new TextEncoder().encode(JSON.stringify(orderData, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)));
        const rawSignature: any = await walletClient.signMessage(encodedMessage);
        orderSignature = normalizeSolanaSignature(rawSignature);

        orderHash = '';
      } else {
        const settlementAddress = getSettlementAddress(params.network);
        const chain = params.network === 'bsc' ? bsc : base;
        const rpcUrl = getRpcUrl(params.network);
        const publicClient = createPublicClient({
          chain,
          transport: http(rpcUrl),
        }) as PublicClient;

        const amountInForApproval = BigInt(amountInWei);
        const hasApproval = await checkTokenApproval(tokenIn, settlementAddress, userAddress, publicClient, amountInForApproval);

        if (!hasApproval) {
          clearApprovalCache(userAddress, tokenIn, settlementAddress);
          await approveToken(tokenIn, settlementAddress, undefined, walletClient as any);
          await new Promise(resolve => setTimeout(resolve, 2000));
          clearApprovalCache(userAddress, tokenIn, settlementAddress);
        }

        expirationTime = Math.floor(Date.now() / 1000) + (params.expiration || 20) * 60;
        nonce = params.nonce ? parseInt(params.nonce) : Math.floor(Math.random() * 1000000);
        salt = Math.floor(Math.random() * 1000000);

        const orderData = {
          maker: userAddress,
          tokenIn,
          tokenOut,
          amountIn: amountInWei,
          amount: params.side === 'buy' ? amountOutMinWei : amountInWei,
          amountOutMin: amountOutMinWei,
          expiration: expirationTime,
          nonce,
          // Use receiverAddress (defaults to userAddress) so the signed receiver
          // matches exactly what gets stored in the DB and passed to the contract.
          receiver: receiverAddress,
          salt,
        };

        if (isLadder && params.ladderConfig) {
          const ladderAuthData = {
            maker: userAddress,
            tokenIn,
            tokenOut,
            totalAmount: amountInWei,
            priceStart: params.ladderConfig.priceStart,
            priceEnd: params.ladderConfig.priceEnd,
            levels: params.ladderConfig.levels,
            expiration: expirationTime,
            nonce,
            salt,
          };

          const signedLadderAuth = await signLadderAuth(params.network, ladderAuthData, walletClient as any);
          orderSignature = signedLadderAuth.signature;
          orderHash = signedLadderAuth.ladderAuthHash;
        } else {
          const signedOrder = await signOrder(params.network, orderData, walletClient as any);
          orderSignature = signedOrder.signature;
          orderHash = signedOrder.orderHash;
        }
      }

      const orderPayload: any = {
        order_hash: orderHash,
        pair_id: params.pairId,
        side: params.side,
        order_type: params.advanced === 'postOnly' ? 'post_only' : params.orderType,
        price: params.price,
        // amount = base token amount (what's being bought/sold)
        // For BUY: amountOutMinWei is the base token amount (SIREN)
        // For SELL: amountInWei is the base token amount (SIREN)
        amount: params.side === 'buy' ? amountOutMinWei : amountInWei,
        // amount_in = tokenIn amount (what's being spent/sold)
        // For BUY: tokenIn = quote token (WBNB), so amountInWei is what they pay
        // For SELL: tokenIn = base token (SIREN), so amountInWei is what they sell
        amount_in: amountInWei,
        network: params.network,
        token_in: tokenIn,
        token_out: tokenOut,
        nonce: nonce,
        salt: salt,
        expiration: new Date(expirationTime * 1000).toISOString(),
        is_ladder: params.isLadder || false,
        ladder_config: params.ladderConfig ? {
          price_start: params.ladderConfig.priceStart,
          price_end: params.ladderConfig.priceEnd,
          levels: params.ladderConfig.levels,
        } : null,
        trigger_price: params.triggerPrice || null,
        reduce_only: params.advanced === 'stopLoss',
        time_in_force: 'GTC',
        maker: userAddress,
        signature: orderSignature,
        amount_out_min: amountOutMinWei,
        deposit_memo: params.depositMemo || null,
        deposit_amount: params.depositAmount || null,
        deposit_type: params.depositType || null,
        deposit_token_mint: params.depositTokenMint || null,
        deposit_tx_hash: params.depositTxHash || null,
        amount_in_decimals: tokenInDecimals,
        amount_out_decimals: tokenOutDecimals,
      };
      if (receiverAddress) {
        orderPayload.receiver = receiverAddress;
      }

      // Create optimistic order for immediate UI update
      const optimisticOrder: any = {
        id: Date.now(), // Temporary ID
        orderHash: orderHash,
        pairId: params.pairId,
        side: params.side,
        orderType: params.advanced === 'postOnly' ? 'post_only' : params.orderType,
        price: parseFloat(params.price),
        amount: parseFloat(params.side === 'buy' ? amountOutMinWei : amountInWei),
        amountIn: parseFloat(amountInWei),
        network: params.network,
        tokenIn: tokenIn,
        tokenOut: tokenOut,
        receiver: params.receiver || null,
        nonce: nonce,
        salt: salt,
        expiration: new Date(expirationTime * 1000).toISOString(),
        isLadder: params.isLadder || false,
        ladderConfig: params.ladderConfig ? {
          priceStart: parseFloat(params.ladderConfig.priceStart),
          priceEnd: parseFloat(params.ladderConfig.priceEnd),
          levels: params.ladderConfig.levels,
        } : undefined,
        triggerPrice: params.triggerPrice ? parseFloat(params.triggerPrice) : undefined,
        reduceOnly: params.advanced === 'stopLoss',
        timeInForce: 'GTC',
        maker: userAddress,
        signature: orderSignature,
        amountOutMin: parseFloat(amountOutMinWei),
        depositMemo: params.depositMemo,
        depositAmount: params.depositAmount ? parseFloat(params.depositAmount) : undefined,
        depositType: params.depositType,
        depositTokenMint: params.depositTokenMint,
        depositTxHash: params.depositTxHash,
        tokenInDecimals: tokenInDecimals,
        tokenOutDecimals: tokenOutDecimals,
        status: 'pending' as const,
        filledAmount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Immediately update the UI with the optimistic order
      params.onOrderCreated?.(optimisticOrder);
      
      // Add to user orders immediately for better UX
      if (walletAddress) {
        setUserOrders((prev: Order[]) => [optimisticOrder, ...prev]);
      }

      // Wait for backend confirmation
      const order = await createOrder(orderPayload);

      // Update the optimistic order with real data
      const updatedOrder: Order = {
        ...optimisticOrder,
        id: order.id,
        status: order.status,
        filledAmount: order.filledAmount,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      };

      // Update the order in the store
      setUserOrders((prev: Order[]) => prev.map((o: Order) => o.id === updatedOrder.id ? updatedOrder : o));
      
      // Notify UI that backend has confirmed
      params.onBackendConfirm?.(true);

      // Cache the order hash for fill notifications
      addCachedUserOrderHash(userAddress, orderHash);

      // Cache the order reference for Matched event detection
      if (order.nonce !== undefined) {
        try {
          const orderRef = keccak256(
            encodePacked(
              ['address', 'uint256'],
              [userAddress as `0x${string}`, BigInt(order.nonce)]
            )
          );
          addCachedUserOrderRef(userAddress, orderRef);
        } catch (refError) {
          console.error('🔔 Failed to cache order ref:', refError);
        }
      }

      return {
        success: true,
        orderId: order.id, // Use actual order ID from backend
      };
    } finally {
      setLoading(false);
    }
  }, [primaryWallet, getPairDecimals, setUserOrders, walletAddress]);

  const cancelUserOrder = useCallback(async (orderId: string): Promise<OrderResult> => {
    setLoading(true);
    try {
      await cancelOrder(orderId);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to cancel order' };
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUserOrders = useCallback(async (address: string) => {
    try {
      return await getUserOrders(address);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      return [];
    }
  }, []);

  return {
    loading,
    error,
    createOrder: createOrderWithSignature,
    cancelOrder: cancelUserOrder,
    getUserOrders: fetchUserOrders,
  };
}
