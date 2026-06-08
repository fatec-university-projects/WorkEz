import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ArrowLeft, Mail, Lock } from 'lucide-react-native';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { AntigravityTheme } from '../constants/theme';


export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    router.push('/client');
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ArrowLeft size={24} color={AntigravityTheme.colors.text} />
          </TouchableOpacity>

          <Text style={styles.title}>
            Bem-vindo de volta
          </Text>
          <Text style={styles.subtitle}>
            Acesse sua conta para continuar
          </Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputWrapper}>
            <Mail size={20} color={AntigravityTheme.colors.textSecondary} style={styles.inputIcon} />
            <Input
              type="email"
              placeholder="Seu e-mail"
              value={email}
              onChangeText={setEmail}
              style={styles.inputWithIcon}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Lock size={20} color={AntigravityTheme.colors.textSecondary} style={styles.inputIcon} />
            <Input
              type="password"
              placeholder="Sua senha"
              value={password}
              onChangeText={setPassword}
              style={styles.inputWithIcon}
            />
          </View>

          <TouchableOpacity>
            <Text style={styles.forgotPasswordText}>
              Esqueci minha senha
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footerContainer}>
          <Button fullWidth onPress={handleLogin}>
            Entrar
          </Button>

          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>
              Não tem uma conta?{' '}
            </Text>
            <TouchableOpacity onPress={() => router.push('/signup')}>
              <Text style={styles.signupLinkText}>
                Cadastre-se
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AntigravityTheme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 32,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 32,
  },
  title: {
    ...AntigravityTheme.typography.xl,
    fontWeight: AntigravityTheme.typography.fontWeight.bold,
    color: AntigravityTheme.colors.text,
    marginBottom: 8,
  },
  subtitle: {
    ...AntigravityTheme.typography.base,
    color: AntigravityTheme.colors.textSecondary,
  },
  formContainer: {
    gap: 16,
    marginBottom: 32,
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
    zIndex: 1,
  },
  inputWithIcon: {
    paddingLeft: 48,
  },
  forgotPasswordText: {
    ...AntigravityTheme.typography.sm,
    fontWeight: AntigravityTheme.typography.fontWeight.medium,
    color: '#2563EB',
  },
  footerContainer: {
    gap: 12,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  signupText: {
    ...AntigravityTheme.typography.sm,
    color: AntigravityTheme.colors.textSecondary,
  },
  signupLinkText: {
    ...AntigravityTheme.typography.sm,
    fontWeight: AntigravityTheme.typography.fontWeight.medium,
    color: '#2563EB',
  },
});
