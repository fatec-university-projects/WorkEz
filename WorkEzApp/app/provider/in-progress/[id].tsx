import { useRouter } from 'expo-router';
import { Button } from '../../../components/Button';
import { View, Text } from 'react-native';

export default function ServiceInProgress() {
  const router = useRouter();

  return (
    <View className="min-h-screen bg-[#F8FAFC] p-6">
      <Text className="text-2xl font-bold mb-6">Serviço em andamento</Text>
      <View className="space-y-3">
        <Button fullWidth>Cheguei no local</Button>
        <Button fullWidth>Iniciar serviço</Button>
        <Button fullWidth onPress={() => router.push('/provider/inform-value/1')}>
          Marcar como concluído
        </Button>
      </View>
    </View>
  );
}
