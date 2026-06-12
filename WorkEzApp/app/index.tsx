import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Logo } from "../components/Logo";
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { WorkEzTheme } from '../constants/theme';

export default function Splash() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/onboarding');
    }, 2500);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <LinearGradient
      colors={['#2563EB', '#1D4ED8']}
      style={styles.container}
    >
      <View style={styles.logoContainer}>
        <Logo />
      </View>
      <Text style={styles.subtitle}>
        Serviços profissionais, quando você precisar.
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  logoContainer: {
    width: 128,
    height: 128,
    marginBottom: 24,
    transform: [{ scale: 1.5 }],
  },
  subtitle: {
    ...WorkEzTheme.typography.base,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    maxWidth: 280,
    marginTop: 16,
  },
});
