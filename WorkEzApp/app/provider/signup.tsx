import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ArrowLeft, User, Mail, Lock, Phone, FileText } from 'lucide-react-native';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import {
  View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { WorkEzTheme } from '../../constants/theme';
import { authService } from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';

// ─── Validações & Máscaras ────────────────────────────────────────────────────

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Valida CPF com dígitos verificadores */
function isValidCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1+$/.test(digits)) return false; // 111.111.111-11 etc.

  const calcDigit = (d: string, len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) {
      sum += parseInt(d[i]) * (len + 1 - i);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  return (
    calcDigit(digits, 9) === parseInt(digits[9]) &&
    calcDigit(digits, 10) === parseInt(digits[10])
  );
}

/** Máscara CPF: 000.000.000-00 */
function applyCPFMask(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

/** Máscara dinâmica telefone: (00) 00000-0000 ou (00) 0000-0000 */
function applyPhoneMask(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

// ─── Provider SignUp ──────────────────────────────────────────────────────────
// AUDITORIA FIX:
// - Import correto de 'Mail' adicionado
// - CPF com máscara 000.000.000-00 e validação algorítmica
// - Telefone com máscara dinâmica
// - Validação de todos os campos
// - Chama API real: authService.registerProvider()

export default function ProviderSignUp() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
    setApiError(null);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim() || formData.name.trim().length < 3) {
      newErrors.name = 'Nome deve ter pelo menos 3 caracteres';
    }

    if (!formData.cpf) {
      newErrors.cpf = 'CPF é obrigatório';
    } else if (!isValidCPF(formData.cpf)) {
      newErrors.cpf = 'CPF inválido';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'E-mail é obrigatório';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Informe um e-mail válido';
    }

    if (!formData.phone) {
      newErrors.phone = 'Telefone é obrigatório';
    } else if (formData.phone.replace(/\D/g, '').length < 10) {
      newErrors.phone = 'Informe um telefone válido';
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

  const handleContinue = async () => {
    setApiError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      const result = await authService.registerProvider(
        formData.name,
        formData.email,
        formData.password,
        formData.phone,
        formData.cpf,
      );

      if (result.error) {
        setApiError(result.error);
        return;
      }

      // Faz login automático após registro
      const loginResult = await authService.login(formData.email, formData.password);
      if (loginResult.error) {
        router.replace('/login' as any);
        return;
      }

      const user = await authService.getUser();
      if (user) signIn(user);

      // Continua para próximas etapas do prestador
      router.push('/provider/work-area' as any);
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
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={WorkEzTheme.colors.text} />
        </TouchableOpacity>

        <Text style={styles.title}>Cadastro de prestador</Text>
        <Text style={styles.subtitle}>Preencha seus dados para começar</Text>

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

          {/* CPF com máscara e validação */}
          <View style={styles.inputWrapper}>
            <FileText size={20} color={WorkEzTheme.colors.textSecondary} style={styles.inputIcon} />
            <Input
              placeholder="CPF (000.000.000-00)"
              value={formData.cpf}
              onChangeText={(val) => updateField('cpf', applyCPFMask(val))}
              keyboardType="numeric"
              maxLength={14}
              error={errors.cpf}
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
              onChangeText={(val) => updateField('phone', applyPhoneMask(val))}
              keyboardType="phone-pad"
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

        {/* Aviso de próximos passos */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            <Text style={styles.infoTextBold}>Próximos passos:</Text>
            {' '}Após o cadastro, você informará sua área de atuação e anos de experiência, e já poderá visualizar chamados imediatamente.
          </Text>
        </View>

        {/* Erro da API */}
        {apiError && (
          <View style={styles.apiErrorContainer}>
            <Text style={styles.apiErrorText}>{apiError}</Text>
          </View>
        )}

        <Button fullWidth onPress={handleContinue} disabled={loading} style={styles.button}>
          {loading ? <ActivityIndicator color="#fff" size="small" /> : 'Continuar'}
        </Button>
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
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 32,
    marginTop: 8,
  },
  title: {
    ...WorkEzTheme.typography['2xl'],
    fontWeight: WorkEzTheme.typography.fontWeight.bold,
    color: WorkEzTheme.colors.text,
    marginBottom: 8,
  },
  subtitle: {
    ...WorkEzTheme.typography.base,
    color: WorkEzTheme.colors.textSecondary,
    marginBottom: 32,
  },
  formContainer: {
    gap: 16,
    marginBottom: 24,
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
  infoBox: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoText: {
    ...WorkEzTheme.typography.sm,
    color: '#1d4ed8',
  },
  infoTextBold: {
    fontWeight: WorkEzTheme.typography.fontWeight.semibold,
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
  button: {
    marginTop: 8,
    marginBottom: 24,
  },
});
