import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { authService, DecodedToken } from '../services/authService';

type UserRole = 'Customer' | 'ServiceProvider' | 'Admin' | null;

interface User {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  token?: string;
}

interface AuthContextData {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  registerCustomer: (username: string, email: string, password: string) => Promise<any>;
  registerProvider: (username: string, email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  signIn: (userData: User) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth on app load
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await authService.initialize();
        const currentUser = await authService.getUser();
        if (currentUser) {
          setUser({
            id: currentUser.sub,
            email: currentUser.email,
            username: currentUser.name || currentUser.email,
            role: (currentUser.role as UserRole) || null,
          });
          setIsAuthenticated(true);
        }
      } catch (err) {
        console.error('Auth initialization failed:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await authService.login(email, password);
      if (result.data) {
        const currentUser = await authService.getUser();
        if (currentUser) {
          setUser({
            id: currentUser.sub,
            email: currentUser.email,
            username: currentUser.name || currentUser.email,
            role: (currentUser.role as UserRole) || null,
          });
          setIsAuthenticated(true);
        }
        return { success: true };
      } else {
        const errorMsg = result.error || 'Login failed';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const registerCustomer = async (username: string, email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await authService.registerCustomer(username, email, password);
      if (result.error) {
        setError(result.error);
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const registerProvider = async (username: string, email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await authService.registerProvider(username, email, password);
      if (result.error) {
        setError(result.error);
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = (userData: User) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const signOut = () => {
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        error,
        login,
        registerCustomer,
        registerProvider,
        logout,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
