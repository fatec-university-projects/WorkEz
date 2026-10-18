import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, StoredUser } from '../services/authService';
import { apiRequest } from '../services/api';
import { notificationService } from '../services/notificationService';

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface AuthContextData {
  user: StoredUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (userData: StoredUser) => void;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  // AUDITORIA FIX: Removido usuário "João Cliente" hardcoded.
  // Estado inicial é null (não autenticado). Carregado do AsyncStorage no boot.
  const [user, setUser] = useState<StoredUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Carrega o usuário persistido ao iniciar o app
  useEffect(() => {
    async function loadStoredUser() {
      try {
        const storedUser = await authService.getUser();
        setUser(storedUser);
        if (storedUser?.id) {
          notificationService.registerDeviceWithBackend(storedUser.id).catch(() => {});
        }
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    loadStoredUser();
  }, []);

  const signIn = (userData: StoredUser) => {
    setUser(userData);
    if (userData?.id) {
      notificationService.registerDeviceWithBackend(userData.id).catch(() => {});
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await notificationService.unregisterDeviceFromBackend().catch(() => {});
      await authService.logout();
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  };

  // Recarrega o usuário do storage e sincroniza com o backend (útil após atualização de perfil)
  const refreshUser = async () => {
    let storedUser = await authService.getUser();
    if (storedUser) {
      try {
        const res = await apiRequest<any>(`/api/Users/${storedUser.id}`);
        if (res.data) {
          storedUser = {
            ...storedUser,
            name: res.data.name || storedUser.name,
            email: res.data.email || storedUser.email,
            photo: res.data.profilePicture || storedUser.photo,
            profilePicture: res.data.profilePicture || storedUser.profilePicture,
          };
          await authService.updateLocalProfile(storedUser);
        }
      } catch {}
    }
    setUser(storedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: user !== null,
        signIn,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
