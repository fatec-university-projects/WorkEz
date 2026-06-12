import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { apiRequest } from './api';

// ─── Tipos ──────────────────────────────────────────────────────────────────────

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  user: {
    id: string;
    email: string;
    username: string;
    role: string;
  };
}

export interface RegisterResponse {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface DecodedToken {
  sub: string;
  name?: string;
  email: string;
  role: string;
  exp: number;
  iat: number;
  iss?: string;
  aud?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

// ─── Constantes ─────────────────────────────────────────────────────────────────

const STORAGE_KEYS = {
  ACCESS_TOKEN: '@workez_access_token',
  REFRESH_TOKEN: '@workez_refresh_token',
  USER_DATA: '@workez_user_data',
  EXPIRES_AT: '@workez_expires_at',
};

// ─── Helpers ────────────────────────────────────────────────────────────────────

function decodeJwt(token: string): DecodedToken | null {
  try {
    const payload = token.split('.')[1];
    const decoded = atob(payload);
    return JSON.parse(decoded) as DecodedToken;
  } catch {
    return null;
  }
}

// ─── Serviço ────────────────────────────────────────────────────────────────────

export const authService = {
  /**
   * Initialize auth service and restore session if available
   */
  async initialize(): Promise<void> {
    try {
      const token = await this.getToken();
      if (token && this.isTokenExpired(token)) {
        const refreshed = await this.refreshToken();
        if (!refreshed) {
          await this.logout();
        }
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
    }
  },

  /**
   * Login with email and password
   */
  async login(email: string, password: string) {
    const result = await apiRequest<LoginResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim(), password }),
    });

    if (result.data) {
      await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, result.data.accessToken);
      await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, result.data.refreshToken);
      const expiresAt = Date.now() + result.data.expiresIn * 1000;
      await AsyncStorage.setItem(STORAGE_KEYS.EXPIRES_AT, expiresAt.toString());
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(result.data.user));
    }

    return result;
  },

  /**
   * Register new customer
   */
  async registerCustomer(username: string, email: string, password: string) {
    return apiRequest<RegisterResponse>('/api/v1/auth/register/customer', {
      method: 'POST',
      body: JSON.stringify({ username: username.trim(), email: email.trim(), password }),
    });
  },

  /**
   * Register new service provider
   */
  async registerProvider(username: string, email: string, password: string) {
    return apiRequest<RegisterResponse>('/api/v1/auth/register/provider', {
      method: 'POST',
      body: JSON.stringify({ username: username.trim(), email: email.trim(), password }),
    });
  },

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(): Promise<boolean> {
    try {
      const refreshTokenValue = await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
      if (!refreshTokenValue) {
        return false;
      }

      const result = await apiRequest<LoginResponse>('/api/v1/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: refreshTokenValue } as RefreshTokenRequest),
      });

      if (result.data) {
        await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, result.data.accessToken);
        await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, result.data.refreshToken);
        const expiresAt = Date.now() + result.data.expiresIn * 1000;
        await AsyncStorage.setItem(STORAGE_KEYS.EXPIRES_AT, expiresAt.toString());
        return true;
      }

      return false;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  },

  /**
   * Get current access token, refreshing if necessary
   */
  async getToken(): Promise<string | null> {
    try {
      const token = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
      if (!token) return null;

      // Check if token is about to expire (within 5 minutes)
      const expiresAtStr = await AsyncStorage.getItem(STORAGE_KEYS.EXPIRES_AT);
      if (expiresAtStr) {
        const expiresAt = parseInt(expiresAtStr, 10);
        if (Date.now() + 5 * 60 * 1000 > expiresAt) {
          const refreshed = await this.refreshToken();
          if (!refreshed) {
            await this.logout();
            return null;
          }
          return SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
        }
      }

      return token;
    } catch (error) {
      console.error('Get token error:', error);
      return null;
    }
  },

  /**
   * Get current user data
   */
  async getUser(): Promise<DecodedToken | null> {
    try {
      const token = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
      if (!token) return null;

      const decoded = decodeJwt(token);
      if (!decoded) return null;

      if (this.isTokenExpired(token)) {
        const refreshed = await this.refreshToken();
        if (!refreshed) {
          await this.logout();
          return null;
        }
        const newToken = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
        if (newToken) {
          return decodeJwt(newToken);
        }
      }

      return decoded;
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  },

  /**
   * Get user role for permission checks
   */
  async getUserRole(): Promise<string | null> {
    const user = await this.getUser();
    return user?.role || null;
  },

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const user = await this.getUser();
    return user !== null;
  },

  /**
   * Check if token is expired
   */
  isTokenExpired(token: string): boolean {
    const decoded = decodeJwt(token);
    if (!decoded) return true;
    return decoded.exp * 1000 < Date.now();
  },

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
      await AsyncStorage.removeItem(STORAGE_KEYS.EXPIRES_AT);
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  /**
   * Decode JWT token (for debugging)
   */
  decodeToken(token: string): DecodedToken | null {
    return decodeJwt(token);
  },
};
