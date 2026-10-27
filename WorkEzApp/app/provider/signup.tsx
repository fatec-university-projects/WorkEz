import { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  User,
  Mail,
  Lock,
  Phone,
  FileText,
  Upload,
  CheckCircle,
  AlertCircle,
} from 'lucide-react-native';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { ScreenHeader } from '../../components/ScreenHeader';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { WorkEzTheme, LightColors } from '../../constants/theme';
import { authService } from '../../services/authService';
import {
  documentService,
  applyCNPJMask,
  isValidCNPJ,
  DocumentValidationResultDto,
  PickedPdfFile,
} from '../../services/documentService';
import { useAuth } from '../../contexts/AuthContext';

// ─── Validações & Máscaras ────────────────────────────────────────────────────

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
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

export default function ProviderSignUp() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Estados de verificação do PDF
  const [pickedPdfFile, setPickedPdfFile] = useState<PickedPdfFile | null>(null);
  const [pdfStatus, setPdfStatus] = useState<'idle' | 'validating' | 'verified' | 'error'>('idle');
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [pdfValidationResult, setPdfValidationResult] = useState<DocumentValidationResultDto | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
    setApiError(null);
  };

  const runPdfVerification = async (fileToVerify: PickedPdfFile, cnpjDigits: string) => {
    setPdfFileName(fileToVerify.name);
    setPdfStatus('validating');
    setPdfError(null);

    const verification = await documentService.verifyDocumentPdf(
      fileToVerify,
      cnpjDigits,
      'provider'
    );

    if (verification.error || !verification.data || !verification.data.isValid) {
      setPdfStatus('error');
      setPdfValidationResult(verification.data);
      setPdfError(
        verification.data?.message ||
          verification.error ||
          'O CNPJ do documento PDF não corresponde ao CNPJ informado.'
      );
      return;
    }

    setPdfValidationResult(verification.data);
    setPdfStatus('verified');
  };

  const handleCnpjChange = (value: string) => {
    const masked = applyCNPJMask(value);
    updateField('cnpj', masked);
    const digits = masked.replace(/\D/g, '');
    if (pickedPdfFile && isValidCNPJ(digits)) {
      void runPdfVerification(pickedPdfFile, digits);
    } else if (pdfStatus !== 'idle') {
      setPdfStatus('idle');
      setPdfValidationResult(null);
      setPdfError(null);
    }
  };

  const handlePickAndVerifyPdf = async () => {
    setPdfError(null);

    const picked = await documentService.pickPdfDocument();
    if (picked.canceled) return;
    if (picked.error || !picked.file) {
      setPdfStatus('error');
      setPdfError(picked.error || 'Erro ao selecionar o arquivo PDF.');
      return;
    }

    setPickedPdfFile(picked.file);
    setPdfFileName(picked.file.name);

    const cnpjDigits = formData.cnpj.replace(/\D/g, '');
    if (!isValidCNPJ(cnpjDigits)) {
      setErrors((prev) => ({
        ...prev,
        cnpj: 'Preencha um CNPJ válido para validar o PDF',
      }));
      setPdfStatus('error');
      setPdfError('PDF selecionado! Agora preencha um CNPJ válido no campo acima para validar o arquivo.');
      return;
    }

    await runPdfVerification(picked.file, cnpjDigits);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim() || formData.name.trim().length < 3) {
      newErrors.name = 'Nome deve ter pelo menos 3 caracteres';
    }

    if (!formData.cnpj) {
      newErrors.cnpj = 'CNPJ é obrigatório';
    } else if (!isValidCNPJ(formData.cnpj)) {
      newErrors.cnpj = 'CNPJ inválido';
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

    if (pdfStatus !== 'verified') {
      setPdfError('Envie e valide o PDF do seu Cartão CNPJ / CCMEI para continuar.');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0 && pdfStatus === 'verified';
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
        formData.cnpj,
        true
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
      router.replace('/provider/work-area?onboarding=1' as any);
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
        title="Cadastro de prestador"
        subtitle="Preencha seus dados e valide seu CNPJ"
        showBack
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.formContainer}>
          {/* Nome */}
          <View style={styles.inputWrapper}>
            <User size={20} color={LightColors.textSecondary} style={styles.inputIcon} />
            <Input
              placeholder="Nome completo ou Razão Social"
              value={formData.name}
              onChangeText={(val) => updateField('name', val)}
              autoCapitalize="words"
              autoComplete="name"
              error={errors.name}
              style={styles.inputWithIcon}
            />
          </View>

          {/* CNPJ com máscara e validação */}
          <View style={styles.inputWrapper}>
            <FileText size={20} color={LightColors.textSecondary} style={styles.inputIcon} />
            <Input
              placeholder="CNPJ (00.000.000/0000-00)"
              value={formData.cnpj}
              onChangeText={handleCnpjChange}
              keyboardType="numeric"
              maxLength={18}
              error={errors.cnpj}
              style={styles.inputWithIcon}
            />
          </View>

          {/* Card de Verificação Documental (PDF) */}
          <View style={styles.pdfSection}>
            <Text style={styles.pdfSectionTitle}>
              Verificação Documental (Cartão CNPJ / CCMEI em PDF)
            </Text>
            <Text style={styles.pdfSectionDescription}>
              Envie o PDF do seu Cartão CNPJ ou Certificado MEI (CCMEI). O CNPJ do arquivo será analisado automaticamente e deve coincidir com o CNPJ informado no cadastro.
            </Text>

            {pdfStatus === 'validating' ? (
              <View style={styles.pdfCardValidating}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={styles.pdfValidatingText}>
                  Lendo PDF e verificando metadados...
                </Text>
              </View>
            ) : pdfStatus === 'verified' && pdfValidationResult ? (
              <View style={styles.pdfCardVerified}>
                <View style={styles.pdfVerifiedHeader}>
                  <CheckCircle size={20} color={WorkEzTheme.colors.success} />
                  <Text style={styles.pdfVerifiedTitle}>
                    Documento verificado com sucesso!
                  </Text>
                </View>
                <Text style={styles.pdfMetaText}>
                  Arquivo: {pdfFileName} • {pdfValidationResult.metadata?.pageCount ?? 1} pág(s)
                  {pdfValidationResult.metadata?.producer
                    ? ` • ${pdfValidationResult.metadata.producer}`
                    : ''}
                </Text>
                <TouchableOpacity onPress={handlePickAndVerifyPdf} style={styles.reuploadLink}>
                  <Text style={styles.reuploadLinkText}>Trocar arquivo PDF</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.pdfUploadButton,
                  pdfStatus === 'error' && styles.pdfUploadButtonError,
                ]}
                onPress={handlePickAndVerifyPdf}
                activeOpacity={0.8}
              >
                <Upload size={20} color="#2563EB" />
                <Text style={styles.pdfUploadButtonText}>
                  {pdfStatus === 'error'
                    ? 'Enviar outro arquivo PDF (máx. 5MB)'
                    : 'Selecionar documento PDF (máx. 5MB)'}
                </Text>
              </TouchableOpacity>
            )}

            {pdfStatus === 'error' && pdfError ? (
              <View style={styles.pdfErrorCard}>
                <AlertCircle size={18} color={WorkEzTheme.colors.danger} />
                <Text style={styles.pdfErrorText}>{pdfError}</Text>
              </View>
            ) : null}

            {pdfValidationResult?.metadata ? (
              <View style={{ marginTop: 10, padding: 10, backgroundColor: '#F8FAFC', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                  Diagnóstico de Metadados do PDF:
                </Text>
                <Text style={{ fontSize: 11, color: '#475569', lineHeight: 16 }}>
                  • Esperado (limpo): {pdfValidationResult.metadata.customMetadata?.ExpectedCleanDigits || pdfValidationResult.expectedDocumentNumber.replace(/\D/g, '')}{'\n'}
                  • Extraído do PDF (limpo): {pdfValidationResult.metadata.customMetadata?.FoundCleanCandidates || pdfValidationResult.extractedDocumentNumber?.replace(/\D/g, '') || '(nenhum)'}{'\n'}
                  • Páginas: {pdfValidationResult.metadata.pageCount ?? 1}{'\n'}
                  • Título: {pdfValidationResult.metadata.title || '(vazio)'}{'\n'}
                  • Autor: {pdfValidationResult.metadata.author || '(vazio)'}{'\n'}
                  • Assunto: {pdfValidationResult.metadata.subject || '(vazio)'}{'\n'}
                  • Palavras-chave: {pdfValidationResult.metadata.keywords || '(vazio)'}{'\n'}
                  • Criador: {pdfValidationResult.metadata.creator || '(vazio)'}{'\n'}
                  • Produtor: {pdfValidationResult.metadata.producer || '(vazio)'}{'\n'}
                  • Caracteres extraídos: {pdfValidationResult.metadata.extractedTextLength ?? 0}
                  {pdfValidationResult.metadata.extractedTextPreview
                    ? `\n• Prévia: "${pdfValidationResult.metadata.extractedTextPreview.slice(0, 140)}"`
                    : '\n• Prévia: (nenhum texto selecionável encontrado no PDF)'}
                </Text>
              </View>
            ) : null}
          </View>

          {/* E-mail */}
          <View style={styles.inputWrapper}>
            <Mail size={20} color={LightColors.textSecondary} style={styles.inputIcon} />
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
            <Phone size={20} color={LightColors.textSecondary} style={styles.inputIcon} />
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
            <Lock size={20} color={LightColors.textSecondary} style={styles.inputIcon} />
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
            <Lock size={20} color={LightColors.textSecondary} style={styles.inputIcon} />
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

        <Button
          variant="secondary"
          fullWidth
          onPress={handleContinue}
          disabled={loading || pdfStatus !== 'verified'}
          style={styles.button}
        >
          {loading ? <ActivityIndicator color="#2563EB" size="small" /> : 'Continuar'}
        </Button>
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
  pdfSection: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  pdfSectionTitle: {
    ...WorkEzTheme.typography.sm,
    fontWeight: WorkEzTheme.typography.fontWeight.bold,
    color: WorkEzTheme.colors.text,
  },
  pdfSectionDescription: {
    ...WorkEzTheme.typography.xs,
    color: WorkEzTheme.colors.textSecondary,
    lineHeight: 18,
  },
  pdfUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#93C5FD',
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    marginTop: 4,
  },
  pdfUploadButtonError: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  pdfUploadButtonText: {
    ...WorkEzTheme.typography.sm,
    fontWeight: WorkEzTheme.typography.fontWeight.semibold,
    color: '#2563EB',
  },
  pdfCardValidating: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  pdfValidatingText: {
    ...WorkEzTheme.typography.sm,
    color: '#1E3A8A',
    fontWeight: WorkEzTheme.typography.fontWeight.medium,
  },
  pdfCardVerified: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  pdfVerifiedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pdfVerifiedTitle: {
    ...WorkEzTheme.typography.sm,
    fontWeight: WorkEzTheme.typography.fontWeight.bold,
    color: '#15803D',
  },
  pdfMetaText: {
    ...WorkEzTheme.typography.xs,
    color: '#166534',
  },
  reuploadLink: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  reuploadLinkText: {
    ...WorkEzTheme.typography.xs,
    fontWeight: WorkEzTheme.typography.fontWeight.semibold,
    color: '#2563EB',
  },
  pdfErrorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 12,
  },
  pdfErrorText: {
    ...WorkEzTheme.typography.xs,
    color: WorkEzTheme.colors.danger,
    flex: 1,
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
    color: LightColors.danger,
    textAlign: 'center',
  },
  button: {
    marginTop: 8,
    marginBottom: 24,
  },
});
