import { getSettlementAddress, Network } from '../utils/contracts';
import { keccak256, encodeAbiParameters, encodePacked, recoverAddress, toBytes } from 'viem';

export interface OrderData {
  maker: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amount: string;
  amountOutMin: string;
  expiration: number;
  nonce: number;
  receiver?: string;
  salt?: number;
}

export interface LadderAuthData {
  maker: string;
  tokenIn: string;
  tokenOut: string;
  totalAmount: string;
  priceStart: string;
  priceEnd: string;
  levels: number;
  expiration: number;
  nonce: number;
  salt?: number;
}

export interface SignedOrder extends OrderData {
  signature: string;
  orderHash: string;
}

export interface SignedLadderAuth {
  signature: string;
  ladderAuthHash: string;
}

export interface WalletClient {
  account: { address: string };
  chain?: { id: number };
  signTypedData?: (params: { domain: Record<string, unknown>; types: Record<string, unknown[]>; primaryType: string; message: Record<string, unknown> }) => Promise<string>;
  signMessage?: (message: Uint8Array) => Promise<string>;
  writeContract?: (params: { address: string; abi: unknown[]; functionName: string; args: unknown[] }) => Promise<string>;
  readContract?: (params: { address: string; abi: unknown[]; functionName: string; args: unknown[] }) => Promise<bigint>;
}

const EIP712_DOMAIN = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' },
] as const;

const ORDER_TYPE = [
  { name: 'maker', type: 'address' },
  { name: 'tokenIn', type: 'address' },
  { name: 'tokenOut', type: 'address' },
  { name: 'amountIn', type: 'uint256' },
  { name: 'amount', type: 'uint256' },
  { name: 'amountOutMin', type: 'uint256' },
  { name: 'expiration', type: 'uint256' },
  { name: 'nonce', type: 'uint256' },
  { name: 'receiver', type: 'address' },
  { name: 'salt', type: 'uint256' },
] as const;

const LADDER_AUTH_TYPE = [
  { name: 'maker', type: 'address' },
  { name: 'tokenIn', type: 'address' },
  { name: 'tokenOut', type: 'address' },
  { name: 'totalAmount', type: 'uint256' },
  { name: 'priceStart', type: 'uint256' },
  { name: 'priceEnd', type: 'uint256' },
  { name: 'levels', type: 'uint256' },
  { name: 'expiration', type: 'uint256' },
  { name: 'nonce', type: 'uint256' },
  { name: 'salt', type: 'uint256' },
] as const;

function scalePriceToFixedPoint(price: string): bigint {
  const [whole, fraction = ''] = price.split('.');
  const trimmedFraction = fraction.padEnd(8, '0').slice(0, 8);
  return BigInt(whole + trimmedFraction);
}

function hashOrderData(order: OrderData): string {
  return keccak256(
    encodeAbiParameters(
      ORDER_TYPE,
      [
        order.maker,
        order.tokenIn,
        order.tokenOut,
        BigInt(order.amountIn),
        BigInt(order.amount),
        BigInt(order.amountOutMin),
        BigInt(order.expiration),
        BigInt(order.nonce),
        order.receiver || '0x0000000000000000000000000000000000000000',
        BigInt(order.salt || 0),
      ]
    )
  );
}


function getDomainSeparator(chainId: bigint, verifyingContract: string): string {
  const nameHash = keccak256(toBytes('LadderSettlementHybrid'));
  const versionHash = keccak256(toBytes('1'));

  return keccak256(
    encodeAbiParameters(
      [
        { name: 'name', type: 'bytes32' },
        { name: 'version', type: 'bytes32' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ] as const,
      [
        nameHash,
        versionHash,
        chainId,
        verifyingContract as `0x${string}`,
      ]
    )
  );
}

function computeOrderHash(order: OrderData, chainId: bigint, verifyingContract: string): string {
  const domainSep = getDomainSeparator(chainId, verifyingContract);
  const orderDataHash = hashOrderData(order);

  return keccak256(
    encodePacked(
      ['bytes1', 'bytes32', 'bytes32'],
      ['0x19', domainSep, orderDataHash]
    )
  );
}

export async function signOrder(
  network: Network,
  order: OrderData,
  walletClient: WalletClient
): Promise<SignedOrder> {
  const expectedChainId = network === 'bsc' ? 56n : 8453n;
  const walletChainId = walletClient.chain?.id !== undefined ? BigInt(walletClient.chain.id) : expectedChainId;
  if (walletChainId !== expectedChainId) {
    throw new Error(
      `wallet chainId mismatch: connected=${walletChainId} expected=${expectedChainId} for network=${network}`
    );
  }

  const chainId = walletChainId;
  const verifyingContract = getSettlementAddress(network) as `0x${string}`;

  const domain = {
    name: 'LadderSettlementHybrid',
    version: '1',
    chainId,
    verifyingContract,
  };

  const types = {
    EIP712Domain: EIP712_DOMAIN,
    Order: ORDER_TYPE,
  };

  const salt = BigInt(order.salt !== undefined ? order.salt : Math.floor(Math.random() * 1000000));
  const message = {
    maker: order.maker,
    tokenIn: order.tokenIn,
    tokenOut: order.tokenOut,
    amountIn: BigInt(order.amountIn), // Already in wei format
    amount: BigInt(order.amount), // Already in wei format
    amountOutMin: BigInt(order.amountOutMin), // Already in wei format
    expiration: BigInt(order.expiration),
    nonce: BigInt(order.nonce),
    receiver: order.receiver || '0x0000000000000000000000000000000000000000',
    salt,
  };

  const signature = await walletClient.signTypedData({
    domain,
    types,
    primaryType: 'Order',
    message,
  });

  const orderHash = computeOrderHash({ ...order, salt: Number(salt) }, chainId, verifyingContract);

  return {
    ...order,
    signature,
    orderHash,
  };
}

function hashLadderAuthData(auth: LadderAuthData): string {
  return keccak256(
    encodeAbiParameters(
      LADDER_AUTH_TYPE,
      [
        auth.maker,
        auth.tokenIn,
        auth.tokenOut,
        BigInt(auth.totalAmount),
        scalePriceToFixedPoint(auth.priceStart),
        scalePriceToFixedPoint(auth.priceEnd),
        BigInt(auth.levels),
        BigInt(auth.expiration),
        BigInt(auth.nonce),
        BigInt(auth.salt || 0),
      ]
    )
  );
}

function computeLadderAuthHash(auth: LadderAuthData, chainId: bigint, verifyingContract: string): string {
  const domainSep = getDomainSeparator(chainId, verifyingContract);
  const authDataHash = hashLadderAuthData(auth);
  return keccak256(
    encodePacked(
      ['bytes1', 'bytes32', 'bytes32'],
      ['0x19', domainSep, authDataHash]
    )
  );
}

export async function signLadderAuth(
  network: Network,
  auth: LadderAuthData,
  walletClient: WalletClient
): Promise<SignedLadderAuth> {
  const expectedChainId = network === 'bsc' ? 56n : 8453n;
  const walletChainId = walletClient.chain?.id !== undefined ? BigInt(walletClient.chain.id) : expectedChainId;
  if (walletChainId !== expectedChainId) {
    throw new Error(
      `wallet chainId mismatch: connected=${walletChainId} expected=${expectedChainId} for network=${network}`
    );
  }

  const chainId = walletChainId;
  const verifyingContract = getSettlementAddress(network) as `0x${string}`;

  const domain = {
    name: 'LadderSettlementHybrid',
    version: '1',
    chainId,
    verifyingContract,
  };

  const types = {
    EIP712Domain: EIP712_DOMAIN,
    LadderAuth: LADDER_AUTH_TYPE,
  };

  const salt = BigInt(auth.salt !== undefined ? auth.salt : Math.floor(Math.random() * 1000000));
  const message = {
    maker: auth.maker,
    tokenIn: auth.tokenIn,
    tokenOut: auth.tokenOut,
    totalAmount: BigInt(auth.totalAmount),
    priceStart: scalePriceToFixedPoint(auth.priceStart),
    priceEnd: scalePriceToFixedPoint(auth.priceEnd),
    levels: BigInt(auth.levels),
    expiration: BigInt(auth.expiration),
    nonce: BigInt(auth.nonce),
    salt,
  };

  const signature = await walletClient.signTypedData({
    domain,
    types,
    primaryType: 'LadderAuth',
    message,
  });

  return {
    signature,
    ladderAuthHash: computeLadderAuthHash({ ...auth, salt: Number(salt) }, chainId, verifyingContract),
  };
}

export async function approveToken(
  tokenAddress: string,
  spenderAddress: string,
  amount?: string,
  walletClient?: WalletClient
): Promise<string> {
  if (!walletClient) {
    throw new Error('Wallet client not available');
  }

  const approveAmount = amount || '115792089237316195423570985008687907853269984665640564039457584007913129639935';

  return walletClient.writeContract({
    address: tokenAddress,
    abi: [
      {
        inputs: [
          { name: 'spender', type: 'address' },
          { name: 'amount', type: 'uint256' },
        ],
        name: 'approve',
        outputs: [{ type: 'bool' }],
        stateMutability: 'nonpayable',
        type: 'function',
      },
    ],
    functionName: 'approve',
    args: [spenderAddress, BigInt(approveAmount)],
  });
}

// Public client interface for reading contract data
export interface PublicClient {
  readContract: (params: { address: string; abi: unknown[]; functionName: string; args: unknown[] }) => Promise<bigint>;
}

// Cache for token approvals to avoid repeated contract calls
const _approvalCache = new Map<string, { allowance: bigint; timestamp: number }>();
const APPROVAL_CACHE_TTL = 30000; // 30 seconds

export async function checkTokenApproval(
  tokenAddress: string,
  spenderAddress: string,
  ownerAddress: string,
  publicClient: PublicClient,
  requiredAmount?: bigint
): Promise<boolean> {
  const cacheKey = `${ownerAddress.toLowerCase()}-${tokenAddress.toLowerCase()}-${spenderAddress.toLowerCase()}`;

  try {
    // Check cache first
    const cached = _approvalCache.get(cacheKey);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < APPROVAL_CACHE_TTL) {
      const allowance = cached.allowance;
      
      // If requiredAmount is specified, check if allowance is sufficient
      if (requiredAmount !== undefined) {
        return allowance >= requiredAmount;
      }
      
      return allowance > 0n;
    }

    // Fetch fresh allowance from contract
    const allowance = await publicClient.readContract({
      address: tokenAddress,
      abi: [
        {
          inputs: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
          ],
          name: 'allowance',
          outputs: [{ type: 'uint256' }],
          stateMutability: 'view',
          type: 'function',
        },
      ],
      functionName: 'allowance',
      args: [ownerAddress, spenderAddress],
    });
    
    // Update cache
    _approvalCache.set(cacheKey, { allowance, timestamp: now });
    
    // If requiredAmount is specified, check if allowance is sufficient
    if (requiredAmount !== undefined) {
      return allowance >= requiredAmount;
    }
    
    // Otherwise, just check if there's any allowance
    return allowance > 0n;
  } catch (error) {
    console.error('Failed to check token approval:', error);
    return false;
  }
}

/**
 * Clear the approval cache (useful after approving or when switching wallets)
 */
export function clearApprovalCache(walletAddress?: string, tokenAddress?: string, spenderAddress?: string) {
  if (walletAddress && tokenAddress && spenderAddress) {
    const cacheKey = `${walletAddress.toLowerCase()}-${tokenAddress.toLowerCase()}-${spenderAddress.toLowerCase()}`;
    _approvalCache.delete(cacheKey);
  } else {
    _approvalCache.clear();
  }
}

export function verifyOrderSignature(
  order: OrderData,
  signature: string,
  network: Network
): boolean {
  const chainId = network === 'bsc' ? 56 : 8453;
  const verifyingContract = getSettlementAddress(network);
  
  const computedHash = computeOrderHash(order, chainId, verifyingContract);
  
  try {
    const recovered = recoverAddress({
      hash: computedHash,
      signature: signature as `0x${string}`,
    });
    
    return recovered.toLowerCase() === order.maker.toLowerCase();
  } catch {
    return false;
  }
}

export function computeOrderHashLocal(
  order: OrderData,
  network: Network
): string {
  const chainId = network === 'bsc' ? 56 : 8453;
  const verifyingContract = getSettlementAddress(network);
  return computeOrderHash(order, chainId, verifyingContract);
}