import { safeStorage as AsyncStorage } from './storage';

const STORAGE_KEY_ACCESS = '@workez_access_token';
const STORAGE_KEY_REFRESH = '@workez_refresh_token';
const API_BASE_URL = 'https://workez-api.onrender.com';

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
    }).catch(() => null);

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

export { API_BASE_URL, STORAGE_KEY_ACCESS, STORAGE_KEY_REFRESH };
