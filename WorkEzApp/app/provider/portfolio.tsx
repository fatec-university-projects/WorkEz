import { useRouter } from 'expo-router';
import { ArrowLeft, Plus } from 'lucide-react-native';
import { Button } from '../../components/Button';
import { View, Text, TouchableOpacity, Image } from 'react-native';

export default function Portfolio() {
  const router = useRouter();
  const images = [
    'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400',
    'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=400',
    'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400',
  ];

  return (
    <View className="min-h-screen bg-[#F8FAFC]">
      <View className="bg-white px-6 py-4 border-b">
        <View className="flex items-center gap-3">
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft className="w-6 h-6" />
          </TouchableOpacity>
          <Text className="text-xl font-semibold">Portfólio</Text>
        </View>
      </View>
      <View className="p-6">
        <Button fullWidth className="mb-4">
          <Plus className="w-5 h-5 inline mr-2" />
          Adicionar trabalho
        </Button>
        <View className="grid grid-cols-2 gap-3">
          {images.map((img, i) => (
            <Image key={i} source={img} className="w-full h-40 object-cover rounded-lg" />
          ))}
        </View>
      </View>
    </View>
  );
}
