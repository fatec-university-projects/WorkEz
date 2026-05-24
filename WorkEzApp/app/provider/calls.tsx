import { useRouter } from 'expo-router';
import { ServiceCard } from '../../components/ServiceCard';
import { View, Text } from 'react-native';

export default function ProviderCalls() {
  const router = useRouter();

  return (
    <View className="min-h-screen bg-[#F8FAFC]">
      <View className="bg-white px-6 py-4 border-b">
        <Text className="text-2xl font-bold">Chamados</Text>
      </View>
      <View className="p-6 space-y-3">
        <ServiceCard
          category="Encanador"
          description="Torneira da cozinha vazando"
          status="in-progress"
          date="Hoje, 14:30"
          professional="João Silva"
          onPress={() => router.push('/provider/new-call/1')}
        />
      </View>
    </View>
  );
}
