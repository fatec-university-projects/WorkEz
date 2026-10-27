import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import {
  Upload,
  FileText,
  Home,
  CreditCard,
  Shield,
  CheckCircle,
  AlertCircle,
} from 'lucide-react-native';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { WorkEzTheme, LightColors } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useFetch } from '../../hooks/useFetch';
import { ScreenHeader } from '../../components/ScreenHeader';
import {
  documentService,
  applyCNPJMask,
  isValidCNPJ,
} from '../../services/documentService';

interface DocumentStatus {
  id: string;
  type: 'rg' | 'cpf' | 'address' | 'bank' | 'criminal';
  label: string;
  required: boolean;
  status: 'pending' | 'uploaded' | 'verified' | 'rejected';
  fileName?: string;
  details?: string;
  errorMessage?: string;
}

export default function DocumentVerification() {
  const router = useRouter();
  const { user } = useAuth();

  const { data: rawProvider, loading, error } = useFetch<any>(
    user ? `/api/ServiceProviders/by-user/${user.id}` : null
  );
  const { data: rawUser } = useFetch<any>(
    user ? `/api/Users/${user.id}` : null
  );

  const [cnpjNumber, setCnpjNumber] = useState('');
  const [validatingDocId, setValidatingDocId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentStatus[]>([
    { id: '1', type: 'rg', label: 'RG ou CNH (PDF)', required: true, status: 'pending' },
    { id: '2', type: 'cpf', label: 'Cartão CNPJ / CCMEI (PDF)', required: true, status: 'pending' },
    { id: '3', type: 'address', label: 'Comprovante de residência (PDF)', required: true, status: 'pending' },
    { id: '4', type: 'bank', label: 'Dados bancários', required: true, status: 'pending' },
    { id: '5', type: 'criminal', label: 'Antecedentes criminais (PDF)', required: false, status: 'pending' },
  ]);

  useEffect(() => {
    const docNum = rawProvider?.documentNumber || rawUser?.documentNumber;
    if (docNum) {
      setCnpjNumber(applyCNPJMask(docNum));
    }
    if (rawProvider?.documentVerified || rawUser?.documentNumber) {
      setDocuments((prev) =>
        prev.map((doc) =>
          doc.type === 'cpf'
            ? { ...doc, status: 'verified', details: 'CNPJ verificado no cadastro' }
            : doc
        )
      );
    }
  }, [rawProvider, rawUser]);

  const getIconForDoc = (type: string) => {
    switch (type) {
      case 'rg': return FileText;
      case 'cpf': return FileText;
      case 'address': return Home;
      case 'bank': return CreditCard;
      case 'criminal': return Shield;
      default: return FileText;
    }
  };

  const handleUploadDoc = async (doc: DocumentStatus) => {
    const picked = await documentService.pickPdfDocument();
    if (picked.canceled) return;

    if (picked.error || !picked.file) {
      setDocuments((prev) =>
        prev.map((item) =>
          item.id === doc.id
            ? {
                ...item,
                status: 'rejected',
                errorMessage: picked.error || 'Arquivo PDF inválido.',
              }
            : item
        )
      );
      return;
    }

    if (doc.type === 'cpf') {
      const cleanCnpj = cnpjNumber.replace(/\D/g, '');
      if (!isValidCNPJ(cleanCnpj)) {
        setDocuments((prev) =>
          prev.map((item) =>
            item.id === doc.id
              ? {
                  ...item,
                  status: 'rejected',
                  errorMessage: 'Informe um CNPJ válido no campo acima antes de enviar o PDF.',
                }
              : item
          )
        );
        return;
      }

      setValidatingDocId(doc.id);
      try {
        const res = await documentService.verifyDocumentPdf(
          picked.file,
          cleanCnpj,
          'provider'
        );

        if (res.error || !res.data || !res.data.isValid) {
          setDocuments((prev) =>
            prev.map((item) =>
              item.id === doc.id
                ? {
                    ...item,
                    status: 'rejected',
                    fileName: picked.file?.name,
                    errorMessage:
                      res.data?.message ||
                      res.error ||
                      'O CNPJ do PDF não coincide com o CNPJ informado.',
                  }
                : item
            )
          );
          return;
        }

        setDocuments((prev) =>
          prev.map((item) =>
            item.id === doc.id
              ? {
                  ...item,
                  status: 'verified',
                  fileName: picked.file?.name,
                  details: `${res.data?.metadata?.pageCount ?? 1} pág(s) • Validado`,
                  errorMessage: undefined,
                }
              : item
          )
        );
      } finally {
        setValidatingDocId(null);
      }
    } else {
      setDocuments((prev) =>
        prev.map((item) =>
          item.id === doc.id
            ? {
                ...item,
                status: 'uploaded',
                fileName: picked.file?.name,
                details: 'PDF recebido para análise',
                errorMessage: undefined,
              }
            : item
        )
      );
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Verificação de documentos"
        subtitle="Envie seus documentos em PDF para validação"
        showBack
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.cnpjBox}>
          <Text style={styles.cnpjLabel}>CNPJ para auditoria do PDF:</Text>
          <Input
            placeholder="00.000.000/0000-00"
            value={cnpjNumber}
            onChangeText={(val) => setCnpjNumber(applyCNPJMask(val))}
            keyboardType="numeric"
            maxLength={18}
          />
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={LightColors.primary} />
            <Text style={styles.loadingText}>Verificando documentos...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <View style={styles.docsList}>
            {documents.map((doc) => {
              const Icon = getIconForDoc(doc.type);
              const isVerified = doc.status === 'verified';
              const isUploaded = doc.status === 'uploaded';
              const isRejected = doc.status === 'rejected';
              const isValidating = validatingDocId === doc.id;

              return (
                <TouchableOpacity
                  key={doc.id}
                  style={[
                    styles.docCard,
                    isVerified && styles.docCardVerified,
                    isUploaded && styles.docCardUploaded,
                    isRejected && styles.docCardRejected,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => handleUploadDoc(doc)}
                  disabled={isValidating}
                >
                  <View style={styles.docRow}>
                    <View style={styles.iconWrapper}>
                      <Icon size={24} color={LightColors.textSecondary} />
                    </View>
                    <View style={styles.docInfo}>
                      <Text style={styles.docLabel}>{doc.label}</Text>
                      <Text style={styles.docReq}>
                        {doc.required ? 'Obrigatório' : 'Opcional'}
                        {isVerified && ' • Verificado'}
                        {isUploaded && ' • Em análise'}
                        {isRejected && ' • Divergente'}
                      </Text>
                      {doc.fileName ? (
                        <Text style={styles.docFileText}>
                          {doc.fileName} {doc.details ? `(${doc.details})` : ''}
                        </Text>
                      ) : null}
                      {doc.errorMessage ? (
                        <Text style={styles.docErrorText}>{doc.errorMessage}</Text>
                      ) : null}
                    </View>
                    {isValidating ? (
                      <ActivityIndicator size="small" color="#2563EB" />
                    ) : isVerified ? (
                      <CheckCircle size={20} color={WorkEzTheme.colors.success} />
                    ) : isRejected ? (
                      <AlertCircle size={20} color={WorkEzTheme.colors.danger} />
                    ) : (
                      <Upload size={20} color={WorkEzTheme.colors.primaryDark} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={styles.infoBanner}>
          <Text style={styles.infoText}>
            <Text style={{ fontWeight: '600' }}>Por que verificamos?</Text> A leitura automática de metadados e conteúdo do PDF garante que o CNPJ pertence ao prestador e aumenta sua credibilidade.
          </Text>
        </View>

        <View style={styles.footer}>
          <Button fullWidth onPress={() => router.push('/provider/references')}>
            Continuar
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: WorkEzTheme.spacing.lg,
    flexGrow: 1,
  },
  cnpjBox: {
    marginBottom: 8,
    gap: 8,
  },
  cnpjLabel: {
    ...WorkEzTheme.typography.sm,
    fontWeight: WorkEzTheme.typography.fontWeight.semibold,
    color: WorkEzTheme.colors.text,
  },
  centerContainer: {
    padding: 48,
    alignItems: 'center',
    marginTop: 32,
  },
  loadingText: {
    marginTop: 16,
    color: LightColors.textSecondary,
  },
  errorText: {
    color: LightColors.danger,
    textAlign: 'center',
  },
  docsList: {
    marginTop: 16,
    gap: 16,
  },
  docCard: {
    backgroundColor: LightColors.backgroundAlt,
    borderRadius: WorkEzTheme.borderRadius.xl,
    padding: WorkEzTheme.spacing.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: LightColors.border,
  },
  docCardVerified: {
    borderColor: LightColors.success,
    borderStyle: 'solid',
    backgroundColor: '#F0FDF4',
  },
  docCardUploaded: {
    borderColor: '#2563EB',
    borderStyle: 'solid',
    backgroundColor: '#EFF6FF',
  },
  docCardRejected: {
    borderColor: WorkEzTheme.colors.danger,
    borderStyle: 'solid',
    backgroundColor: '#FEF2F2',
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: WorkEzTheme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docInfo: {
    flex: 1,
  },
  docLabel: {
    ...WorkEzTheme.typography.base,
    fontWeight: WorkEzTheme.typography.fontWeight.medium,
    color: LightColors.text,
  },
  docReq: {
    ...WorkEzTheme.typography.sm,
    color: LightColors.textSecondary,
  },
  docFileText: {
    ...WorkEzTheme.typography.xs,
    color: '#15803D',
    marginTop: 4,
  },
  docErrorText: {
    ...WorkEzTheme.typography.xs,
    color: WorkEzTheme.colors.danger,
    marginTop: 4,
  },
  infoBanner: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: WorkEzTheme.borderRadius.xl,
    padding: WorkEzTheme.spacing.md,
    marginTop: 24,
  },
  infoText: {
    ...WorkEzTheme.typography.sm,
    color: '#1D4ED8',
    lineHeight: 20,
  },
  footer: {
    marginTop: 32,
    marginBottom: 24,
  },
});
