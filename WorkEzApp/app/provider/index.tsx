import { useState } from 'react';
import { useRouter } from 'expo-router';
import { DollarSign, Star, Briefcase, TrendingUp } from 'lucide-react-native';
import { View, Text, TouchableOpacity } from 'react-native';

export default function ProviderHome() {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(true);

  return (
    <View className="min-h-screen bg-[#F8FAFC]">
      <View className="bg-gradient-to-br from-[#26FFF5] to-[#2563EB] px-6 pt-12 pb-8 rounded-b-3xl">
        <Text className="text-2xl font-bold text-white mb-6">
          Olá, Carlos! 👋
        </Text>

        <View className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <View className="flex items-center justify-between mb-3">
            <Text className="text-white/90 text-sm">Você está</Text>
            <TouchableOpacity
              onPress={() => setIsOnline(!isOnline)}
              className={`relative w-16 h-8 rounded-full transition-colors ${
                isOnline ? 'bg-white' : 'bg-white/30'
              }`}
            >
              <View
                className={`absolute top-1 w-6 h-6 rounded-full transition-all ${
                  isOnline
                    ? 'right-1 bg-[#26FFF5]'
                    : 'left-1 bg-white'
                }`}
              />
            </TouchableOpacity>
          </View>
          <Text className={`text-2xl font-bold ${isOnline ? 'text-white' : 'text-white/70'}`}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
          <Text className="text-white/80 text-sm mt-1">
            {isOnline ? 'Pronto para receber chamados' : 'Você não receberá chamados'}
          </Text>
        </View>
      </View>

      <View className="px-6 mt-6 grid grid-cols-2 gap-3">
        <View className="bg-white rounded-2xl p-4 shadow-sm border border-[#E2E8F0]">
          <View className="flex items-center gap-2 mb-2">
            <View className="w-8 h-8 bg-[#26FFF5]/10 rounded-lg flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-[#26FFF5]" />
            </View>
          </View>
          <Text className="text-2xl font-bold text-[#0F172A]">R$ 3.450</Text>
          <Text className="text-sm text-[#64748B]">Ganhos do mês</Text>
        </View>

        <View className="bg-white rounded-2xl p-4 shadow-sm border border-[#E2E8F0]">
          <View className="flex items-center gap-2 mb-2">
            <View className="w-8 h-8 bg-[#2563EB]/10 rounded-lg flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-[#2563EB]" />
            </View>
          </View>
          <Text className="text-2xl font-bold text-[#0F172A]">R$ 850</Text>
          <Text className="text-sm text-[#64748B]">Saldo disponível</Text>
        </View>

        <View className="bg-white rounded-2xl p-4 shadow-sm border border-[#E2E8F0]">
          <View className="flex items-center gap-2 mb-2">
            <View className="w-8 h-8 bg-[#FBBF24]/10 rounded-lg flex items-center justify-center">
              <Star className="w-4 h-4 text-[#FBBF24]" />
            </View>
          </View>
          <Text className="text-2xl font-bold text-[#0F172A]">4.9</Text>
          <Text className="text-sm text-[#64748B]">Nota média</Text>
        </View>

        <View className="bg-white rounded-2xl p-4 shadow-sm border border-[#E2E8F0]">
          <View className="flex items-center gap-2 mb-2">
            <View className="w-8 h-8 bg-[#26FFF5]/10 rounded-lg flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-[#26FFF5]" />
            </View>
          </View>
          <Text className="text-2xl font-bold text-[#0F172A]">248</Text>
          <Text className="text-sm text-[#64748B]">Serviços concluídos</Text>
        </View>
      </View>

      <View className="px-6 mt-6">
        <Text className="text-lg font-semibold text-[#0F172A] mb-4">
          Resumo da semana
        </Text>

        <View className="bg-white rounded-2xl p-5 shadow-sm border border-[#E2E8F0]">
          <View className="flex items-center gap-3 mb-4">
            <View className="w-10 h-10 bg-[#26FFF5]/10 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[#26FFF5]" />
            </View>
            <View>
              <Text className="font-semibold text-[#0F172A]">Ótimo desempenho!</Text>
              <Text className="text-sm text-[#64748B]">Você cresceu 15% esta semana</Text>
            </View>
          </View>

          <View className="space-y-2">
            <View className="flex justify-between text-sm">
              <Text className="text-[#64748B]">Serviços concluídos</Text>
              <Text className="font-medium text-[#0F172A]">12</Text>
            </View>
            <View className="flex justify-between text-sm">
              <Text className="text-[#64748B]">Taxa de aceitação</Text>
              <Text className="font-medium text-[#0F172A]">92%</Text>
            </View>
            <View className="flex justify-between text-sm">
              <Text className="text-[#64748B]">Avaliação média</Text>
              <Text className="font-medium text-[#0F172A]">4.9 <Star className="w-4 h-4 text-[#EAB308] inline" /></Text>
            </View>
          </View>
        </View>
      </View>

      <View className="px-6 mt-6 mb-8">
        <View className="bg-gradient-to-br from-[#2563EB] to-[#1d4ed8] rounded-2xl p-5 text-white">
          <Text className="font-semibold mb-2">Dica profissional 💡</Text>
          <Text className="text-sm text-white/90 leading-relaxed">
            Profissionais que mantêm fotos atualizadas no portfólio recebem 40% mais chamados.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/provider/portfolio')}
            className="mt-3 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
          >
            Atualizar portfólio
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
