import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Loader2, ShieldCheck, Star, Clock } from 'lucide-react-native';
import { View, Text } from 'react-native';
import { navigate } from 'expo-router/build/global-state/routing';

export default function SearchingProfessional() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/client/found');
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <View className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <View className="flex-1 flex flex-col items-center justify-center p-8">
        <View className="w-24 h-24 bg-[#2563EB]/10 rounded-full flex-row items-center justify-center mb-6 relative">
          <Loader2 className="w-12 h-12 text-[#2563EB] animate-spin" />
          <View className="absolute inset-0 rounded-full border-4 border-[#2563EB]/20 animate-ping"></View>
        </View>

        <Text className="text-2xl font-bold text-[#0F172A] text-center mb-2">
          Buscando profissional
        </Text>
        <Text className="text-[#64748B] text-center max-w-xs">
          Estamos procurando o melhor profissional disponível perto de você
        </Text>

        <View className="w-full max-w-sm mt-12 bg-white rounded-2xl p-4 shadow-sm border border-[#E2E8F0]">
          <View className="h-32 bg-[#E2E8F0] rounded-xl mb-4 flex-row items-center justify-center">
            <View className="text-center">
              <View className="w-12 h-12 bg-[#2563EB] rounded-full mx-auto mb-2 animate-pulse"></View>
              <Text className="text-xs text-[#64748B]">Sua localização</Text>
            </View>
          </View>
        </View>
      </View>

      <View className="p-6 space-y-3 bg-white border-t border-[#E2E8F0]">
        <View className="flex-row items-center gap-3 text-sm">
          <View className="w-8 h-8 bg-[#26FFF5]/10 rounded-lg flex-row items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-[#26FFF5]" />
          </View>
          <Text className="text-[#64748B]">
            Todos os profissionais são verificados
          </Text>
        </View>

        <View className="flex-row items-center gap-3 text-sm">
          <View className="w-8 h-8 bg-[#FBBF24]/10 rounded-lg flex-row items-center justify-center">
            <Star className="w-4 h-4 text-[#FBBF24]" />
          </View>
          <Text className="text-[#64748B]">
            Selecionamos os melhores avaliados
          </Text>
        </View>

        <View className="flex-row items-center gap-3 text-sm">
          <View className="w-8 h-8 bg-[#2563EB]/10 rounded-lg flex-row items-center justify-center">
            <Clock className="w-4 h-4 text-[#2563EB]" />
          </View>
          <Text className="text-[#64748B]">
            Atendimento rápido garantido
          </Text>
        </View>
      </View>
    </View>
  );
}
