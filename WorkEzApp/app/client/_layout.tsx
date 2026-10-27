import { useEffect } from 'react';
import { Redirect, Slot, usePathname, useRouter } from 'expo-router';
import { BottomNav } from '../../components/BottomNav';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useAppTheme } from '../../contexts/ThemeContext';

const ROUTES_WITHOUT_NAV = [
  '/client/searching',
  '/client/found',
  '/client/tracking',
  '/client/payment',
  '/client/completed',
  '/client/rating',
  '/client/chat',
];

export default function ClientLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();
  const { colors } = useAppTheme();

  const showNav = !ROUTES_WITHOUT_NAV.some(route => pathname.startsWith(route));

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated || !user) {
      router.replace('/login');
      return;
    }

    if (user.role !== 'Customer') {
      router.replace('/provider');
    }
  }, [isLoading, isAuthenticated, user]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.backgroundAlt }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated || !user) {
    return <Redirect href="/login" />;
  }

  if (user.role !== 'Customer') {
    return <Redirect href="/provider" />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.backgroundAlt }}>
      <View style={{ flex: 1 }}>
        <Slot />
      </View>
      {showNav && <BottomNav type="client" />}
    </View>
  );
}
