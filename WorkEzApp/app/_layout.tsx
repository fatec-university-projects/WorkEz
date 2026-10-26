import '../global.css';

import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider, useAppTheme } from '../contexts/ThemeContext';
import { notificationService } from '../services/notificationService';

function ThemedRootContent() {
  const { isDark, colors } = useAppTheme();

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.backgroundAlt },
        }}
      />
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    notificationService.setupNotificationListeners((route) => {
      try {
        router.push(route as any);
      } catch (err) {
        console.warn('[RootLayout] Erro ao navegar via deep link de notificação:', err);
      }
    });

    return () => {
      notificationService.removeNotificationListeners();
    };
  }, [router]);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <ThemedRootContent />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
