import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ArrowLeft, User, Mail, Lock, Phone } from 'lucide-react-native';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import {
  View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { WorkEzTheme } from '../constants/theme';
import { authService } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';

// ─── Validações & Máscaras ────────────────────────────────────────────────────

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Máscara dinâmica: celular (00) 00000-0000 ou fixo (00) 0000-0000 */
function applyPhoneMask(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    // Fixo: (00) 0000-0000
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  // Celular: (00) 00000-0000
  return digits
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

// ─── SignUp Screen ─────────────────────────────────────────────────────────────
// AUDITORIA FIX:
// - Lê o role selecionado na tela de profile-choice
// - Se role não definido → redireciona para /profile-choice
// - Chama o endpoint correto (customer ou provider)
// - Valida todos os campos antes de enviar
// - Máscaras em telefone

export default function SignUp() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [selectedRole, setSelectedRole] = useState<'client' | 'provider' | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Carrega o papel escolhido
  useEffect(() => {
    authService.getSelectedRole().then((role) => {
      if (!role) {
        // Sem papel definido: força escolha
        router.replace('/profile-choice');
      } else {
        setSelectedRole(role);
      }
    });
  }, []);

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
    setApiError(null);
  };

  const handlePhoneChange = (value: string) => {
    updateField('phone', applyPhoneMask(value));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim() || formData.name.trim().length < 3) {
      newErrors.name = 'Nome deve ter pelo menos 3 caracteres';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'E-mail é obrigatório';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Informe um e-mail válido';
    }

    if (!formData.phone) {
      newErrors.phone = 'Telefone é obrigatório';
    } else {
      const digits = formData.phone.replace(/\D/g, '');
      if (digits.length < 10) {
        newErrors.phone = 'Informe um telefone válido';
      }
    }

    if (!formData.password) {
      newErrors.password = 'Senha é obrigatória';
    } else if (formData.password.length < 8) {
      newErrors.password = 'A senha deve ter pelo menos 8 caracteres';
    }

    if (formData.confirmPassword !== formData.password) {
      newErrors.confirmPassword = 'As senhas não coincidem';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
    setApiError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      let result;
      if (selectedRole === 'provider') {
        result = await authService.registerProvider(
          formData.name,
          formData.email,
          formData.password,
          formData.phone,
        );
      } else {
        result = await authService.registerCustomer(
          formData.name,
          formData.email,
          formData.password,
          formData.phone,
        );
      }

      if (result.error) {
        setApiError(result.error);
        return;
      }

      // Registro bem-sucedido: faz login automático
      const loginResult = await authService.login(formData.email, formData.password);
      if (loginResult.error) {
        // Registro OK mas login falhou: vai para tela de login
        router.replace('/login');
        return;
      }

      const user = await authService.getUser();
      if (user) signIn(user);

      if (selectedRole === 'provider') {
        router.replace('/provider/work-area' as any);
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
            {selectedRole === 'provider' ? 'Seja um prestador' : 'Criar conta'}
          </Text>
          <Text style={styles.subtitle}>
            Preencha seus dados para começar
          </Text>
        </View>

        <View style={styles.formContainer}>
          {/* Nome */}
          <View style={styles.inputWrapper}>
            <User size={20} color={WorkEzTheme.colors.textSecondary} style={styles.inputIcon} />
            <Input
              placeholder="Nome completo"
              value={formData.name}
              onChangeText={(val) => updateField('name', val)}
              autoCapitalize="words"
              autoComplete="name"
              error={errors.name}
              style={styles.inputWithIcon}
            />
          </View>

          {/* E-mail */}
          <View style={styles.inputWrapper}>
            <Mail size={20} color={WorkEzTheme.colors.textSecondary} style={styles.inputIcon} />
            <Input
              placeholder="E-mail"
              value={formData.email}
              onChangeText={(val) => updateField('email', val.trim().toLowerCase())}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={errors.email}
              style={styles.inputWithIcon}
            />
          </View>

          {/* Telefone com máscara */}
          <View style={styles.inputWrapper}>
            <Phone size={20} color={WorkEzTheme.colors.textSecondary} style={styles.inputIcon} />
            <Input
              placeholder="Telefone (00) 00000-0000"
              value={formData.phone}
              onChangeText={handlePhoneChange}
              keyboardType="phone-pad"
              autoComplete="tel"
              maxLength={15}
              error={errors.phone}
              style={styles.inputWithIcon}
            />
          </View>

          {/* Senha */}
          <View style={styles.inputWrapper}>
            <Lock size={20} color={WorkEzTheme.colors.textSecondary} style={styles.inputIcon} />
            <Input
              secureTextEntry
              placeholder="Criar senha (mín. 8 caracteres)"
              value={formData.password}
              onChangeText={(val) => updateField('password', val)}
              autoComplete="new-password"
              error={errors.password}
              style={styles.inputWithIcon}
            />
          </View>

          {/* Confirmar Senha */}
          <View style={styles.inputWrapper}>
            <Lock size={20} color={WorkEzTheme.colors.textSecondary} style={styles.inputIcon} />
            <Input
              secureTextEntry
              placeholder="Confirmar senha"
              value={formData.confirmPassword}
              onChangeText={(val) => updateField('confirmPassword', val)}
              autoComplete="new-password"
              error={errors.confirmPassword}
              style={styles.inputWithIcon}
            />
          </View>
        </View>

        {/* Erro da API */}
        {apiError && (
          <View style={styles.apiErrorContainer}>
            <Text style={styles.apiErrorText}>{apiError}</Text>
          </View>
        )}

        <View style={styles.footerContainer}>
          <Button variant="secondary" fullWidth onPress={handleSignUp} disabled={loading}>
            {loading ? <ActivityIndicator color="#2563EB" size="small" /> : 'Criar conta'}
          </Button>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>
              Já tem uma conta?{' '}
            </Text>
            <TouchableOpacity onPress={() => router.push('/login')}>
              <Text style={styles.loginLinkText}>
                Entrar
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
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  loginText: {
    ...WorkEzTheme.typography.sm,
    color: WorkEzTheme.colors.textSecondary,
  },
  loginLinkText: {
    ...WorkEzTheme.typography.sm,
    fontWeight: WorkEzTheme.typography.fontWeight.medium,
    color: '#2563EB',
  },
});
