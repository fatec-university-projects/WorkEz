import { useRouter } from 'expo-router';
import { Star, Award, Image as ImageIcon } from 'lucide-react-native';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { View, Text, Image } from 'react-native';

export default function ProviderProfile() {
  const router = useRouter();

  const portfolio = [
    'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400&h=300&fit=crop',
  ];

  return (
    <View className="min-h-screen bg-[#F8FAFC]">
      <View className="bg-white px-6 py-4 border-b border-[#E2E8F0]">
        <Text className="text-2xl font-bold text-[#0F172A]">Meu perfil</Text>
      </View>

      <View className="p-6 space-y-6">
        <View className="bg-white rounded-2xl p-6 shadow-sm border border-[#E2E8F0]">
          <View className="flex items-start gap-4 mb-4">
            <Image
              source="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&h=200&fit=crop"
              alt="Carlos Silva"
              className="w-20 h-20 rounded-full object-cover"
            />
            <View className="flex-1">
              <Text className="text-2xl font-bold text-[#0F172A] mb-1">
                Carlos Silva
              </Text>
              <Badge variant="verified" size="md" />
              <View className="flex items-center gap-3 mt-3">
                <View className="flex items-center gap-1">
                  <Star className="w-5 h-5 fill-[#FBBF24] text-[#FBBF24]" />
                  <Text className="text-lg font-semibold text-[#0F172A]">4.9</Text>
                </View>
                <Text className="text-[#64748B]">248 serviços</Text>
              </View>
            </View>
          </View>

          <View className="flex flex-wrap gap-2 mb-4">
            <Text className="px-3 py-1.5 bg-blue-50 text-blue-700 text-sm rounded-full">
              Encanamento
            </Text>
            <Text className="px-3 py-1.5 bg-blue-50 text-blue-700 text-sm rounded-full">
              Instalações
            </Text>
            <Text className="px-3 py-1.5 bg-blue-50 text-blue-700 text-sm rounded-full">
              Manutenção
            </Text>
          </View>

          <Text className="text-[#64748B] leading-relaxed">
            Profissional com 8 anos de experiência em instalações hidráulicas residenciais e comerciais. Especialista em reparos, manutenção preventiva e instalações completas.
          </Text>

          <Button
            variant="secondary"
            fullWidth
            className="mt-4"
            onPress={() => router.push('/provider/settings')}
          >
            Editar perfil
          </Button>
        </View>

        <View className="bg-white rounded-2xl p-6 shadow-sm border border-[#E2E8F0]">
          <View className="flex items-center justify-between mb-4">
            <View className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-[#0F172A]" />
              <Text className="font-semibold text-[#0F172A]">Portfólio</Text>
            </View>
            <Button
              variant="ghost"
              onPress={() => router.push('/provider/portfolio')}
              className="!p-2 text-sm"
            >
              Ver todos
            </Button>
          </View>

          <View className="grid grid-cols-3 gap-2">
            {portfolio.map((img, index) => (
              <Image
                key={index}
                source={img}
                alt={`Trabalho ${index + 1}`}
                className="w-full h-24 object-cover rounded-lg"
              />
            ))}
          </View>

          <Button
            variant="secondary"
            fullWidth
            className="mt-4"
            onPress={() => router.push('/provider/portfolio')}
          >
            Adicionar trabalho
          </Button>
        </View>

        <View className="bg-white rounded-2xl p-6 shadow-sm border border-[#E2E8F0]">
          <View className="flex items-center justify-between mb-4">
            <View className="flex items-center gap-2">
              <Award className="w-5 h-5 text-[#0F172A]" />
              <Text className="font-semibold text-[#0F172A]">Avaliações</Text>
            </View>
            <Button
              variant="ghost"
              onPress={() => router.push('/provider/ratings')}
              className="!p-2 text-sm"
            >
              Ver todas
            </Button>
          </View>

          <View className="grid grid-cols-3 gap-4 text-center">
            <View>
              <Text className="text-2xl font-bold text-[#0F172A]">4.9</Text>
              <Text className="text-sm text-[#64748B]">Nota média</Text>
            </View>
            <View>
              <Text className="text-2xl font-bold text-[#0F172A]">156</Text>
              <Text className="text-sm text-[#64748B]">Avaliações</Text>
            </View>
            <View>
              <Text className="text-2xl font-bold text-[#0F172A]">98%</Text>
              <Text className="text-sm text-[#64748B]">Positivas</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
