/**
 * RFC 7807 Problem Details response format for API errors
 */
export interface ApiError {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  traceId?: string;
  errors?: Record<string, string[]>;
}

/**
 * JWT Token payload with claims
 */
export interface JwtPayload {
  sub: string; // user ID
  email: string;
  role: 'Admin' | 'Customer' | 'ServiceProvider';
  iat: number; // issued at
  exp: number; // expiration time
  iss: string; // issuer (WorkEz)
  aud: string; // audience (WorkEzClient)
}

/**
 * Refresh token request
 */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * Auth response with tokens
 */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // in seconds
  tokenType: 'Bearer';
  user: {
    id: string;
    email: string;
    username: string;
    role: 'Admin' | 'Customer' | 'ServiceProvider';
  };
}

/**
 * Stored auth state (persisted in AsyncStorage)
 */
export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: {
    id: string;
    email: string;
    username: string;
    role: 'Admin' | 'Customer' | 'ServiceProvider';
  } | null;
  expiresAt: number | null; // timestamp in milliseconds
  isLoading: boolean;
  error: string | null;
}

/**
 * Standard API response wrapper (generic)
 */
export interface ApiResponse<T = unknown> {
  data: T;
  error: string | null;
  status: number;
}

/**
 * Paginated API response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}
