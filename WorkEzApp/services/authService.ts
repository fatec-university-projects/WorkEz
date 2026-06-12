import { safeStorage as AsyncStorage } from './storage';
import { apiRequest, STORAGE_KEY_ACCESS, STORAGE_KEY_REFRESH } from './api';

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type UserRole = 'Customer' | 'ServiceProvider' | 'Admin';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface RegisterResponse {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface DecodedToken {
  sub: string;
  name: string;
  email: string;
  role: UserRole;
  exp: number;
}

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

// ─── Storage Keys ────────────────────────────────────────────────────────────
// AUDITORIA FIX: Prefixo corrigido de @adega_ para @workez_
const STORAGE_KEYS = {
  ACCESS_TOKEN: STORAGE_KEY_ACCESS,
  REFRESH_TOKEN: STORAGE_KEY_REFRESH,
  USER_PROFILE: '@workez_user_profile',
  SELECTED_ROLE: '@workez_selected_role',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function decodeJwt(token: string): DecodedToken | null {
  try {
    const payload = token.split('.')[1];
    // Padding seguro para base64
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
    const decodedStr = atob(padded);
    const decoded = JSON.parse(decodedStr);

    // Mapeamento de claims do ASP.NET Core / SOAP fallback
    const role = decoded.role || decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
    const name = decoded.name || decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"];
    const email = decoded.email || decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"];
    const sub = decoded.sub || decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"];

    return {
      sub,
      name,
      email,
      role,
      exp: decoded.exp,
    } as DecodedToken;
  } catch {
    return null;
  }
}

// ─── Serviço ─────────────────────────────────────────────────────────────────

export const authService = {

  // ── Login ──────────────────────────────────────────────────────────────────
  async login(email: string, password: string) {
    const result = await apiRequest<LoginResponse>('/api/Auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });

    if (result.data) {
      await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, result.data.accessToken);
      await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, result.data.refreshToken);

      // Decodifica e persiste perfil do usuário
      const decoded = decodeJwt(result.data.accessToken);
      if (decoded) {
        const profile: StoredUser = {
          id: decoded.sub,
          name: decoded.name,
          email: decoded.email,
          role: decoded.role,
        };
        await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
      }
    }

    return result;
  },

  // ── Registro Cliente ───────────────────────────────────────────────────────
  async registerCustomer(name: string, email: string, password: string, phone?: string) {
    return apiRequest<RegisterResponse>('/api/Auth/register/customer', {
      method: 'POST',
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone?.trim(),
      }),
    });
  },

  // ── Registro Prestador ─────────────────────────────────────────────────────
  // AUDITORIA FIX: Adicionado suporte a registro de Prestador
  async registerProvider(name: string, email: string, password: string, phone?: string, cpf?: string) {
    return apiRequest<RegisterResponse>('/api/Auth/register/provider', {
      method: 'POST',
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone?.trim(),
        documentNumber: cpf?.replace(/\D/g, ''),
      }),
    });
  },

  // ── Logout com revogação na API ────────────────────────────────────────────
  // AUDITORIA FIX: Logout agora revoga o refresh token na API
  async logout(): Promise<void> {
    try {
      const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (refreshToken) {
        // Revoga o refresh token no servidor (ignora erros de rede)
        await apiRequest('/api/Auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        });
      }
    } finally {
      await (AsyncStorage as any).multiRemove([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER_PROFILE,
        STORAGE_KEYS.SELECTED_ROLE,
      ]);
    }
  },

  // ── Recuperar token ────────────────────────────────────────────────────────
  async getToken(): Promise<string | null> {
    return AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  },

  // ── Recuperar usuário decodificado do JWT ──────────────────────────────────
  async getUser(): Promise<StoredUser | null> {
    const profileStr = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (profileStr) {
      try {
        return JSON.parse(profileStr) as StoredUser;
      } catch {
        // Ignora erro de parse
      }
    }
    return null;
  },

  // ── Atualiza o cache local do perfil do usuário ────────────────────────────
  async updateLocalProfile(profile: Partial<StoredUser>) {
    const current = await this.getUser();
    if (current) {
      const updated = { ...current, ...profile };
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(updated));
    }
  },

  // ── Verifica autenticação ──────────────────────────────────────────────────
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    if (!token) return false;
    const decoded = decodeJwt(token);
    if (!decoded) return false;
    const currentTime = Date.now() / 1000;
    return decoded.exp > currentTime;
  },

  // ── Persiste o papel escolhido na tela de profile-choice ──────────────────
  async setSelectedRole(role: 'client' | 'provider'): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_ROLE, role);
  },

  async getSelectedRole(): Promise<'client' | 'provider' | null> {
    const role = await AsyncStorage.getItem(STORAGE_KEYS.SELECTED_ROLE);
    return role as 'client' | 'provider' | null;
  },

  // ── Limpa sessão local (sem chamar API) ────────────────────────────────────
  async clearSession(): Promise<void> {
    await (AsyncStorage as any).multiRemove([
      STORAGE_KEYS.ACCESS_TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
      STORAGE_KEYS.USER_PROFILE,
    ]);
  },
};
