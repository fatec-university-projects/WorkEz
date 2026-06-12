import { useRouter } from 'expo-router';
import { User, Wrench } from 'lucide-react-native';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { authService } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WorkEzTheme } from '../constants/theme';

export default function ProfileChoice() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const [loading, setLoading] = useState<'client' | 'provider' | null>(null);

  const handleClientPress = async () => {
    setLoading('client');
    await authService.setSelectedRole('client');
    setLoading(null);
    router.push('/signup');
  };

  const handleProviderPress = async () => {
    setLoading('provider');
    await authService.setSelectedRole('provider');
    setLoading(null);
    router.push('/provider/signup');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>
          Como você quer usar o WorkEz?
        </Text>
        <Text style={styles.subtitle}>
          Escolha uma opção para continuar
        </Text>

        <View style={styles.cardsContainer}>
          {/* Card Cliente */}
          <Pressable
            onPress={handleClientPress}
            disabled={loading !== null}
            style={({ pressed }) => StyleSheet.flatten([
              styles.card,
              pressed && styles.cardPressed,
            ])}
          >
            <View style={styles.cardRow}>
              <View style={[styles.iconWrapper, styles.clientIconWrapper]}>
                {loading === 'client' ? (
                  <ActivityIndicator color="#2563EB" />
                ) : (
                  <User size={32} color="#2563EB" />
                )}
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>Sou cliente</Text>
                <Text style={styles.cardDescription}>Preciso contratar serviços</Text>
              </View>
            </View>
          </Pressable>

          {/* Card Prestador */}
          <Pressable
            onPress={handleProviderPress}
            disabled={loading !== null}
            style={({ pressed }) => StyleSheet.flatten([
              styles.card,
              pressed && styles.cardPressed,
            ])}
          >
            <View style={styles.cardRow}>
              <View style={[styles.iconWrapper, styles.providerIconWrapper]}>
                {loading === 'provider' ? (
                  <ActivityIndicator color="#26FFF5" />
                ) : (
                  <Wrench size={32} color="#26FFF5" />
                )}
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>Sou prestador</Text>
                <Text style={styles.cardDescription}>Quero oferecer meus serviços</Text>
              </View>
            </View>
          </Pressable>
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 20 }]}>
        <Pressable
          onPress={() => router.push('/login')}
          style={({ pressed }) => StyleSheet.flatten([
            styles.loginLink,
            pressed && styles.loginLinkPressed,
          ])}
        >
          <Text style={styles.loginLinkText}>Já tenho uma conta</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    ...WorkEzTheme.typography['3xl'],
    fontWeight: WorkEzTheme.typography.fontWeight.bold,
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    ...WorkEzTheme.typography.base,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 48,
  },
  cardsContainer: {
    gap: 16,
    width: '100%',
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    padding: 20,
  },
  cardPressed: {
    borderColor: '#2563EB',
    backgroundColor: '#F8FAFC',
    transform: [{ scale: 0.98 }],
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientIconWrapper: {
    backgroundColor: '#EFF6FF',
  },
  providerIconWrapper: {
    backgroundColor: '#F0FFFD',
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    ...WorkEzTheme.typography.lg,
    fontWeight: WorkEzTheme.typography.fontWeight.semibold,
    color: '#0F172A',
  },
  cardDescription: {
    ...WorkEzTheme.typography.sm,
    color: '#94A3B8',
    marginTop: 4,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 16,
  },
  loginLink: {
    padding: 8,
  },
  loginLinkPressed: {
    opacity: 0.7,
  },
  loginLinkText: {
    ...WorkEzTheme.typography.sm,
    color: '#94A3B8',
    fontWeight: WorkEzTheme.typography.fontWeight.medium,
  },
});
