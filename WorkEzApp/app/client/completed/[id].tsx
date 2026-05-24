import { useRouter } from 'expo-router';
import { CheckCircle, ShieldCheck, Star } from 'lucide-react-native';
import { Button } from '../../../components/Button';
import { Badge } from '../../../components/Badge';
import { View, Text, Image } from 'react-native';

export default function ServiceCompleted() {
  const router = useRouter();

  return (
    <View className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6">
      <View className="w-full max-w-md">
        <View className="text-center mb-8">
          <View className="w-20 h-20 bg-[#26FFF5]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-[#26FFF5]" />
          </View>
          <Text className="text-3xl font-bold text-[#0F172A] mb-2">
            Serviço concluído!
          </Text>
          <Text className="text-[#64748B]">
            Pagamento realizado com sucesso
          </Text>
        </View>

        <View className="bg-white rounded-2xl p-6 shadow-sm border border-[#E2E8F0] mb-6">
          <View className="flex items-center gap-3 mb-4">
            <Image
              source="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop"
              alt="Carlos Silva"
              className="w-16 h-16 rounded-full object-cover"
            />
            <View className="flex-1">
              <Text className="font-semibold text-[#0F172A]">Carlos Silva</Text>
              <Text className="text-sm text-[#64748B]">Encanador</Text>
            </View>
          </View>

          <View className="space-y-3 pt-4 border-t border-[#E2E8F0]">
            <View className="flex justify-between text-sm">
              <Text className="text-[#64748B]">Valor pago</Text>
              <Text className="font-semibold text-[#0F172A]">R$ 150,00</Text>
            </View>
            <View className="flex justify-between text-sm">
              <Text className="text-[#64748B]">Duração</Text>
              <Text className="font-medium text-[#0F172A]">1h 15min</Text>
            </View>
          </View>
        </View>

        <View className="bg-[#FEF3C7] border border-[#FDE047] rounded-xl p-4 mb-6">
          <View className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#854D0E] flex-shrink-0 mt-0.5" />
            <View>
              <Badge variant="active-guarantee" size="sm" />
              <Text className="text-sm text-[#92400E] mt-2">
                Você tem 7 dias de garantia. Se houver algum problema, acione o suporte.
              </Text>
            </View>
          </View>
        </View>

        <View className="space-y-3">
          <Button
            fullWidth
            onPress={() => router.push('/client/rating/1')}
          >
            <Star className="w-5 h-5 inline mr-2" />
            Avaliar profissional
          </Button>

          <Button
            variant="secondary"
            fullWidth
            onPress={() => router.push('/client')}
          >
            Voltar ao início
          </Button>
        </View>
      </View>
    </View>
  );
}
