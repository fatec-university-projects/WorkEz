import { useEffect } from 'react';
import { Redirect, Slot, usePathname, useRouter } from 'expo-router';
import { BottomNav } from '../../components/BottomNav';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useAppTheme } from '../../contexts/ThemeContext';

const ROUTES_WITHOUT_NAV = [
  '/provider/signup',
  '/provider/work-area',
  '/provider/documents',
  '/provider/references',
  '/provider/interview',
  '/provider/analysis',
  '/provider/new-call',
  '/provider/accepted',
  '/provider/in-progress',
  '/provider/waiting-payment',
  '/provider/chat',
];

export default function ProviderLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();
  const { colors } = useAppTheme();

  const showNav = !ROUTES_WITHOUT_NAV.some(route => pathname.startsWith(route));
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

  if (isLoading && !isPublicRoute) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.backgroundAlt }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isPublicRoute) {
    if (!isAuthenticated || !user) {
      return <Redirect href="/login" />;
    }
    if (user.role !== 'ServiceProvider') {
      return <Redirect href="/client" />;
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.backgroundAlt }}>
      <View style={{ flex: 1 }}>
        <Slot />
      </View>
      {showNav && <BottomNav type="provider" />}
    </View>
  );
}
