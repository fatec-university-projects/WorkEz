import { authService } from './authService';
import { ApiResponse, ApiError } from '../types/api';

const API_BASE_URL = 'https://workez-api.onrender.com';
const API_VERSION = '/api/v1';

/**
 * Generic API request function with JWT auth support
 * Handles token refresh automatically and RFC 7807 error responses
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    // Get current access token (will auto-refresh if needed)
    const token = await authService.getToken();

    // Build headers with JWT token
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add existing headers from options
    if (options.headers) {
      const existingHeaders = options.headers as Record<string, string>;
      Object.assign(headers, existingHeaders);
    }

    // Add authorization header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const fullUrl = `${API_BASE_URL}${API_VERSION}${endpoint}`;

    const response = await fetch(fullUrl, {
      ...options,
      headers,
    });

    // Handle successful response
    if (response.ok) {
      const data = (await response.json()) as T;
      return { data, error: null, status: response.status };
    }

    // Handle error response with RFC 7807 format
    let errorData: ApiError | null = null;
    try {
      errorData = await response.json();
    } catch {
      errorData = null;
    }

    const errorMessage = errorData?.detail || errorData?.title || `Erro ${response.status}`;

    // Handle 401 Unauthorized - clear auth and redirect to login
    if (response.status === 401) {
      await authService.logout();
      // In a real app, you'd emit an event or trigger navigation here
      console.warn('Unauthorized - user logged out');
    }

    return {
      data: null as any,
      error: errorMessage,
      status: response.status,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Não foi possível conectar ao servidor.';
    return {
      data: null as any,
      error: errorMessage,
      status: 0,
    };
  }
}

/**
 * Upload file to API (for images, documents, etc)
 */
export async function uploadFile(
  endpoint: string,
  file: { uri: string; name: string; type: string }
): Promise<ApiResponse<any>> {
  try {
    const token = await authService.getToken();
    const formData = new FormData();
    formData.append('file', file as any);

    const fullUrl = `${API_BASE_URL}${API_VERSION}${endpoint}`;

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        // Don't set Content-Type, let the browser handle multipart/form-data
      },
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();
      return { data, error: null, status: response.status };
    }

    const errorData = await response.json().catch(() => null);
    const errorMessage = errorData?.detail || `Upload failed: ${response.status}`;

    return {
      data: null,
      error: errorMessage,
      status: response.status,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Upload failed';
    return { data: null, error: errorMessage, status: 0 };
  }
}

/**
 * Helper function for GET requests
 */
export function apiGet<T>(endpoint: string, options: RequestInit = {}) {
  return apiRequest<T>(endpoint, { ...options, method: 'GET' });
}

/**
 * Helper function for POST requests
 */
export function apiPost<T>(endpoint: string, body?: any, options: RequestInit = {}) {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Helper function for PUT requests
 */
export function apiPut<T>(endpoint: string, body?: any, options: RequestInit = {}) {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Helper function for PATCH requests
 */
export function apiPatch<T>(endpoint: string, body?: any, options: RequestInit = {}) {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Helper function for DELETE requests
 */
export function apiDelete<T>(endpoint: string, options: RequestInit = {}) {
  return apiRequest<T>(endpoint, { ...options, method: 'DELETE' });
}

export { API_BASE_URL, API_VERSION };
