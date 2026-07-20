import { API_BASE_URL } from '../utils/constants';
import { useStore } from '../stores/useStore';

interface LoginResponse {
  token: string;
  user_id: number;
  address: string;
  network: string;
}

export async function login(address: string, network: string = 'bsc'): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ address, network }),
  });
  
  if (!response.ok) {
    throw new Error(`Login failed: ${response.status}`);
  }
  
  const data: LoginResponse = await response.json();
  return data;
}

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = useStore.getState().authToken;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options?.headers as Record<string, string>,
  };
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers,
    ...options,
  });
  
  if (response.status === 401) {
    useStore.getState().setAuthToken(null);
    throw new Error('API Error: 401');
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`API Error: ${response.status}${errorText ? ` - ${errorText}` : ''}`);
  }

  const cacheHeader = response.headers.get('X-Cache');
  if (cacheHeader) {
    console.debug(`[API] ${endpoint} X-Cache=${cacheHeader}`);
  }
  
  return response.json();
}
