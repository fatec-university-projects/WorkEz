import { useRouter } from 'expo-router';
import { Star, MessageCircle, User, CheckCircle } from 'lucide-react-native';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { View, Text, Image } from 'react-native';

export default function ProfessionalFound() {
  const router = useRouter();

  return (
    <View className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <View className="flex-1 p-6">
        <View className="text-center mb-6">
          <View className="w-16 h-16 bg-[#26FFF5]/10 rounded-full flex-row items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-8 h-8 text-[#26FFF5]" />
          </View>
          <Text className="text-2xl font-bold text-[#0F172A] mb-2">
            Profissional encontrado!
          </Text>
          <Text className="text-[#64748B]">
            Carlos aceitou seu chamado
          </Text>
        </View>

        <View className="bg-white rounded-2xl p-6 shadow-sm border border-[#E2E8F0]">
          <View className="flex-row items-start gap-4 mb-6">
            <View className="relative">
              <Image
                source="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&h=200&fit=crop"
                alt="Carlos Silva"
                className="w-20 h-20 rounded-full object-cover"
              />
              <View className="absolute -bottom-1 -right-1 bg-[#26FFF5] rounded-full p-1">
                <CheckCircle className="w-4 h-4 text-white" />
              </View>
            </View>

            <View className="flex-1">
              <Text className="text-xl font-semibold text-[#0F172A] mb-1">
                Carlos Silva
              </Text>
              <Badge variant="verified" size="sm" />

              <View className="flex-row items-center gap-4 mt-3">
                <View className="flex-row items-center gap-1">
                  <Star className="w-4 h-4 fill-[#FBBF24] text-[#FBBF24]" />
                  <Text className="font-semibold text-[#0F172A]">4.9</Text>
                </View>
                <Text className="text-sm text-[#64748B]">
                  248 serviços
                </Text>
              </View>
            </View>
          </View>

          <View className="space-y-3 pt-4 border-t border-[#E2E8F0]">
            <View className="flex-row justify-between">
              <Text className="text-[#64748B]">Tempo estimado</Text>
              <Text className="font-medium text-[#0F172A]">15-20 min</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-[#64748B]">Distância</Text>
              <Text className="font-medium text-[#0F172A]">2.3 km</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-[#64748B]">Especialidade</Text>
              <Text className="font-medium text-[#0F172A]">Encanador</Text>
            </View>
          </View>
        </View>

        <View className="mt-4 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-4">
          <Text className="text-sm text-[#1d4ed8]">
            💬 O profissional já pode ver os detalhes do seu chamado e está se preparando para atendê-lo.
          </Text>
        </View>
      </View>

      <View className="bg-white p-6 border-t border-[#E2E8F0] space-y-3">
        <Button
          fullWidth
          onPress={() => router.push('/client/professional/1')}
        >
          <User className="w-5 h-5 inline mr-2" />
          Ver perfil completo
        </Button>
        <Button
          variant="secondary"
          fullWidth
          onPress={() => router.push('/client/chat/1')}
        >
          <MessageCircle className="w-5 h-5 inline mr-2" />
          Abrir chat
        </Button>
      </View>
    </View>
  );
}
