export interface Token {
  address: string;
  name: string;
  symbol: string;
  logo: string;
  decimals?: number;
  website?: string;
  links?: {
    homepage?: string[];
    whitepaper?: string;
    blockchain_site?: string[];
    official_forum_url?: string[];
    chat_url?: string[];
    announcement_url?: string[];
    snapshot_url?: string;
    twitter_screen_name?: string;
    facebook_username?: string;
    bitcointalk_thread_identifier?: string;
    telegram_channel_identifier?: string;
    subreddit_url?: string;
    discord_url?: string;
    repos_url?: {
      github?: string[];
      bitbucket?: string[];
    };
  };
  about?: string;
}

export interface Pair {
  id: string;
  pairAddress: string;
  dexName: string;
  network?: string;
  baseToken: Token;
  quoteToken: Token;
  price: number;
  priceUSD?: number;
  priceChange24h: number;
  priceHigh24h?: number;
  priceLow24h?: number;
  volume24h: number;
  volume24hUSD?: number;
  liquidity: number;
  liquidityUSD?: number;
  marketCap?: number;
  marketCapUSD?: number;
  low24h?: number;
  high24h?: number;
  trendingScore: number;
  logoUrl: string;
  createdAt: string;
  updatedAt: string;
  lastTradeAt?: string;
}

export type OrderStatus = 'pending' | 'partial' | 'filled' | 'cancelled' | 'expired' | 'triggered' | 'open';

export type OrderType = 'limit' | 'market' | 'stop_loss' | 'take_profit' | 'post_only';

export type OrderSide = 'buy' | 'sell';

export interface TokenInfo {
  symbol: string;
  decimals: number;
}

export interface PairInfo {
  id: string;
  base_symbol: string;
  quote_symbol: string;
  base_logo?: string;
  quote_logo?: string;
}

export interface OrderWithPair {
  order: {
    id: number;
    order_hash: string;
    user_id: number;
    network: string;
    pair_id: string;
    side: OrderSide;
    order_type: OrderType;
    price: string;
    amount: string;
    filled_amount: string;
    amount_in: string;
    amount_out_min: string;
    token_in: string;
    token_out: string;
    token_in_decimals: number;
    token_out_decimals: number;
    status: OrderStatus;
    is_ladder: boolean;
    nonce?: number;
    maker?: string;
    deposit_memo?: string;
    deposit_amount?: string;
    deposit_token_mint?: string;
    deposit_type?: string;
    deposit_tx_hash?: string;
    ladder_levels?: number;
    ladder_price_start?: string;
    ladder_price_end?: string;
    ladder_parent_id?: number | null;
    ladder_total_amount_in?: string;
    ladder_total_amount_out_min?: string;
    trigger_price?: string;
    is_post_only: boolean;
    reduce_only: boolean;
    time_in_force: string;
    stop_loss_type?: string;
    expiration: string;
    created_at: string;
    updated_at: string;
  };
  pair?: PairInfo;
  token_in_info?: TokenInfo;
  token_out_info?: TokenInfo;
  amount_in_human: string;
  amount_out_min_human: string;
}

export interface Order {
  id: string;
  orderHash: string;
  userId: number;
  network: string;
  pairId: string;
  side: OrderSide;
  orderType: OrderType;
  price: number;
  amount: number;
  filledAmount: number;
  amountIn: number;
  amountOutMin: number;
  tokenIn: string;
  tokenOut: string;
  status: OrderStatus;
  isLadder: boolean;
  maker?: string;
  nonce?: number;
  depositMemo?: string;
  depositAmount?: string;
  depositTokenMint?: string;
  depositType?: string;
  depositTxHash?: string;
  ladderLevels?: number;
  ladderPriceStart?: number;
  ladderPriceEnd?: number;
  ladderParentId?: number | null;
  triggerPrice?: number;
  triggeredAt?: string;
  isPostOnly: boolean;
  reduceOnly: boolean;
  timeInForce: string;
  stopLossType?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserOrder extends Order {
  label: string;
  typeLabel: string;
}

export interface OrderbookLevel {
  price: number | string;
  amount: number | string;
  total: number | string;
}

export interface Orderbook {
  pairId: string;
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
  spread: number;
  spreadPercent: number;
  midPrice: number;
  lastUpdated: string;
}

export interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface RecentTrade {
  id: string;
  price: number;
  amount: number;
  side: 'buy' | 'sell';
  time: string;
  tx_hash?: string;
  tx_hash_buy?: string;
  tx_hash_sell?: string;
  decimals?: number;
}
