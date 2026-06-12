import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MapPin, MessageCircle } from 'lucide-react-native';
import { Button } from '../../../components/Button';
import { View, Text, ActivityIndicator, Alert } from 'react-native';
import { useFetch } from '../../../hooks/useFetch';
import { WorkEzTheme } from '../../../constants/theme';
import { apiRequest } from '../../../services/api';

export default function AcceptedService() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [starting, setStarting] = useState(false);

  const { data: service, loading, error } = useFetch<any>(
    id ? `/api/Services/${id}` : null
  );

  const handleStartDisplacement = async () => {
    if (!id) return;
    setStarting(true);
    try {
      const res = await apiRequest<any>(`/api/Services/${id}/start-displacement`, {
        method: 'PATCH'
      });
      if (res.error) {
        Alert.alert('Erro', res.error);
      } else {
        router.push(`/provider/in-progress/${id}` as any);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Erro', 'Não foi possível se conectar ao servidor.');
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
        <ActivityIndicator size="large" color={WorkEzTheme.colors.primary} />
      </View>
    );
  }

  return (
    <View className="min-h-screen bg-[#F8FAFC] p-6">
      <Text className="text-2xl font-bold mb-4">Serviço Aceito</Text>
      <View className="bg-white rounded-2xl p-6 mb-4">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <MapPin size={20} color={WorkEzTheme.colors.primary} />
          <Text className="text-[#0F172A] font-semibold flex-1">
            {service?.address || 'Endereço não disponível'}
          </Text>
        </View>
        <Button fullWidth onPress={() => router.push(`/provider/chat/${id}` as any)} className="mb-3">
          <MessageCircle className="w-5 h-5 inline mr-2" />
          Abrir chat
        </Button>
        <Button 
          fullWidth 
          onPress={handleStartDisplacement}
          disabled={starting}
        >
          {starting ? <ActivityIndicator color="#FFF" /> : 'Iniciar deslocamento'}
        </Button>
      </View>
    </View>
  );
}
