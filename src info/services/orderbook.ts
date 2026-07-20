import { fetchApi } from './api';
import type { Order, OrderWithPair } from '../types';
import { calculateMidPrice, calculateSpread, calculateSpreadPercent } from '../utils/formatters';

// Backend returns snake_case, frontend expects camelCase
interface BackendOrderbookResponse {
  pair_id: string;
  asks: Array<{ price: string | number; amount: string | number; total: string | number; orders: number }>;
  bids: Array<{ price: string | number; amount: string | number; total: string | number; orders: number }>;
  sequence: number;
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

export async function getOrderbook(pairId: string): Promise<Orderbook> {
  const response = await fetchApi<BackendOrderbookResponse>(`/api/v1/pairs/${pairId}/orderbook`);
  
  // Map backend response to frontend Orderbook type
  const mapLevel = (level: BackendOrderbookResponse['asks'][0]): OrderbookLevel => ({
    price: typeof level.price === 'string' ? parseFloat(level.price) : level.price,
    amount: typeof level.amount === 'string' ? parseFloat(level.amount) : level.amount,
    total: typeof level.total === 'string' ? parseFloat(level.total) : level.total,
  });

  const bids = (response.bids || []).map(mapLevel);
  const asks = (response.asks || []).map(mapLevel);

  // Get best bid and best ask
  const bestBid = bids.length > 0 ? (typeof bids[0].price === 'string' ? parseFloat(bids[0].price) : bids[0].price) : 0;
  const bestAsk = asks.length > 0 ? (typeof asks[0].price === 'string' ? parseFloat(asks[0].price) : asks[0].price) : 0;

  // Calculate spread, spread percent, and mid-price
  const spread = calculateSpread(bestBid, bestAsk);
  const spreadPercent = calculateSpreadPercent(bestBid, bestAsk);
  const midPrice = calculateMidPrice(bestBid, bestAsk);

  return {
    pairId: response.pair_id,
    bids,
    asks,
    spread,
    spreadPercent,
    midPrice,
    lastUpdated: new Date(response.sequence * 1000).toISOString(),
  };
}

interface RecentTradesResponse {
  data: RecentTrade[];
  count: number;
}

export async function getTrades(pairId: string, limit: number = 50): Promise<RecentTrade[]> {
  const response = await fetchApi<RecentTradesResponse | RecentTrade[]>(`/api/v1/pairs/${pairId}/trades?limit=${limit}`);
  return Array.isArray(response) ? response : response.data || [];
}

export async function createOrder(order: Partial<Order>): Promise<Order> {
  return fetchApi<Order>('/api/v1/orders', {
    method: 'POST',
    body: JSON.stringify(order),
  });
}

export async function cancelOrder(orderId: string, address?: string): Promise<void> {
  const url = address 
    ? `/api/v1/orders/${orderId}?address=${address}` 
    : `/api/v1/orders/${orderId}`;
  return fetchApi<void>(url, {
    method: 'DELETE',
  });
}

export async function getUserOrders(userAddress: string): Promise<Order[]> {
  return fetchApi<Order[]>(`/api/v1/orders/user/${userAddress}`);
}

export interface OpenOrdersResponse {
  data: OrderWithPair[];
  count: number;
}

export async function getOpenOrders(address?: string, network?: string): Promise<OpenOrdersResponse> {
  let url = '/api/v1/orders/open';
  const params = new URLSearchParams();
  if (address) params.append('address', address);
  if (network) params.append('network', network);
  
  if (params.toString()) {
    url += `?${params.toString()}`;
  }
  return fetchApi<OpenOrdersResponse>(url);
}

export async function getHistoryOrders(address?: string, limit: number = 50, offset: number = 0, network?: string): Promise<OpenOrdersResponse> {
  const params = new URLSearchParams();
  if (address) params.append('address', address);
  params.append('limit', limit.toString());
  params.append('offset', offset.toString());
  if (network) params.append('network', network);
  
  const url = `/api/v1/orders/history?${params.toString()}`;
  return fetchApi<OpenOrdersResponse>(url);
}
