import { useRouter, useLocalSearchParams } from 'expo-router';
import { CheckCircle, ShieldCheck, Star, User } from 'lucide-react-native';
import { Button } from '../../../components/Button';
import { Badge } from '../../../components/Badge';
import { View, Text, Image, ActivityIndicator, StyleSheet, ScrollView } from 'react-native';
import { useFetch } from '../../../hooks/useFetch';
import { WorkEzTheme } from '../../../constants/theme';

export default function ServiceCompleted() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const { data: service, loading, error } = useFetch<any>(
    id ? `/api/Services/${id}` : null
  );

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
        <Text style={{ color: WorkEzTheme.colors.danger, textAlign: 'center', marginBottom: 16 }}>
          {error || 'Não foi possível carregar o serviço.'}
        </Text>
        <Button onPress={() => router.push('/client' as any)}>Ir para o início</Button>
      </View>
    );
  }

  const priceVal = service.price || 150.00;

  return (
    <ScrollView style={{ backgroundColor: '#F8FAFC' }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
      <View className="flex flex-col items-center justify-center p-6">
        <View className="w-full max-w-md">
          <View className="text-center mb-8">
            <View className="w-20 h-20 bg-[#26FFF5]/10 rounded-full flex-row items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-[#26FFF5]" />
            </View>
            <Text className="text-3xl font-bold text-[#0F172A] mb-2 text-center">
              Serviço concluído!
            </Text>
            <Text className="text-[#64748B] text-center">
              Pagamento realizado com sucesso
            </Text>
          </View>

          <View className="bg-white rounded-2xl p-6 shadow-sm border border-[#E2E8F0] mb-6">
            <View className="flex-row items-center gap-3 mb-4">
              {service.professional?.photo ? (
                <Image
                  source={{ uri: service.professional.photo }}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={32} color={WorkEzTheme.colors.textSecondary} />
                </View>
              )}
              <View className="flex-1">
                <Text className="font-semibold text-[#0F172A] text-left">
                  {service.professional?.name || 'Profissional'}
                </Text>
                <Text className="text-sm text-[#64748B] text-left">{service.category}</Text>
              </View>
            </View>

            <View className="space-y-3 pt-4 border-t border-[#E2E8F0]">
              <View className="flex-row justify-between text-sm">
                <Text className="text-[#64748B]">Valor pago</Text>
                <Text className="font-semibold text-[#0F172A]">R$ {priceVal.toFixed(2)}</Text>
              </View>
            </View>
          </View>

          <View className="bg-[#FEF3C7] border border-[#FDE047] rounded-xl p-4 mb-6">
            <View className="flex-row items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-[#854D0E] flex-shrink-0 mt-0.5" />
              <View className="flex-1">
                <Badge variant="active-guarantee" size="sm" />
                <Text className="text-sm text-[#92400E] mt-2 text-left">
                  Você tem 7 dias de garantia. Se houver algum problema, acione o suporte.
                </Text>
              </View>
            </View>
          </View>

          <View className="space-y-3">
            <Button
              fullWidth
              onPress={() => router.push(`/client/rating/${id}` as any)}
            >
              <Star className="w-5 h-5 inline mr-2" />
              Avaliar profissional
            </Button>

            <Button
              variant="secondary"
              fullWidth
              onPress={() => router.push('/client' as any)}
            >
              Voltar ao início
            </Button>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
});
