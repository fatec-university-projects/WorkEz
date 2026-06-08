import { useRouter } from 'expo-router';
import { MapPin, MessageCircle } from 'lucide-react-native';
import { Button } from '../../../components/Button';
import { View, Text } from 'react-native';

export default function AcceptedService() {
  const router = useRouter();
  return (
    <View className="min-h-screen bg-[#F8FAFC] p-6">
      <Text className="text-2xl font-bold mb-4">Serviço Aceito</Text>
      <View className="bg-white rounded-2xl p-6 mb-4">
        <Text className="text-[#64748B] mb-4">Rua das Flores, 123 - Centro</Text>
        <Button fullWidth onPress={() => router.push('/provider/chat/1')} className="mb-3">
          <MessageCircle className="w-5 h-5 inline mr-2" />
          Abrir chat
        </Button>
        <Button fullWidth onPress={() => router.push('/provider/in-progress/1')}>
          Iniciar deslocamento
        </Button>
      </View>
    </View>
  );
}
