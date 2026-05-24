import { useRouter } from 'expo-router';
import { Clock } from 'lucide-react-native';
import { Button } from '../../../components/Button';
import { View, Text } from 'react-native';

export default function WaitingPayment() {
  const router = useRouter();

  return (
    <View className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
      <View className="text-center">
        <View className="w-20 h-20 bg-[#FBBF24]/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="w-10 h-10 text-[#FBBF24]" />
        </View>
        <Text className="text-2xl font-bold mb-2">Aguardando pagamento</Text>
        <Text className="text-[#64748B] mb-6">O cliente está finalizando o pagamento</Text>
        <Button onPress={() => router.push('/provider')}>Voltar ao início</Button>
      </View>
    </View>
  );
}
