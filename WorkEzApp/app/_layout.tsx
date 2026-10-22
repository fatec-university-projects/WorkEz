import '../global.css';

import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '../contexts/AuthContext';
import { notificationService } from '../services/notificationService';

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
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }} />
        <StatusBar style="auto" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
