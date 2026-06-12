import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../services/api';
import { safeStorage as AsyncStorage } from '../services/storage';
import { STORAGE_KEY_ACCESS } from '../services/api';

interface FetchResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  status: number;
  refetch: () => Promise<void>;
}

// AUDITORIA FIX:
// - Inclui Bearer Token automaticamente (lido do AsyncStorage)
// - Trata 401 — exibe erro de sessão expirada
// - Mantém compatibilidade com endpoints públicos

export function useFetch<T>(endpoint: string | null, options: RequestInit = {}): FetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<number>(0);

  const fetchData = useCallback(async () => {
    if (!endpoint) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Injeta o token salvo
    const token = await AsyncStorage.getItem(STORAGE_KEY_ACCESS).catch(() => null);
    const authHeaders: Record<string, string> = token
      ? { Authorization: `Bearer ${token}` }
      : {};

    const result = await apiRequest<T>(endpoint, {
      ...options,
      headers: {
        ...(options.headers as Record<string, string>),
        ...authHeaders,
      },
    });

    setData(result.data);
    setError(result.error);
    setStatus(result.status);
    setLoading(false);
  }, [endpoint, JSON.stringify(options)]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, status, refetch: fetchData };
}
