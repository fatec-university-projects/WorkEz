import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ArrowLeft, Mail, Lock } from 'lucide-react-native';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import {
  View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { WorkEzTheme } from '../constants/theme';
import { authService } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';

// ─── Validações ───────────────────────────────────────────────────────────────

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// ─── Login Screen ─────────────────────────────────────────────────────────────
// AUDITORIA FIX:
// - Chama authService.login() real (não bypassa mais para /client)
// - Valida email e senha antes de enviar
// - Redireciona para a rota correta conforme role do JWT
// - "Cadastre-se" vai para /profile-choice (não direto para /signup)

export default function Login() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      newErrors.email = 'E-mail é obrigatório';
    } else if (!isValidEmail(email)) {
      newErrors.email = 'Informe um e-mail válido';
    }
    if (!password) {
      newErrors.password = 'Senha é obrigatória';
    } else if (password.length < 6) {
      newErrors.password = 'A senha deve ter pelo menos 6 caracteres';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    setApiError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      const result = await authService.login(email, password);

      if (result.error) {
        setApiError(result.error);
        return;
      }

      // Recupera usuário decodificado do JWT
      const user = await authService.getUser();
      if (!user) {
        setApiError('Erro ao processar autenticação. Tente novamente.');
        return;
      }

      // Atualiza o contexto global
      signIn(user);

      // Redireciona conforme o papel do usuário
      if (user.role === 'Customer') {
        router.replace('/client' as any);
      } else if (user.role === 'ServiceProvider') {
        router.replace('/provider' as any);
      } else {
        router.replace('/client' as any);
      }
    } finally {
      setLoading(false);
    }
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
            <ArrowLeft size={24} color={WorkEzTheme.colors.text} />
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
            <Mail size={20} color={WorkEzTheme.colors.textSecondary} style={styles.inputIcon} />
            <Input
              placeholder="Seu e-mail"
              value={email}
              onChangeText={(val) => {
                setEmail(val);
                setErrors((e) => ({ ...e, email: undefined }));
                setApiError(null);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={errors.email}
              style={styles.inputWithIcon}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Lock size={20} color={WorkEzTheme.colors.textSecondary} style={styles.inputIcon} />
            <Input
              secureTextEntry
              placeholder="Sua senha"
              value={password}
              onChangeText={(val) => {
                setPassword(val);
                setErrors((e) => ({ ...e, password: undefined }));
                setApiError(null);
              }}
              autoComplete="password"
              error={errors.password}
              style={styles.inputWithIcon}
            />
          </View>

          <TouchableOpacity onPress={() => Alert.alert('Em breve', 'Recuperação de senha disponível em breve.')}>
            <Text style={styles.forgotPasswordText}>
              Esqueci minha senha
            </Text>
          </TouchableOpacity>
        </View>

        {/* Erro da API */}
        {apiError && (
          <View style={styles.apiErrorContainer}>
            <Text style={styles.apiErrorText}>{apiError}</Text>
          </View>
        )}

        <View style={styles.footerContainer}>
          <Button variant="secondary" fullWidth onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#2563EB" size="small" /> : 'Entrar'}
          </Button>

          {/* AUDITORIA FIX: "Cadastre-se" vai para /profile-choice, não /signup */}
          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>
              Não tem uma conta?{' '}
            </Text>
            <TouchableOpacity onPress={() => router.push('/profile-choice')}>
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
    backgroundColor: WorkEzTheme.colors.background,
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
    ...WorkEzTheme.typography.xl,
    fontWeight: WorkEzTheme.typography.fontWeight.bold,
    color: WorkEzTheme.colors.text,
    marginBottom: 8,
  },
  subtitle: {
    ...WorkEzTheme.typography.base,
    color: WorkEzTheme.colors.textSecondary,
  },
  formContainer: {
    gap: 16,
    marginBottom: 16,
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
    ...WorkEzTheme.typography.sm,
    fontWeight: WorkEzTheme.typography.fontWeight.medium,
    color: '#2563EB',
  },
  apiErrorContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  apiErrorText: {
    ...WorkEzTheme.typography.sm,
    color: WorkEzTheme.colors.danger,
    textAlign: 'center',
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
    ...WorkEzTheme.typography.sm,
    color: WorkEzTheme.colors.textSecondary,
  },
  signupLinkText: {
    ...WorkEzTheme.typography.sm,
    fontWeight: WorkEzTheme.typography.fontWeight.medium,
    color: '#2563EB',
  },
});
