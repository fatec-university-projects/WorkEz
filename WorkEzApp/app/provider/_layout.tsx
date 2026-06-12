import { useEffect } from 'react';
import { Slot, usePathname, useRouter } from 'expo-router';
import { BottomNav } from '../../components/BottomNav';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { WorkEzTheme } from '../../constants/theme';

// Rotas do fluxo de onboarding do prestador (sem BottomNav)
const ROUTES_WITHOUT_NAV = [
  '/provider/signup',
  '/provider/work-area',
  '/provider/documents',
  '/provider/references',
  '/provider/interview',
  '/provider/analysis',
  '/provider/new-call',
  '/provider/in-progress',
  '/provider/waiting-payment',
];

// ─── Route Guard — Área do Prestador ─────────────────────────────────────────
// AUDITORIA FIX:
// - Implementado Route Guard para proteger todas as rotas do prestador
// - Valida autenticação e papel (ServiceProvider)
// - Redireciona para /login se não autenticado
// - A tela de signup do prestador (/provider/signup) é a exceção: pública durante cadastro

export default function ProviderLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, isAuthenticated, signIn } = useAuth();

  const showNav = !ROUTES_WITHOUT_NAV.some(route => pathname.startsWith(route));

  // /provider/signup é pública (fluxo de cadastro)
  const isPublicRoute = pathname === '/provider/signup';

  useEffect(() => {
    if (isLoading || isPublicRoute) return;

    if (!isAuthenticated || !user) {
      router.replace('/login');
      return;
    }

    if (user.role !== 'ServiceProvider') {
      router.replace('/client');
    }
  }, [isLoading, isAuthenticated, user, isPublicRoute]);

  // Loading enquanto verifica auth
  if (isLoading && !isPublicRoute) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={WorkEzTheme.colors.primary} />
      </View>
    );
  }

  // Bloqueia renderização se não autenticado (exceto signup)
  if (!isPublicRoute && (!isAuthenticated || user?.role !== 'ServiceProvider')) {
    return null;
  }

  return (
    <View className="flex-1 bg-[#F8FAFC]">
      <View className="flex-1">
        <Slot />
      </View>
      {showNav && <BottomNav type="provider" />}
    </View>
  );
}
