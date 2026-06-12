import { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, CreditCard, Shield, DollarSign, User } from 'lucide-react-native';
import { Button } from '../../../components/Button';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useFetch } from '../../../hooks/useFetch';
import { apiRequest } from '../../../services/api';
import { WorkEzTheme } from '../../../constants/theme';

export default function Payment() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [paying, setPaying] = useState(false);

  const { data: service, loading, error } = useFetch<any>(
    id ? `/api/Services/${id}` : null
  );

  const handlePay = async () => {
    if (!id) return;
    setPaying(true);
    try {
      const res = await apiRequest<any>(`/api/Services/${id}/pay`, {
        method: 'PATCH'
      });
      if (res.error) {
        Alert.alert('Erro ao pagar', res.error);
      } else {
        Alert.alert('Sucesso', 'Pagamento realizado com sucesso!', [
          { text: 'OK', onPress: () => router.push(`/client/completed/${id}` as any) }
        ]);
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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
        <ActivityIndicator size="large" color={WorkEzTheme.colors.primary} />
      </View>
    );
  }

  if (error || !service) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 24 }}>
        <Text style={{ color: WorkEzTheme.colors.danger, textAlign: 'center', marginBottom: 16 }}>
          {error || 'Não foi possível carregar o serviço.'}
        </Text>
        <Button onPress={() => router.back()}>Voltar</Button>
      </View>
    );
  }

  const priceVal = service.price || 150.00;

  return (
    <ScrollView style={{ backgroundColor: '#F8FAFC' }} contentContainerStyle={{ flexGrow: 1 }}>
      <View className="bg-white px-6 py-4 border-b border-[#E2E8F0]">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 bg-[#F1F5F9] rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-[#0F172A]" />
          </TouchableOpacity>
          <Text className="text-xl font-semibold text-[#0F172A]">
            Pagamento
          </Text>
        </View>
      </View>

      <View className="p-6 space-y-6 flex-1">
        <View className="bg-white rounded-2xl p-6 shadow-sm border border-[#E2E8F0]">
          <Text className="font-semibold text-[#0F172A] mb-4">
            Resumo do serviço
          </Text>

          <View className="space-y-3 pb-4 border-b border-[#E2E8F0]">
            <View className="flex-row justify-between">
              <Text className="text-[#64748B]">Profissional</Text>
              <Text className="font-medium text-[#0F172A]">
                {service.professional?.name || 'Profissional'}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-[#64748B]">Serviço</Text>
              <Text className="font-medium text-[#0F172A]">{service.category}</Text>
            </View>
          </View>

          <View className="flex-row justify-between items-center pt-4">
            <Text className="text-lg font-semibold text-[#0F172A]">Total</Text>
            <Text className="text-2xl font-bold text-[#2563EB]">
              R$ {priceVal.toFixed(2)}
            </Text>
          </View>
        </View>

        <View className="bg-white rounded-2xl p-6 shadow-sm border border-[#E2E8F0]">
          <Text className="font-semibold text-[#0F172A] mb-4">
            Forma de pagamento
          </Text>

          <View className="space-y-3">
            <TouchableOpacity
              onPress={() => setPaymentMethod('pix')}
              className={`w-full p-4 rounded-xl border-2 transition-all ${ paymentMethod === 'pix' ? 'border-[#2563EB] bg-[#2563EB]/5' : 'border-[#E2E8F0]' }`}
            >
              <View className="flex-row items-center gap-3">
                <View className="w-12 h-12 bg-[#00C89F]/10 rounded-lg flex-row items-center justify-center">
                  <DollarSign className="w-5 h-5 text-[#10B981]" />
                </View>
                <View className="flex-1">
                  <Text className="font-medium text-[#0F172A]">PIX</Text>
                  <Text className="text-sm text-[#64748B] text-left">Pagamento instantâneo</Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setPaymentMethod('card')}
              className={`w-full p-4 rounded-xl border-2 transition-all ${ paymentMethod === 'card' ? 'border-[#2563EB] bg-[#2563EB]/5' : 'border-[#E2E8F0]' }`}
            >
              <View className="flex-row items-center gap-3">
                <View className="w-12 h-12 bg-[#2563EB]/10 rounded-lg flex-row items-center justify-center">
                  <CreditCard className="w-6 h-6 text-[#2563EB]" />
                </View>
                <View className="flex-1">
                  <Text className="font-medium text-[#0F172A]">Cartão de crédito</Text>
                  <Text className="text-sm text-[#64748B] text-left">Visa, Master, Elo</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-4">
          <View className="flex-row items-start gap-3">
            <Shield className="w-5 h-5 text-[#2563EB] flex-shrink-0 mt-0.5" />
            <View className="flex-1">
              <Text className="font-medium text-[#1d4ed8] mb-1 text-left">
                Pagamento seguro
              </Text>
              <Text className="text-sm text-[#1e40af] text-left">
                Seu pagamento é protegido pelo WorkEz. O profissional só recebe após a conclusão do serviço.
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View className="bg-white p-6 border-t border-[#E2E8F0]">
        <Button
          fullWidth
          onPress={handlePay}
          disabled={paying}
        >
          {paying ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            `Pagar R$ ${priceVal.toFixed(2)} com segurança`
          )}
        </Button>
      </View>
    </ScrollView>
  );
}
