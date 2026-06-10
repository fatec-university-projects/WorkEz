import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ArrowLeft, Star } from 'lucide-react-native';
import { Button } from '../../../components/Button';
import { View, Text, TouchableOpacity, Image } from 'react-native';

export default function Rating() {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const tags = [
    'Pontual',
    'Educado',
    'Serviço bem feito',
    'Resolveria novamente',
    'Organizado',
    'Comunicativo',
  ];

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

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
            Avaliar profissional
          </Text>
        </View>
      </View>

      <View className="p-6 space-y-6">
        <View className="bg-white rounded-2xl p-6 shadow-sm border border-[#E2E8F0] text-center">
          <Image
            source="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop"
            alt="Carlos Silva"
            className="w-20 h-20 rounded-full object-cover mx-auto mb-3"
          />
          <Text className="text-lg font-semibold text-[#0F172A] mb-1">
            Carlos Silva
          </Text>
          <Text className="text-sm text-[#64748B]">Encanador</Text>
        </View>

        <View className="bg-white rounded-2xl p-6 shadow-sm border border-[#E2E8F0]">
          <Text className="font-semibold text-[#0F172A] mb-4 text-center">
            Como foi sua experiência?
          </Text>

          <View className="flex-row justify-center gap-2 mb-6">
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
                className="transform transition-all hover:scale-110"
              >
                <Star
                  className={`w-12 h-12 ${ star <= rating ? 'fill-[#FBBF24] text-[#FBBF24]' : 'text-[#E2E8F0]' }`}
                />
              </TouchableOpacity>
            ))}
          </View>

          <View className="mb-4">
            <Text className="block text-sm font-medium text-[#0F172A] mb-2">
              Deixe um comentário (opcional)
            </Text>
            <textarea
              value={comment}
              onChangeText={setComment}
              placeholder="Conte como foi sua experiência..."
              rows={4}
              className="w-full px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all resize-none"
            />
          </View>

          <View>
            <Text className="block text-sm font-medium text-[#0F172A] mb-3">
              Tags rápidas
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {tags.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  onPress={() => toggleTag(tag)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${ selectedTags.includes(tag) ? 'bg-[#2563EB] text-white' : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]' }`}
                >
                  {tag}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-4">
          <Text className="text-sm text-[#1d4ed8]">
            Sua avaliação ajuda outros clientes a encontrarem os melhores profissionais.
          </Text>
        </View>
      </View>

      <View className="fixed bottom-0 left-0 right-0 bg-white p-6 border-t border-[#E2E8F0]">
        <Button
          fullWidth
          onPress={() => router.push('/client')}
          disabled={rating === 0}
        >
          Enviar avaliação
        </Button>
      </View>
    </View>
  );
}
