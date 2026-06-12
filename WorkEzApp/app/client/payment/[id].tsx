import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, CreditCard, Shield, DollarSign, ExternalLink } from 'lucide-react-native';
import { Button } from '../../../components/Button';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, Alert, ScrollView, StyleSheet } from 'react-native';
import { useFetch } from '../../../hooks/useFetch';
import { paymentService } from '../../../services/paymentService';
import { WorkEzTheme } from '../../../constants/theme';
import * as WebBrowser from 'expo-web-browser';

export default function Payment() {
  const router = useRouter();
  const { id } = useLocalSearchParams(); // service id
  const [paying, setPaying] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  // Fetch service details
  const { data: service, loading, error } = useFetch<any>(
    id ? `/api/Services/${id}` : null
  );

  // Fetch or resume existing payment once service details are loaded
  useEffect(() => {
    if (!service || !service.appointmentId) return;

    paymentService.getPaymentByAppointment(service.appointmentId)
      .then(res => {
        if (res.data) {
          setPaymentId(res.data.paymentId);
          setPaymentStatus(res.data.status);
          setPaymentUrl(res.data.paymentUrl);
        }
      })
      .catch(err => console.error('Error fetching existing payment:', err));
  }, [service]);

  // If already paid, automatically forward to completed screen
  useEffect(() => {
    if (paymentStatus === 'Paid') {
      router.replace(`/client/completed/${id}` as any);
    }
  }, [paymentStatus, id]);

  // Polling payment status from backend / AbacatePay
  useEffect(() => {
    if (!paymentId || paymentStatus === 'Paid') return;

    const interval = setInterval(async () => {
      try {
        const res = await paymentService.getPaymentStatus(paymentId);
        if (res.data) {
          setPaymentStatus(res.data.status);
          if (res.data.status === 'Paid') {
            clearInterval(interval);
            Alert.alert('Sucesso', 'Pagamento realizado com sucesso!', [
              { text: 'OK', onPress: () => router.push(`/client/completed/${id}` as any) }
            ]);
          }
        }
      } catch (err) {
        console.error('Error polling status:', err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [paymentId, paymentStatus, id]);

  const handlePay = async () => {
    if (!service || !service.appointmentId) return;
    setPaying(true);
    try {
      const res = await paymentService.createPayment(service.appointmentId);
      if (res.error) {
        Alert.alert('Erro ao processar pagamento', res.error);
      } else if (res.data) {
        setPaymentId(res.data.paymentId);
        setPaymentStatus(res.data.status);
        setPaymentUrl(res.data.paymentUrl);

        if (res.data.paymentUrl) {
          await WebBrowser.openBrowserAsync(res.data.paymentUrl);
        }
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Erro', 'Não foi possível se conectar ao servidor.');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={WorkEzTheme.colors.primary} />
      </View>
    );
  }

  if (error || !service) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>
          {error || 'Não foi possível carregar o serviço.'}
        </Text>
        <Button onPress={() => router.back()}>Voltar</Button>
      </View>
    );
  }

  const priceVal = service.price || 150.00;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.iconButton}
          >
            <ArrowLeft size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pagamento</Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Service summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Resumo do serviço</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Profissional</Text>
            <Text style={styles.value}>{service.professional?.name || 'Profissional'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Serviço</Text>
            <Text style={styles.value}>{service.category}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>R$ {priceVal.toFixed(2).replace('.', ',')}</Text>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Forma de pagamento</Text>
          
          {/* AbacatePay notice */}
          <View style={styles.noticeBox}>
            <DollarSign size={20} color="#10B981" />
            <View style={{ flex: 1 }}>
              <Text style={styles.noticeTitle}>Processado por AbacatePay</Text>
              <Text style={styles.noticeText}>
                Seus pagamentos são processados de forma 100% segura através do AbacatePay via PIX ou Cartão.
              </Text>
            </View>
          </View>

          {paymentUrl ? (
            <TouchableOpacity
              onPress={async () => {
                if (paymentUrl) await WebBrowser.openBrowserAsync(paymentUrl);
              }}
              style={styles.billingActiveBtn}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                <CreditCard size={24} color="#2563EB" />
                <View>
                  <Text style={styles.billingActiveTitle}>Fatura AbacatePay Gerada</Text>
                  <Text style={styles.billingActiveSubtitle}>Clique para abrir a fatura</Text>
                </View>
              </View>
              <ExternalLink size={20} color="#2563EB" />
            </TouchableOpacity>
          ) : (
            <View style={styles.billingNotice}>
              <Text style={styles.billingNoticeText}>
                Clique no botão abaixo para gerar a fatura de pagamento segura no AbacatePay.
              </Text>
            </View>
          )}
        </View>

        {/* Guarantee Info */}
        <View style={styles.shieldNotice}>
          <Shield size={20} color="#2563EB" style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.shieldTitle}>Pagamento seguro</Text>
            <Text style={styles.shieldText}>
              Seu pagamento é protegido pelo WorkEz. O profissional só recebe após a conclusão do serviço.
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          fullWidth
          onPress={paymentUrl ? async () => { await WebBrowser.openBrowserAsync(paymentUrl); } : handlePay}
          disabled={paying}
        >
          {paying ? (
            <ActivityIndicator color="#FFF" />
          ) : paymentUrl ? (
            'Abrir Fatura AbacatePay'
          ) : (
            `Pagar R$ ${priceVal.toFixed(2).replace('.', ',')} com segurança`
          )}
        </Button>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 24,
  },
  errorText: {
    color: WorkEzTheme.colors.danger,
    textAlign: 'center',
    marginBottom: 16,
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    padding: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0F172A',
  },
  content: {
    padding: 24,
    gap: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: {
    color: '#64748B',
    fontSize: 14,
  },
  value: {
    color: '#0F172A',
    fontWeight: '500',
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2563EB',
  },
  noticeBox: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  noticeTitle: {
    color: '#064e3b',
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'left',
  },
  noticeText: {
    color: '#065f46',
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
    textAlign: 'left',
  },
  billingActiveBtn: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2563EB',
    backgroundColor: 'rgba(37, 99, 235, 0.05)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  billingActiveTitle: {
    fontWeight: '600',
    color: '#0F172A',
    fontSize: 14,
  },
  billingActiveSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  billingNotice: {
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
  },
  billingNoticeText: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
  },
  shieldNotice: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  shieldTitle: {
    color: '#1D4ED8',
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'left',
  },
  shieldText: {
    color: '#1E40AF',
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
    textAlign: 'left',
  },
  footer: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
});
