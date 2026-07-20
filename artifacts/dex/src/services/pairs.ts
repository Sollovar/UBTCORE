import { fetchApi } from './api';
import type { Pair } from '../types';
import { normalizeApiPair } from '../utils/mockData';

export async function getPairs(network?: string): Promise<Pair[]> {
  try {
    const endpoint = network ? `/api/v1/pairs?network=${network}` : '/api/v1/pairs';
    const response = await fetchApi<{ data: any[] }>(endpoint);
    console.log('[Frontend] getPairs loaded', { endpoint, count: response?.data?.length ?? 0 });
    return (response?.data || []).map(normalizeApiPair);
  } catch (error) {
    console.error('Failed to fetch pairs from API:', error);
    throw error;
  }
}

export async function getTrendingPairs(network?: string): Promise<Pair[]> {
  try {
    const networkParam = network ? `&network=${network}` : '';
    const endpoint = `/api/v1/pairs/trending?limit=12${networkParam}`;
    const response = await fetchApi<{ data: any[] }>(endpoint);
    console.log('[Frontend] getTrendingPairs loaded', { endpoint, count: response?.data?.length ?? 0 });
    return (response?.data || []).map(normalizeApiPair);
  } catch (error) {
    console.error('Trending endpoint missing or unavailable:', error);
    throw error;
  }
}

export async function getPairById(id: string): Promise<Pair> {
  try {
    const response = await fetchApi<any>(`/api/v1/pairs/${id}`);
    return normalizeApiPair(response);
  } catch (error) {
    console.error('Failed to fetch pair from API:', error);
    throw error;
  }
}

export async function syncPairs(): Promise<void> {
  return fetchApi<void>('/api/v1/pairs/sync', { method: 'POST' });
}
