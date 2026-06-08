import { useRouter } from 'expo-router';
import { ArrowLeft, Star } from 'lucide-react-native';
import { RatingCard } from '../../components/RatingCard';
import { View, Text, TouchableOpacity } from 'react-native';

export default function ReceivedRatings() {
  const router = useRouter();

  return (
    <View className="min-h-screen bg-[#F8FAFC]">
      <View className="bg-white px-6 py-4 border-b">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft className="w-6 h-6" />
          </TouchableOpacity>
          <Text className="text-xl font-semibold">Avaliações</Text>
        </View>
      </View>
      <View className="p-6 space-y-3">
        <View className="bg-white rounded-2xl p-6 text-center">
          <View className="flex-row items-center justify-center gap-2 mb-2">
            <Star className="w-8 h-8 fill-[#FBBF24] text-[#FBBF24]" />
            <Text className="text-4xl font-bold">4.9</Text>
          </View>
          <Text className="text-[#64748B]">156 avaliações</Text>
        </View>
        <RatingCard
          clientName="Maria Santos"
          clientPhoto="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100"
          rating={5}
          comment="Excelente profissional!"
          date="2 dias atrás"
          tags={['Pontual', 'Educado']}
        />
      </View>
    </View>
  );
}
