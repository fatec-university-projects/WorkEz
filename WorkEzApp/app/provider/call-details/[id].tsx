import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Button } from '../../../components/Button';
import { View, Text, TouchableOpacity } from 'react-native';

export default function CallDetails() {
  const router = useRouter();
  return (
    <View className="min-h-screen bg-[#F8FAFC] p-6">
      <TouchableOpacity onPress={() => router.back()}>
        <ArrowLeft className="w-6 h-6" />
      </TouchableOpacity>
      <Text className="text-2xl font-bold mt-4">Detalhes do Chamado</Text>
      <Button onPress={() => router.push('/provider')} className="mt-4">Voltar</Button>
    </View>
  );
}
