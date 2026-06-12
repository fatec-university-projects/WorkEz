import { useState, useEffect, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { CheckCircle, Clock, XCircle } from 'lucide-react-native';
import { paymentService } from '../../../services/paymentService';
import { WorkEzTheme } from '../../../constants/theme';

const POLL_INTERVAL_MS = 6000;

export default function WaitingPayment() {
  const router                = useRouter();
  const { id: appointmentId } = useLocalSearchParams<{ id: string }>();

  const [status, setStatus]   = useState<string>('Pending');
  const [loading, setLoading] = useState(true);
  const [paymentId, setPaymentId] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Bootstrap: load existing payment for this appointment ─────────────────
  useEffect(() => {
    if (!appointmentId) return;

    (async () => {
      const { data } = await paymentService.getPaymentByAppointment(appointmentId);
      if (data) {
        setPaymentId(data.paymentId);
        setStatus(data.status);

        if (data.status === 'Pending') {
          startPolling(data.paymentId);
        }
      }
      setLoading(false);
    })();

    return () => stopPolling();
  }, [appointmentId]);

  const startPolling = (pid: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      const { data } = await paymentService.getPaymentStatus(pid);
      if (data) {
        setStatus(data.status);
        if (data.status !== 'Pending') stopPolling();
      }
    }, POLL_INTERVAL_MS);
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={WorkEzTheme.colors.primary} />
        <Text style={styles.loadingText}>Verificando pagamento...</Text>
      </View>
    );
  }

  if (status === 'Paid') {
    return (
      <View style={styles.centered}>
        <View style={styles.iconWrap}>
          <CheckCircle size={52} color={WorkEzTheme.colors.primary} />
        </View>
        <Text style={styles.titleSuccess}>Pagamento recebido!</Text>
        <Text style={styles.desc}>
          O cliente finalizou o pagamento com sucesso.
        </Text>
        <TouchableOpacity
          style={[styles.btn, styles.btnPrimary]}
          onPress={() => router.push('/provider')}
        >
          <Text style={styles.btnTextPrimary}>Ir para o início</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (status === 'Expired' || status === 'Cancelled') {
    return (
      <View style={styles.centered}>
        <View style={styles.iconWrapDanger}>
          <XCircle size={52} color={WorkEzTheme.colors.danger} />
        </View>
        <Text style={styles.titleDanger}>Pagamento expirado</Text>
        <Text style={styles.desc}>
          O prazo para pagamento se encerrou. Entre em contato com o cliente.
        </Text>
        <TouchableOpacity
          style={[styles.btn, styles.btnSecondary]}
          onPress={() => router.push('/provider')}
        >
          <Text style={styles.btnTextSecondary}>Voltar ao início</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Pending
  return (
    <View style={styles.centered}>
      <View style={styles.iconWrapWarning}>
        <Clock size={52} color={WorkEzTheme.colors.warning} />
      </View>
      <Text style={styles.titleWarning}>Aguardando pagamento</Text>
      <Text style={styles.desc}>
        O cliente está finalizando o pagamento via PIX. Você será notificado automaticamente.
      </Text>

      {/* Animated dots */}
      <View style={styles.dotsRow}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { opacity: 0.3 + i * 0.3 },
            ]}
          />
        ))}
      </View>

      <Text style={styles.pollingNote}>Verificando a cada 6 segundos...</Text>

      <TouchableOpacity
        style={[styles.btn, styles.btnSecondary]}
        onPress={() => router.push('/provider')}
      >
        <Text style={styles.btnTextSecondary}>Voltar ao início</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
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
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${WorkEzTheme.colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapWarning: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(251,191,36,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapDanger: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${WorkEzTheme.colors.danger}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleSuccess: {
    fontSize: 22,
    fontWeight: 'bold',
    color: WorkEzTheme.colors.text,
    textAlign: 'center',
  },
  titleWarning: {
    fontSize: 22,
    fontWeight: 'bold',
    color: WorkEzTheme.colors.text,
    textAlign: 'center',
  },
  titleDanger: {
    fontSize: 22,
    fontWeight: 'bold',
    color: WorkEzTheme.colors.text,
    textAlign: 'center',
  },
  desc: {
    color: WorkEzTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 14,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: WorkEzTheme.colors.warning,
  },
  pollingNote: {
    color: WorkEzTheme.colors.textSecondary,
    fontSize: 12,
    marginTop: -4,
  },
  btn: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    marginTop: 8,
    minWidth: 200,
    alignItems: 'center',
  },
  btnPrimary: {
    backgroundColor: WorkEzTheme.colors.primary,
  },
  btnSecondary: {
    backgroundColor: WorkEzTheme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: WorkEzTheme.colors.border,
  },
  btnTextPrimary: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 15,
  },
  btnTextSecondary: {
    color: WorkEzTheme.colors.text,
    fontWeight: '600',
    fontSize: 15,
  },
});
