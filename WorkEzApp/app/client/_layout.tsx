import { useEffect } from 'react';
import { Slot, usePathname, useRouter } from 'expo-router';
import { BottomNav } from '../../components/BottomNav';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { WorkEzTheme } from '../../constants/theme';

// AUDITORIA FIX: Rotas sem BottomNav
const ROUTES_WITHOUT_NAV = [
  '/client/searching',
  '/client/found',
  '/client/tracking',
  '/client/payment',
  '/client/completed',
  '/client/rating',
];

// ─── Route Guard — Área do Cliente ───────────────────────────────────────────
// AUDITORIA FIX:
// - Implementado Route Guard para proteger todas as rotas do cliente
// - Valida autenticação e papel (Customer)
// - Redireciona para /login se não autenticado
// - Aguarda carregamento do estado de auth antes de renderizar

export default function ClientLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, isAuthenticated, signIn } = useAuth();

  const showNav = !ROUTES_WITHOUT_NAV.some(route => pathname.startsWith(route));

  useEffect(() => {
    if (isLoading) return; // Aguarda carregamento

    if (!isAuthenticated || !user) {
      router.replace('/login');
      return;
    }

    if (user.role !== 'Customer') {
      router.replace('/provider');
    }
  }, [isLoading, isAuthenticated, user]);

  // Tela de loading enquanto verifica autenticação
  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={WorkEzTheme.colors.primary} />
      </View>
    );
  }

  // Não renderiza conteúdo protegido se não autenticado
  if (!isAuthenticated || user?.role !== 'Customer') {
    return null;
  }

  return (
    <View className="flex-1 bg-[#F8FAFC]">
      <View className="flex-1">
        <Slot />
      </View>
      {showNav && <BottomNav type="client" />}
    </View>
  );
}
