import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Clock, DollarSign, User } from 'lucide-react-native';
import { Button } from '../../../components/Button';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useFetch } from '../../../hooks/useFetch';
import { WorkEzTheme } from '../../../constants/theme';

export default function WaitingPayment() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const { data: service, loading, error, refetch } = useFetch<any>(
    id ? `/api/Services/${id}` : null
  );

  useEffect(() => {
    if (!id) return;
    const interval = setInterval(() => {
      refetch();
    }, 5000);
    return () => clearInterval(interval);
  }, [id, refetch]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={WorkEzTheme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View className="text-center w-full max-w-sm px-6">
        <View className="w-20 h-20 bg-[#FBBF24]/10 rounded-full flex-row items-center justify-center mx-auto mb-6">
          <Clock className="w-10 h-10 text-[#FBBF24]" />
        </View>
        <Text className="text-2xl font-bold mb-2 text-[#0F172A] text-center">
          Aguardando Pagamento
        </Text>
        <Text className="text-[#64748B] mb-6 text-center">
          O cliente está finalizando o pagamento do serviço.
        </Text>

        {service && (
          <View className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-sm mb-8">
            <View className="flex-row items-center gap-3 mb-4">
              <View className="w-10 h-10 bg-slate-100 rounded-full flex-row items-center justify-center">
                <User size={20} color={WorkEzTheme.colors.textSecondary} />
              </View>
              <View className="flex-1">
                <Text style={styles.detailLabel} className="text-left">Cliente</Text>
                <Text style={styles.detailValue} className="text-left">{service.clientName}</Text>
              </View>
            </View>

            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 bg-emerald-50 rounded-full flex-row items-center justify-center">
                <DollarSign size={20} color="#10B981" />
              </View>
              <View className="flex-1">
                <Text style={styles.detailLabel} className="text-left">Valor a receber</Text>
                <Text style={styles.detailValue} className="text-emerald-600 text-left font-bold">
                  R$ {service.price?.toFixed(2) || '0.00'}
                </Text>
              </View>
            </View>
          </View>
        )}

        <Button fullWidth onPress={() => router.push('/provider' as any)}>
          Voltar ao início
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 2,
  },
});
