import { useState, useEffect, useCallback } from 'react';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Alert
} from 'react-native';
import { Clock, CheckCircle, ArrowLeft, User, DollarSign } from 'lucide-react-native';
import { WorkEzTheme } from '../../../constants/theme';
import { useFetch } from '../../../hooks/useFetch';
import { Button } from '../../../components/Button';

export default function WaitingPayment() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  // Fetch service details
  const { data: service, loading, error, refetch } = useFetch<any>(
    id ? `/api/Services/${id}` : null
  );

  useFocusEffect(
    useCallback(() => {
      if (id) {
        refetch();
      }
    }, [id, refetch])
  );

  // Polling service status
  useEffect(() => {
    if (!id) return;

    const interval = setInterval(async () => {
      try {
        const res = await refetch();
        if (res && res.status === 'completed') {
          clearInterval(interval);
          Alert.alert('Sucesso', 'O pagamento foi confirmado!', [
            { text: 'OK', onPress: () => router.replace('/provider') }
          ]);
        }
      } catch (err) {
        console.error('Error polling service status:', err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [id, refetch]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={WorkEzTheme.colors.primary} />
        <Text style={styles.loadingText}>Carregando informações...</Text>
      </View>
    );
  }

  if (error || !service) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error || 'Serviço não encontrado.'}</Text>
        <Button onPress={() => router.push('/provider')}>Voltar ao início</Button>
      </View>
    );
  }

  const priceVal = service.price || 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.push('/provider')}
            style={styles.iconButton}
          >
            <ArrowLeft size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Aguardando Pagamento</Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Animated/pulsing indicator */}
        <View style={styles.statusCard}>
          <View style={styles.iconCircle}>
            <Clock size={40} color="#FBBF24" />
          </View>
          <Text style={styles.statusTitle}>Aguardando o cliente pagar</Text>
          <Text style={styles.statusSubtitle}>
            O serviço foi concluído! O cliente já pode realizar o pagamento no aplicativo dele.
          </Text>
        </View>

        {/* Details card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Detalhes do chamado</Text>
          
          <View style={styles.row}>
            <View style={styles.avatarPlaceholder}>
              <User size={20} color={WorkEzTheme.colors.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Cliente</Text>
              <Text style={styles.value}>{service.clientName || 'Cliente'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={[styles.avatarPlaceholder, { backgroundColor: 'rgba(37, 99, 235, 0.1)' }]}>
              <DollarSign size={20} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Valor do serviço</Text>
              <Text style={styles.priceValue}>R$ {priceVal.toFixed(2).replace('.', ',')}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.pollingText}>
          Verificando confirmação automaticamente a cada 5 segundos...
        </Text>
      </View>

      <View style={styles.footer}>
        <Button
          fullWidth
          onPress={() => router.replace('/provider')}
        >
          Voltar ao início
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
  loadingText: {
    marginTop: 16,
    color: WorkEzTheme.colors.textSecondary,
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
    alignItems: 'center',
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  statusSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '100%',
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
    alignItems: 'center',
    gap: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    color: '#64748B',
  },
  value: {
    fontSize: 15,
    fontWeight: '500',
    color: '#0F172A',
    marginTop: 2,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2563EB',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 16,
  },
  pollingText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  footer: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    width: '100%',
    marginTop: 'auto',
  },
});
