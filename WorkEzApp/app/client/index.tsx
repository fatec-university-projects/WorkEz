import { useRouter } from 'expo-router';
import { Search, Zap, Shield, ShieldCheck, Star, Wrench, Brush, Paintbrush, Hammer, Settings } from 'lucide-react-native';
import { Button } from '../../components/Button';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';

export default function ClientHome() {
  const router = useRouter();

  const categories = [
    { name: 'Encanador', icon: Wrench, color: 'bg-blue-50', iconColor: 'text-blue-500' },
    { name: 'Eletricista', icon: Zap, color: 'bg-yellow-50', iconColor: 'text-yellow-500' },
    { name: 'Diarista', icon: Brush, color: 'bg-purple-50', iconColor: 'text-purple-500' },
    { name: 'Pintor', icon: Paintbrush, color: 'bg-green-50', iconColor: 'text-green-500' },
    { name: 'Montador', icon: Hammer, color: 'bg-orange-50', iconColor: 'text-orange-500' },
    { name: 'Técnico', icon: Settings, color: 'bg-red-50', iconColor: 'text-red-500' },
  ];

  return (
    <View className="min-h-screen bg-[#F8FAFC]">
      <View className="bg-gradient-to-br from-[#2563EB] to-[#1d4ed8] px-6 pt-12 pb-8 rounded-b-3xl">
        <Text className="text-2xl font-bold text-white mb-1">
          Olá, João! 👋
        </Text>
        <Text className="text-white/80">
          Qual serviço você precisa hoje?
        </Text>

        <View className="mt-6 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
          <TextInput
            type="text"
            placeholder="Buscar serviços..."
            className="w-full pl-12 pr-4 py-3.5 bg-white rounded-xl border-0 focus:outline-none focus:ring-4 focus:ring-white/20"
          />
        </View>
      </View>

      <View className="px-6 -mt-4">
        <Button
          fullWidth
          onPress={() => router.push('/client/category')}
          className="shadow-lg"
        >
          <Zap className="w-5 h-5 inline mr-2" />
          Chamar agora
        </Button>
      </View>

      <View className="px-6 mt-8">
        <Text className="text-lg font-semibold text-[#0F172A] mb-4">
          Categorias de serviço
        </Text>

        <View className="flex flex-row flex-wrap justify-between gap-y-3">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <TouchableOpacity
                key={category.name}
                onPress={() => router.push('/client/category')}
                className={`${category.color} rounded-2xl p-4 flex flex-col items-center justify-center`}
                style={{ width: '31%' }}
              >
                <Icon className={`w-8 h-8 mb-2 ${category.iconColor}`} />
                <Text className="text-xs font-medium text-[#0F172A] text-center">
                  {category.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View className="px-6 mt-8 mb-8">
        <Text className="text-lg font-semibold text-[#0F172A] mb-4">
          Por que escolher o WorkEz?
        </Text>

        <View className="space-y-3">
          <View className="bg-white rounded-2xl p-4 shadow-sm border border-[#E2E8F0]">
            <View className="flex items-start gap-3">
              <View className="w-10 h-10 bg-[#26FFF5]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-5 h-5 text-[#26FFF5]" />
              </View>
              <View>
                <Text className="font-medium text-[#0F172A] mb-1">
                  Profissionais verificados
                </Text>
                <Text className="text-sm text-[#64748B]">
                  Documentos checados e antecedentes verificados
                </Text>
              </View>
            </View>
          </View>

          <View className="bg-white rounded-2xl p-4 shadow-sm border border-[#E2E8F0]">
            <View className="flex items-start gap-3">
              <View className="w-10 h-10 bg-[#2563EB]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-[#2563EB]" />
              </View>
              <View>
                <Text className="font-medium text-[#0F172A] mb-1">
                  Pagamento seguro
                </Text>
                <Text className="text-sm text-[#64748B]">
                  Pague pelo app com proteção total
                </Text>
              </View>
            </View>
          </View>

          <View className="bg-white rounded-2xl p-4 shadow-sm border border-[#E2E8F0]">
            <View className="flex items-start gap-3">
              <View className="w-10 h-10 bg-[#FBBF24]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Star className="w-5 h-5 text-[#FBBF24]" />
              </View>
              <View>
                <Text className="font-medium text-[#0F172A] mb-1">
                  Avaliações reais
                </Text>
                <Text className="text-sm text-[#64748B]">
                  Profissionais avaliados por clientes como você
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
