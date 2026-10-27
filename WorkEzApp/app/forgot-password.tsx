import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Mail, CheckCircle, KeyRound } from 'lucide-react-native';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ScreenHeader } from '../components/ScreenHeader';
import { WorkEzTheme } from '../constants/theme';
import { authService, ResetPasswordResponse } from '../services/authService';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetResult, setResetResult] = useState<ResetPasswordResponse | null>(null);

  const validate = (): boolean => {
    if (!email.trim()) {
      setEmailError('E-mail é obrigatório');
      return false;
    }
    if (!isValidEmail(email)) {
      setEmailError('Informe um e-mail válido');
      return false;
    }
    setEmailError(undefined);
    return true;
  };

  const handleResetPassword = async () => {
    setApiError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      const result = await authService.resetPasswordByEmail(email);
      if (result.error) {
        setApiError(result.error);
        return;
      }
      if (result.data) {
        setResetResult(result.data);
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
        title="Recuperar senha"
        subtitle="Informe seu e-mail para redefinir sua senha"
        showBack
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {resetResult ? (
          <View style={styles.successCard}>
            <View style={styles.successIconWrap}>
              <CheckCircle size={40} color={WorkEzTheme.colors.success} />
            </View>
            <Text style={styles.successTitle}>Senha redefinida com sucesso!</Text>
            <Text style={styles.successMessage}>{resetResult.message}</Text>

            <View style={styles.passwordHighlightBox}>
              <KeyRound size={20} color="#1E3A8A" />
              <View>
                <Text style={styles.passwordLabel}>Nova senha padrão:</Text>
                <Text style={styles.passwordValue}>
                  {resetResult.defaultPassword || '@Work1234'}
                </Text>
              </View>
            </View>

            <Button
              variant="primary"
              fullWidth
              onPress={() => router.replace('/login' as any)}
              style={styles.backToLoginButton}
            >
              Voltar para o Login
            </Button>
          </View>
        ) : (
          <>
            <View style={styles.mainContent}>
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  Digite o endereço de e-mail cadastrado na sua conta WorkEz. Sua senha será redefinida automaticamente para a senha padrão do sistema.
                </Text>
              </View>

              <View style={styles.formContainer}>
                <View style={styles.inputWrapper}>
                  <Mail
                    size={20}
                    color={WorkEzTheme.colors.textSecondary}
                    style={styles.inputIcon}
                  />
                  <Input
                    placeholder="Seu e-mail cadastrado"
                    value={email}
                    onChangeText={(val) => {
                      setEmail(val);
                      setEmailError(undefined);
                      setApiError(null);
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    error={emailError}
                    style={styles.inputWithIcon}
                  />
                </View>
              </View>

              {apiError ? (
                <View style={styles.apiErrorContainer}>
                  <Text style={styles.apiErrorText}>{apiError}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.footerContainer}>
              <Button
                variant="secondary"
                fullWidth
                onPress={handleResetPassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#2563EB" size="small" />
                ) : (
                  'Redefinir senha'
                )}
              </Button>
            </View>
          </>
        )}
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
    paddingTop: 16,
    justifyContent: 'space-between',
  },
  mainContent: {
    gap: 16,
  },
  infoBox: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 16,
  },
  infoText: {
    ...WorkEzTheme.typography.sm,
    color: '#1E3A8A',
  },
  formContainer: {
    gap: 16,
    marginBottom: 8,
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
  apiErrorContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
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
    marginTop: 24,
  },
  successCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 14,
    marginTop: 16,
  },
  successIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    ...WorkEzTheme.typography.xl,
    fontWeight: WorkEzTheme.typography.fontWeight.bold,
    color: '#14532D',
    textAlign: 'center',
  },
  successMessage: {
    ...WorkEzTheme.typography.sm,
    color: '#166534',
    textAlign: 'center',
  },
  passwordHighlightBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#93C5FD',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    width: '100%',
    justifyContent: 'center',
    marginVertical: 4,
  },
  passwordLabel: {
    ...WorkEzTheme.typography.xs,
    color: '#1E3A8A',
  },
  passwordValue: {
    ...WorkEzTheme.typography.lg,
    fontWeight: WorkEzTheme.typography.fontWeight.bold,
    color: '#1E3A8A',
    letterSpacing: 0.8,
  },
  backToLoginButton: {
    marginTop: 8,
  },
});
