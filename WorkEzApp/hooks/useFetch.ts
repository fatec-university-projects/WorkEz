import { useState, useEffect, useCallback, useRef } from 'react';
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
// - Evita que refetches em segundo plano (polling/websocket) reativem o spinner
//   quando já existem dados carregados em memória.

export function useFetch<T>(endpoint: string | null, options: RequestInit = {}): FetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<number>(0);
  const dataRef = useRef<T | null>(null);
  const prevEndpointRef = useRef<string | null>(endpoint);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const fetchData = useCallback(async () => {
    if (!endpoint) {
      setLoading(false);
      return;
    }

    // Se o endpoint mudou, limpa dados do endpoint anterior
    if (prevEndpointRef.current !== endpoint) {
      prevEndpointRef.current = endpoint;
      dataRef.current = null;
      setData(null);
    }

    // Só exibe spinner de carregamento caso ainda NÃO haja dados em memória.
    // Em refetches (polling/websocket), mantém os dados existentes visíveis na tela
    // sem recarregar ou exibir spinners desnecessários.
    if (dataRef.current === null) {
      setLoading(true);
    }
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

    dataRef.current = result.data;
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
