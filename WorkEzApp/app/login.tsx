import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Mail, Lock } from 'lucide-react-native';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ScreenHeader } from '../components/ScreenHeader';
import {
  View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { WorkEzTheme, LightColors } from '../constants/theme';
import { authService } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';

// ─── Validações ───────────────────────────────────────────────────────────────

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// ─── Login Screen ─────────────────────────────────────────────────────────────

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
      <ScreenHeader
        title="Bem-vindo de volta"
        subtitle="Acesse sua conta para continuar"
        showBack
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.mainContent}>
          <View style={styles.formContainer}>
            <View style={styles.inputWrapper}>
              <Mail size={20} color={LightColors.textSecondary} style={styles.inputIcon} />
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
                autoCorrect={false}
                autoComplete="email"
                error={errors.email}
                style={styles.inputWithIcon}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Lock size={20} color={LightColors.textSecondary} style={styles.inputIcon} />
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
          {apiError ? (
            <View style={styles.apiErrorContainer}>
              <Text style={styles.apiErrorText}>{apiError}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.footerContainer}>
          <Button variant="secondary" fullWidth onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#2563EB" size="small" /> : 'Entrar'}
          </Button>

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
    backgroundColor: LightColors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 16,
    justifyContent: 'space-between',
  },
  mainContent: {
    gap: 16,
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
    color: LightColors.danger,
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
    color: LightColors.textSecondary,
  },
  signupLinkText: {
    ...WorkEzTheme.typography.sm,
    fontWeight: WorkEzTheme.typography.fontWeight.medium,
    color: '#2563EB',
  },
});
