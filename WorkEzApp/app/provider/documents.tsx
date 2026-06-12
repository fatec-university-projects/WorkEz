import { useRouter } from 'expo-router';
import { ArrowLeft, Upload, FileText, Home, CreditCard, Shield, CheckCircle } from 'lucide-react-native';
import { Button } from '../../components/Button';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { WorkEzTheme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useFetch } from '../../hooks/useFetch';

interface DocumentStatus {
  id: string;
  type: 'rg' | 'cpf' | 'address' | 'bank' | 'criminal';
  label: string;
  required: boolean;
  status: 'pending' | 'uploaded' | 'verified' | 'rejected';
}

export default function DocumentVerification() {
  const router = useRouter();
  const { user } = useAuth();

  const { data: rawProvider, loading, error } = useFetch<any>(
    user ? `/api/ServiceProviders/by-user/${user.id}` : null
  );

  const userDocs: DocumentStatus[] = [
    { id: '1', type: 'rg', label: 'RG ou CNH', required: true, status: 'pending' },
    { id: '2', type: 'cpf', label: 'CPF', required: true, status: 'pending' },
    { id: '3', type: 'address', label: 'Comprovante de residência', required: true, status: 'pending' },
    { id: '4', type: 'bank', label: 'Dados bancários', required: true, status: 'pending' },
    { id: '5', type: 'criminal', label: 'Antecedentes criminais', required: false, status: 'pending' },
  ];

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

  const defaultDocuments: DocumentStatus[] = [
    { id: '1', type: 'rg', label: 'RG ou CNH', required: true, status: 'pending' },
    { id: '2', type: 'cpf', label: 'CPF', required: true, status: 'pending' },
    { id: '3', type: 'address', label: 'Comprovante de residência', required: true, status: 'pending' },
    { id: '4', type: 'bank', label: 'Dados bancários', required: true, status: 'pending' },
    { id: '5', type: 'criminal', label: 'Antecedentes criminais', required: false, status: 'pending' },
  ];

  const documents = userDocs || defaultDocuments;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.8}
        >
          <ArrowLeft size={24} color={WorkEzTheme.colors.text} />
        </TouchableOpacity>

        <Text style={styles.title}>
          Verificação de documentos
        </Text>
        <Text style={styles.subtitle}>
          Envie seus documentos para validação
        </Text>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={WorkEzTheme.colors.primary} />
            <Text style={styles.loadingText}>Verificando documentos...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <View style={styles.docsList}>
            {documents.map((doc, index) => {
              const Icon = getIconForDoc(doc.type);
              const isVerified = doc.status === 'verified';
              const isUploaded = doc.status === 'uploaded';

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.docCard,
                    isVerified && styles.docCardVerified,
                    isUploaded && styles.docCardUploaded
                  ]}
                  activeOpacity={0.8}
                >
                  <View style={styles.docRow}>
                    <View style={styles.iconWrapper}>
                      <Icon size={24} color={WorkEzTheme.colors.textSecondary} />
                    </View>
                    <View style={styles.docInfo}>
                      <Text style={styles.docLabel}>{doc.label}</Text>
                      <Text style={styles.docReq}>
                        {doc.required ? 'Obrigatório' : 'Opcional'}
                        {isVerified && ' • Verificado'}
                        {isUploaded && ' • Em análise'}
                      </Text>
                    </View>
                    {isVerified ? (
                      <CheckCircle size={20} color={WorkEzTheme.colors.success} />
                    ) : (
                      <Upload size={20} color={WorkEzTheme.colors.primary} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={styles.infoBanner}>
          <Text style={styles.infoText}>
            <Text style={{ fontWeight: '600' }}>Por que verificamos?</Text> A verificação de documentos garante a segurança de todos os usuários e aumenta sua credibilidade.
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
  backButton: {
    padding: WorkEzTheme.spacing.sm,
    backgroundColor: WorkEzTheme.colors.backgroundAlt,
    borderRadius: WorkEzTheme.borderRadius.lg,
    alignSelf: 'flex-start',
  },
  title: {
    ...WorkEzTheme.typography['3xl'],
    fontWeight: WorkEzTheme.typography.fontWeight.bold,
    color: WorkEzTheme.colors.text,
    marginTop: 32,
    marginBottom: 8,
  },
  subtitle: {
    ...WorkEzTheme.typography.base,
    color: WorkEzTheme.colors.textSecondary,
  },
  centerContainer: {
    padding: 48,
    alignItems: 'center',
    marginTop: 32,
  },
  loadingText: {
    marginTop: 16,
    color: WorkEzTheme.colors.textSecondary,
  },
  errorText: {
    color: WorkEzTheme.colors.danger,
    textAlign: 'center',
  },
  docsList: {
    marginTop: 32,
    gap: 16,
  },
  docCard: {
    backgroundColor: WorkEzTheme.colors.backgroundAlt,
    borderRadius: WorkEzTheme.borderRadius.xl,
    padding: WorkEzTheme.spacing.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: WorkEzTheme.colors.border,
  },
  docCardVerified: {
    borderColor: WorkEzTheme.colors.success,
    borderStyle: 'solid',
    backgroundColor: '#F0FDF4',
  },
  docCardUploaded: {
    borderColor: WorkEzTheme.colors.primary,
    borderStyle: 'solid',
    backgroundColor: '#EFF6FF',
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
    color: WorkEzTheme.colors.text,
  },
  docReq: {
    ...WorkEzTheme.typography.sm,
    color: WorkEzTheme.colors.textSecondary,
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
