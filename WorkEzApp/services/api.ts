import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { safeStorage as AsyncStorage } from './storage';

const STORAGE_KEY_ACCESS = '@workez_access_token';
const STORAGE_KEY_REFRESH = '@workez_refresh_token';
const PRODUCTION_API_URL = 'https://workez-api.onrender.com';

function resolveApiBaseUrl(): string {
  let url = (process.env.EXPO_PUBLIC_API_URL || PRODUCTION_API_URL).replace(/\/+$/, '');

  // Se estiver em dispositivo móvel (físico ou emulador) e a URL configurada for localhost/127.0.0.1:
  // Tenta resolver automaticamente para o IP da máquina host onde o Metro Bundler está rodando.
  if (Platform.OS !== 'web' && (url.includes('localhost') || url.includes('127.0.0.1'))) {
    const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest?.debuggerHost;
    const hostIp = hostUri ? hostUri.split(':')[0] : null;

    if (hostIp) {
      url = url.replace('localhost', hostIp).replace('127.0.0.1', hostIp);
    }
  }

  return url;
}

const API_BASE_URL = resolveApiBaseUrl();

if (__DEV__) {
  console.log(`[WorkEz API] Conectando a: ${API_BASE_URL}`);
}

export async function getWebSocketUrl(path: string): Promise<string> {
  const base = API_BASE_URL.replace(/^http/, 'ws');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const token = await AsyncStorage.getItem(STORAGE_KEY_ACCESS);
  if (!token) {
    return `${base}${normalizedPath}`;
  }
  const separator = normalizedPath.includes('?') ? '&' : '?';
  return `${base}${normalizedPath}${separator}access_token=${encodeURIComponent(token)}`;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  requiresAuth = false
): Promise<{ data: T | null; error: string | null; status: number }> {
  try {
    const headers: Record<string, string> = {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers as Record<string, string>),
    };

    const token = await AsyncStorage.getItem(STORAGE_KEY_ACCESS);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    }).catch((fetchErr) => {
      if (__DEV__) {
        console.warn(`[WorkEz API] Falha ao conectar em ${API_BASE_URL}${endpoint}:`, fetchErr?.message || fetchErr);
      }
      return null;
    });

    if (response && response.ok) {
      if (response.status === 204) {
        return { data: null, error: null, status: 204 };
      }
      const data = (await response.json().catch(() => null)) as T;
      return { data, error: null, status: response.status };
    }

    // Tenta renovar o token caso retorne 401
    if (response && response.status === 401 && token) {
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        const newToken = await AsyncStorage.getItem(STORAGE_KEY_ACCESS);
        headers['Authorization'] = `Bearer ${newToken}`;
        const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers,
        }).catch(() => null);

        if (retryResponse && retryResponse.ok) {
          if (retryResponse.status === 204) {
            return { data: null, error: null, status: 204 };
          }
          const data = (await retryResponse.json().catch(() => null)) as T;
          return { data, error: null, status: retryResponse.status };
        }
      }
    }

    if (response && response.status === 401) {
      await (AsyncStorage as any).multiRemove([STORAGE_KEY_ACCESS, STORAGE_KEY_REFRESH]);
      return { data: null, error: 'Sessão expirada. Faça login novamente.', status: 401 };
    }

    if (response) {
      const errorBody = await response.json().catch(() => null);
      return {
        data: null,
        error: errorBody?.message || `Erro ${response.status}`,
        status: response.status,
      };
    }

    return {
      data: null,
      error: 'Não foi possível conectar ao servidor.',
      status: 503,
    };
  } catch (err: any) {
    return {
      data: null,
      error: err?.message || 'Erro inesperado na requisição.',
      status: 500,
    };
  }
}

// ─── Token Refresh ───────────────────────────────────────────────────────────

async function tryRefreshToken(): Promise<boolean> {
  try {
    const refreshToken = await AsyncStorage.getItem(STORAGE_KEY_REFRESH);
    if (!refreshToken) return false;

    const res = await fetch(`${API_BASE_URL}/api/Auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return false;

    const data = await res.json();
    await AsyncStorage.setItem(STORAGE_KEY_ACCESS, data.accessToken);
    await AsyncStorage.setItem(STORAGE_KEY_REFRESH, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

export function resolveImageUrl(url?: string | null): string | undefined {
  if (!url || typeof url !== 'string') return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('data:')) return trimmed;
  if (trimmed.startsWith('/')) {
    return `${API_BASE_URL}${trimmed}`;
  }
  if (Platform.OS !== 'web' && (trimmed.includes('localhost') || trimmed.includes('127.0.0.1'))) {
    const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest?.debuggerHost;
    const hostIp = hostUri ? hostUri.split(':')[0] : null;
    if (hostIp) {
      return trimmed.replace('localhost', hostIp).replace('127.0.0.1', hostIp);
    }
  }
  return trimmed;
}

// ─── Wallet & Delfinance API ──────────────────────────────────────────────────

export interface CommissionDetail {
  serviceTitle: string;
  grossAmount: number;
  laborAmount: number;
  materialsAmount: number;
  platformFeeAmount: number;
  netAmount: number;
  date: string;
}

export interface WalletSummary {
  providerId: string;
  availableBalance: number;
  escrowBalance: number;
  thisMonthGross: number;
  thisMonthNet: number;
  totalWithdrawn: number;
  pendingWithdrawal: number;
  platformFeePercent: number;
  materialsFeePercent: number;
  lastCommission: CommissionDetail | null;
  defaultPixKey?: string;
  defaultPixKeyType?: string;
}

export interface WalletStatementItem {
  id: string;
  date: string;
  createdAt: string;
  description: string;
  serviceTitle?: string;
  transactionType: 'Credit' | 'PlatformFee' | 'EscrowHold' | 'EscrowRelease' | 'Withdrawal';
  transactionTypeLabel: string;
  grossAmount: number;
  laborAmount: number;
  materialsAmount: number;
  platformFeeAmount: number;
  amount: number;
  status: string;
  statusLabel: string;
  receiptNumber?: string;
}

export interface WalletStatementResponse {
  items: WalletStatementItem[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export interface WithdrawalRequestPayload {
  providerId?: string;
  amount: number;
  pixKey: string;
  pixKeyType: string;
}

export interface WithdrawalResponse {
  id: string;
  providerId: string;
  amount: number;
  pixKey: string;
  pixKeyType: string;
  status: string;
  receiptNumber: string;
  processedAt: string;
  newAvailableBalance: number;
}

export async function fetchWalletSummary(providerId: string) {
  return apiRequest<WalletSummary>(`/api/Wallet/summary/${providerId}`, { method: 'GET' }, true);
}

export async function fetchWalletStatement(providerId: string, filter?: string) {
  const query = filter && filter !== 'all' ? `?filter=${encodeURIComponent(filter)}` : '';
  return apiRequest<WalletStatementResponse>(`/api/Wallet/statement/${providerId}${query}`, { method: 'GET' }, true);
}

export async function requestPixWithdrawal(payload: WithdrawalRequestPayload) {
  return apiRequest<WithdrawalResponse>('/api/Wallet/withdraw', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, true);
}

export { API_BASE_URL, STORAGE_KEY_ACCESS, STORAGE_KEY_REFRESH };
