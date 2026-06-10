import React, { createContext, useContext, useState, ReactNode } from 'react';

type UserRole = 'client' | 'provider' | null;

interface User {
  id: string;
  name: string;
  role: UserRole;
  token?: string;
}

interface AuthContextData {
  user: User | null;
  isLoading: boolean;
  signIn: (userData: User) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Simulação de um usuário logado para facilitar a integração até o módulo de Auth real estar pronto
  const [user, setUser] = useState<User | null>({
    id: '00000000-0000-0000-0000-000000000001', // Guid genérico válido
    name: 'João Cliente',
    role: 'client',
  });
  
  const [isLoading, setIsLoading] = useState(false);

  const signIn = (userData: User) => {
    setUser(userData);
  };

  const signOut = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut }}>
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
