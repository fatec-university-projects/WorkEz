import { useRouter } from 'expo-router';
import { ArrowLeft, Star, Award, ShieldCheck, Image as ImageIcon } from 'lucide-react-native';
import { Badge } from '../../../components/Badge';
import { RatingCard } from '../../../components/RatingCard';
import { Button } from '../../../components/Button';
import { View, Text, TouchableOpacity, Image } from 'react-native';

export default function ProfessionalProfile() {
  const router = useRouter();

  const portfolio = [
    'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400&h=300&fit=crop',
  ];

  return (
    <View className="min-h-screen bg-[#F8FAFC]">
      <View className="bg-white px-6 py-4 border-b border-[#E2E8F0] sticky top-0 z-10">
        <View className="flex items-center gap-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 hover:bg-[#F1F5F9] rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-[#0F172A]" />
          </TouchableOpacity>
          <Text className="text-xl font-semibold text-[#0F172A]">
            Perfil do profissional
          </Text>
        </View>
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
        </View>

        <View className="bg-white rounded-2xl p-6 shadow-sm border border-[#E2E8F0]">
          <View className="flex items-center gap-2 mb-4">
            <ImageIcon className="w-5 h-5 text-[#0F172A]" />
            <Text className="font-semibold text-[#0F172A]">Portfólio</Text>
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
        </View>

        <View className="bg-white rounded-2xl p-6 shadow-sm border border-[#E2E8F0]">
          <View className="flex items-center justify-between mb-4">
            <View className="flex items-center gap-2">
              <Award className="w-5 h-5 text-[#0F172A]" />
              <Text className="font-semibold text-[#0F172A]">Avaliações</Text>
            </View>
            <Text className="text-sm text-[#64748B]">156 avaliações</Text>
          </View>

          <View className="space-y-3">
            <RatingCard
              clientName="Maria Santos"
              clientPhoto="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop"
              rating={5}
              comment="Excelente profissional! Resolveu o problema rapidamente e deixou tudo limpo."
              date="2 dias atrás"
              tags={['Pontual', 'Educado', 'Serviço bem feito']}
            />

            <RatingCard
              clientName="João Pedro"
              clientPhoto="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop"
              rating={5}
              comment="Muito competente e prestativo. Recomendo!"
              date="1 semana atrás"
              tags={['Resolveria novamente']}
            />
          </View>
        </View>

        <View className="bg-[#FEF3C7] border border-[#FDE047] rounded-xl p-4">
          <View className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#854D0E] flex-shrink-0 mt-0.5" />
            <View>
              <Text className="font-medium text-[#854D0E] mb-1">
                Garantia da plataforma
              </Text>
              <Text className="text-sm text-[#92400E]">
                Este serviço está protegido pela garantia WorkEz. Você pode solicitar mediação em caso de problemas.
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View className="fixed bottom-0 left-0 right-0 bg-white p-6 border-t border-[#E2E8F0]">
        <Button fullWidth onPress={() => router.push('/client/tracking/1')}>
          Acompanhar serviço
        </Button>
      </View>
    </View>
  );
}
