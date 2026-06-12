import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Clipboard,
  Image,
} from 'react-native';
import { ArrowLeft, CheckCircle, Clock, Copy, QrCode, RefreshCw, XCircle } from 'lucide-react-native';
import { paymentService, CreatePaymentResponse } from '../../../services/paymentService';
import { WorkEzTheme } from '../../../constants/theme';

const POLL_INTERVAL_MS = 5000; // Poll every 5 seconds

export default function Payment() {
  const router                        = useRouter();
  const { id: appointmentId }         = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading]         = useState(true);
  const [payment, setPayment]         = useState<CreatePaymentResponse | null>(null);
  const [status, setStatus]           = useState<string>('Pending');
  const [error, setError]             = useState<string | null>(null);
  const [copied, setCopied]           = useState(false);
  const [polling, setPolling]         = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Create billing on mount ────────────────────────────────────────────────
  useEffect(() => {
    if (!appointmentId) return;

    (async () => {
      setLoading(true);
      const { data, error: err } = await paymentService.createPayment(appointmentId);
      if (err || !data) {
        setError(err ?? 'Não foi possível criar o pagamento.');
      } else {
        setPayment(data);
        setStatus(data.status);
        if (data.status === 'Pending') startPolling(data.paymentId);
      }
      setLoading(false);
    })();

    return () => stopPolling();
  }, [appointmentId]);

  // ── Polling ────────────────────────────────────────────────────────────────
  const startPolling = useCallback((paymentId: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      setPolling(true);
      const { data } = await paymentService.getPaymentStatus(paymentId);
      if (data) {
        setStatus(data.status);
        if (data.status !== 'Pending') {
          stopPolling();
          if (data.status === 'Paid') {
            setTimeout(() => router.push('/client/completed/1'), 1200);
          }
        }
      }
      setPolling(false);
    }, POLL_INTERVAL_MS);
  }, [router]);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  // ── Copy PIX code ──────────────────────────────────────────────────────────
  const copyPixCode = () => {
    if (!payment?.pixCode) return;
    Clipboard.setString(payment.pixCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Status helpers ────────────────────────────────────────────────────────
  const isPaid    = status === 'Paid';
  const isExpired = status === 'Expired' || status === 'Cancelled';

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={WorkEzTheme.colors.primary} />
        <Text style={styles.loadingText}>Gerando cobrança PIX...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <XCircle size={48} color={WorkEzTheme.colors.danger} />
        <Text style={styles.errorTitle}>Erro ao criar pagamento</Text>
        <Text style={styles.errorDesc}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
          <Text style={styles.retryText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isPaid) {
    return (
      <View style={styles.centered}>
        <CheckCircle size={64} color={WorkEzTheme.colors.primary} />
        <Text style={styles.successTitle}>Pagamento confirmado!</Text>
        <Text style={styles.successDesc}>
          Seu pagamento foi recebido. Redirecionando...
        </Text>
      </View>
    );
  }

  if (isExpired) {
    return (
      <View style={styles.centered}>
        <XCircle size={64} color={WorkEzTheme.colors.danger} />
        <Text style={styles.errorTitle}>Pagamento expirado</Text>
        <Text style={styles.errorDesc}>O prazo para pagamento se encerrou.</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
          <Text style={styles.retryText}>Voltar e tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={WorkEzTheme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pagamento via PIX</Text>
        {polling && <ActivityIndicator size="small" color={WorkEzTheme.colors.primary} />}
      </View>

      <View style={styles.content}>
        {/* Amount */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Valor a pagar</Text>
          <Text style={styles.amountValue}>
            R$ {payment?.amount?.toFixed(2).replace('.', ',')}
          </Text>
          {payment?.expiresAt && (
            <View style={styles.expiryRow}>
              <Clock size={14} color="rgba(255,255,255,0.7)" />
              <Text style={styles.expiryText}>
                Expira em {new Date(payment.expiresAt).toLocaleTimeString('pt-BR', {
                  hour: '2-digit', minute: '2-digit',
                })}
              </Text>
            </View>
          )}
        </View>

        {/* QR Code */}
        {payment?.pixQrCode ? (
          <View style={styles.qrCard}>
            <View style={styles.qrHeader}>
              <QrCode size={20} color={WorkEzTheme.colors.text} />
              <Text style={styles.qrTitle}>QR Code PIX</Text>
            </View>
            <Text style={styles.qrDesc}>
              Abra seu banco, escolha pagar via PIX e escaneie o código abaixo
            </Text>
            <View style={styles.qrImageWrapper}>
              <Image
                source={{ uri: `data:image/png;base64,${payment.pixQrCode}` }}
                style={styles.qrImage}
                resizeMode="contain"
              />
            </View>
          </View>
        ) : (
          <View style={styles.qrCard}>
            <View style={styles.qrHeader}>
              <QrCode size={20} color={WorkEzTheme.colors.text} />
              <Text style={styles.qrTitle}>QR Code PIX</Text>
            </View>
            <View style={styles.qrPlaceholder}>
              <RefreshCw size={32} color={WorkEzTheme.colors.textSecondary} />
              <Text style={styles.qrPlaceholderText}>
                QR Code gerado pelo gateway. Acesse o link abaixo para pagar.
              </Text>
            </View>
          </View>
        )}

        {/* PIX Copia e Cola */}
        {payment?.pixCode && (
          <View style={styles.pixCodeCard}>
            <Text style={styles.pixCodeLabel}>PIX Copia e Cola</Text>
            <View style={styles.pixCodeRow}>
              <Text style={styles.pixCodeValue} numberOfLines={2} ellipsizeMode="middle">
                {payment.pixCode}
              </Text>
              <TouchableOpacity style={styles.copyBtn} onPress={copyPixCode}>
                <Copy size={18} color={copied ? WorkEzTheme.colors.primary : WorkEzTheme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {copied && (
              <Text style={styles.copiedText}>✓ Copiado para a área de transferência!</Text>
            )}
          </View>
        )}

        {/* Payment link fallback */}
        {payment?.paymentUrl && !payment.pixCode && (
          <TouchableOpacity
            style={styles.linkBtn}
            onPress={() => Alert.alert('Link de pagamento', payment.paymentUrl ?? '')}
          >
            <Text style={styles.linkBtnText}>Abrir página de pagamento</Text>
          </TouchableOpacity>
        )}

        {/* Status indicator */}
        <View style={styles.statusCard}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>
            Aguardando confirmação do pagamento...
          </Text>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>Como pagar</Text>
          {[
            '1. Abra o aplicativo do seu banco',
            '2. Selecione a opção PIX',
            '3. Escaneie o QR Code ou use o código copia e cola',
            '4. Confirme o pagamento de R$ ' + payment?.amount?.toFixed(2).replace('.', ','),
            '5. Aguarde a confirmação automática',
          ].map((step, i) => (
            <Text key={i} style={styles.instructionStep}>{step}</Text>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    flexGrow: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    color: WorkEzTheme.colors.textSecondary,
    marginTop: 8,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: WorkEzTheme.colors.text,
    textAlign: 'center',
  },
  errorDesc: {
    color: WorkEzTheme.colors.textSecondary,
    textAlign: 'center',
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: WorkEzTheme.colors.text,
    textAlign: 'center',
    marginTop: 8,
  },
  successDesc: {
    color: WorkEzTheme.colors.textSecondary,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: WorkEzTheme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 8,
  },
  retryText: {
    color: '#FFF',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: WorkEzTheme.colors.backgroundCard,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: WorkEzTheme.colors.border,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    ...WorkEzTheme.typography.xl,
    fontWeight: WorkEzTheme.typography.fontWeight.semibold,
    color: WorkEzTheme.colors.text,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  amountCard: {
    backgroundColor: WorkEzTheme.colors.primary,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  amountLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 4,
  },
  amountValue: {
    color: '#FFF',
    fontSize: 40,
    fontWeight: 'bold',
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  expiryText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
  qrCard: {
    backgroundColor: WorkEzTheme.colors.backgroundCard,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: WorkEzTheme.colors.border,
    alignItems: 'center',
  },
  qrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  qrTitle: {
    fontWeight: '600',
    color: WorkEzTheme.colors.text,
  },
  qrDesc: {
    color: WorkEzTheme.colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  qrImageWrapper: {
    borderWidth: 2,
    borderColor: WorkEzTheme.colors.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#FFF',
  },
  qrImage: {
    width: 220,
    height: 220,
  },
  qrPlaceholder: {
    alignItems: 'center',
    gap: 12,
    padding: 24,
  },
  qrPlaceholderText: {
    color: WorkEzTheme.colors.textSecondary,
    textAlign: 'center',
    fontSize: 13,
  },
  pixCodeCard: {
    backgroundColor: WorkEzTheme.colors.backgroundCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: WorkEzTheme.colors.border,
  },
  pixCodeLabel: {
    fontWeight: '600',
    color: WorkEzTheme.colors.text,
    marginBottom: 8,
  },
  pixCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 12,
  },
  pixCodeValue: {
    flex: 1,
    color: WorkEzTheme.colors.textSecondary,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  copyBtn: {
    padding: 4,
  },
  copiedText: {
    color: WorkEzTheme.colors.primary,
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
  },
  linkBtn: {
    backgroundColor: WorkEzTheme.colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  linkBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 15,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(251,191,36,0.08)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.3)',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: WorkEzTheme.colors.warning,
  },
  statusText: {
    color: WorkEzTheme.colors.warning,
    fontWeight: '500',
    fontSize: 13,
  },
  instructionsCard: {
    backgroundColor: WorkEzTheme.colors.backgroundCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: WorkEzTheme.colors.border,
    gap: 8,
  },
  instructionsTitle: {
    fontWeight: '600',
    color: WorkEzTheme.colors.text,
    marginBottom: 4,
  },
  instructionStep: {
    color: WorkEzTheme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
});
