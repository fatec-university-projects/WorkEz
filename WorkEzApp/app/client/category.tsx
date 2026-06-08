import { useRouter } from 'expo-router';
import { ArrowLeft, Wrench, Brush, Zap, Paintbrush, Hammer, Settings } from 'lucide-react-native';
import { View, Text, TouchableOpacity } from 'react-native';

export default function SelectCategory() {
  const router = useRouter();

  const categories = [
    {
      name: 'Encanador',
      icon: Wrench,
      description: 'Vazamentos, entupimentos, instalações',
      color: 'bg-blue-50 border-blue-200',
      iconColor: 'text-blue-500',
    },
    {
      name: 'Eletricista',
      icon: Zap,
      description: 'Instalações, reparos, disjuntores',
      color: 'bg-yellow-50 border-yellow-200',
      iconColor: 'text-yellow-500',
    },
    {
      name: 'Diarista',
      icon: Brush,
      description: 'Limpeza geral, organização',
      color: 'bg-purple-50 border-purple-200',
      iconColor: 'text-purple-500',
    },
    {
      name: 'Pintor',
      icon: Paintbrush,
      description: 'Pintura interna, externa, textura',
      color: 'bg-green-50 border-green-200',
      iconColor: 'text-green-500',
    },
    {
      name: 'Montador',
      icon: Hammer,
      description: 'Montagem de móveis e equipamentos',
      color: 'bg-orange-50 border-orange-200',
      iconColor: 'text-orange-500',
    },
    {
      name: 'Técnico geral',
      icon: Settings,
      description: 'Reparos diversos e manutenção',
      color: 'bg-red-50 border-red-200',
      iconColor: 'text-red-500',
    },
  ];

  return (
    <View className="min-h-screen bg-[#F8FAFC]">
      <View className="bg-white px-6 py-4 border-b border-[#E2E8F0]">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 hover:bg-[#F1F5F9] rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-[#0F172A]" />
          </TouchableOpacity>
          <Text className="text-xl font-semibold text-[#0F172A]">
            Selecione o serviço
          </Text>
        </View>
      </View>

      <View className="p-6 space-y-3">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
          <TouchableOpacity
            key={category.name}
            onPress={() => router.push('/client/describe')}
            className={`w-full ${category.color} border-2 rounded-2xl p-4 hover:shadow-md transition-all text-left`}
          >
            <View className="flex flex-row items-center gap-4">
              <View className="w-12 h-12 rounded-xl flex-row items-center justify-center">
                <Icon className={`w-8 h-8 ${category.iconColor}`} />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-semibold text-[#0F172A]">
                  {category.name}
                </Text>
                <Text className="text-sm text-[#64748B] mt-0.5">
                  {category.description}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
