import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../services/api';

interface FetchResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  status: number;
  refetch: () => Promise<void>;
}

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

    const result = await apiRequest<T>(endpoint, options);
    
    setData(result.data);
    setError(result.error);
    setStatus(result.status);
    setLoading(false);
  }, [endpoint, JSON.stringify(options)]); // Options safely stringified for dependency array

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, status, refetch: fetchData };
}
