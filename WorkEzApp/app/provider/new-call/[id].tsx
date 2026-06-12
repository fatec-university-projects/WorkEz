import { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MapPin, FileText, Image as ImageIcon, X, Wrench, Timer, Star, User } from 'lucide-react-native';
import { Button } from '../../../components/Button';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useFetch } from '../../../hooks/useFetch';
import { apiRequest } from '../../../services/api';
import { WorkEzTheme } from '../../../constants/theme';

export default function NewCall() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [accepting, setAccepting] = useState(false);

  const { data: service, loading, error } = useFetch<any>(
    id ? `/api/Services/${id}` : null
  );

  const handleAcceptCall = async () => {
    if (!id) return;
    setAccepting(true);
    try {
      const res = await apiRequest<any>(`/api/Services/${id}/accept`, {
        method: 'POST'
      });
      if (res.error) {
        Alert.alert('Erro ao aceitar', res.error);
      } else {
        Alert.alert('Sucesso', 'Você aceitou o chamado com sucesso!', [
          { text: 'OK', onPress: () => router.push(`/provider/accepted/${id}` as any) }
        ]);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Erro', 'Não foi possível conectar ao servidor.');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
        <ActivityIndicator size="large" color={WorkEzTheme.colors.primary} />
        <Text style={{ marginTop: 12, color: '#64748B' }}>Carregando detalhes do chamado...</Text>
      </View>
    );
  }

  if (error || !service) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 24 }}>
        <Text style={{ color: WorkEzTheme.colors.danger, textAlign: 'center', marginBottom: 16 }}>
          {error || 'Não foi possível carregar o chamado.'}
        </Text>
        <Button onPress={() => router.back()}>Voltar</Button>
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: '#F8FAFC' }} contentContainerStyle={{ flexGrow: 1 }}>
      <View className="bg-white px-6 py-4 border-b border-[#E2E8F0] flex-row items-center justify-between">
        <Text className="text-xl font-semibold text-[#0F172A]">
          Novo chamado
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2 hover:bg-[#F1F5F9] rounded-lg transition-colors"
        >
          <X className="w-6 h-6 text-[#0F172A]" />
        </TouchableOpacity>
      </View>

      <View className="p-6 space-y-6 flex-1">
        <View className="bg-white rounded-2xl p-6 shadow-sm border border-[#E2E8F0]">
          <View className="flex-row items-center gap-3 mb-4">
            <View className="w-12 h-12 bg-blue-50 rounded-xl flex-row items-center justify-center">
              <Wrench className="w-5 h-5 text-[#3B82F6]" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-semibold text-[#0F172A]">
                {service.category}
              </Text>
              <View className="flex-row items-center gap-3 text-sm text-[#64748B] mt-1">
                <View className="flex-row items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  Visualização prévia
                </View>
              </View>
            </View>
          </View>

          <View className="space-y-4 pt-4 border-t border-[#E2E8F0]">
            <View className="flex-row items-start gap-3">
              <FileText className="w-5 h-5 text-[#64748B] flex-shrink-0 mt-0.5" />
              <View className="flex-1">
                <Text className="text-sm text-[#64748B] mb-1">Descrição</Text>
                <Text className="text-[#0F172A]">{service.description}</Text>
              </View>
            </View>

            <View className="flex-row items-start gap-3">
              <MapPin className="w-5 h-5 text-[#64748B] flex-shrink-0 mt-0.5" />
              <View className="flex-1">
                <Text className="text-sm text-[#64748B] mb-1">Endereço aproximado</Text>
                <Text className="text-[#0F172A]">{service.address}</Text>
              </View>
            </View>

            {service.imageUrl && (
              <View className="flex-row items-start gap-3">
                <ImageIcon className="w-5 h-5 text-[#64748B] flex-shrink-0 mt-0.5" />
                <View className="flex-1">
                  <Text className="text-sm text-[#64748B] mb-2">Fotos enviadas pelo cliente</Text>
                  <Image
                    source={{ uri: service.imageUrl }}
                    style={{ width: 150, height: 150, borderRadius: 12 }}
                  />
                </View>
              </View>
            )}
          </View>
        </View>

        <View className="bg-white rounded-2xl p-5 shadow-sm border border-[#E2E8F0]">
          <Text className="font-semibold text-[#0F172A] mb-3">Cliente</Text>
          <View className="flex-row items-center gap-3">
            {service.clientPhoto ? (
              <Image
                source={{ uri: service.clientPhoto }}
                style={{ width: 48, height: 48, borderRadius: 24 }}
              />
            ) : (
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' }}>
                <User size={24} color={WorkEzTheme.colors.textSecondary} />
              </View>
            )}
            <View>
              <Text className="font-medium text-[#0F172A]">{service.clientName}</Text>
              <Text style={{ color: '#EAB308', fontSize: 13, marginTop: 2 }}>
                <Star size={14} color="#EAB308" /> Avaliação pendente
              </Text>
            </View>
          </View>
        </View>

        <View className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-4">
          <Text className="text-sm text-[#1d4ed8]">
            <Timer className="w-4 h-4 text-[#3B82F6] inline" /> <Text>Responda rápido!</Text> Ao aceitar o chamado, o cliente será notificado imediatamente.
          </Text>
        </View>
      </View>

      <View className="bg-white p-6 border-t border-[#E2E8F0] space-y-3">
        <Button
          fullWidth
          onPress={handleAcceptCall}
          disabled={accepting}
        >
          {accepting ? <ActivityIndicator color="#FFF" /> : 'Aceitar chamado'}
        </Button>
        <Button
          variant="secondary"
          fullWidth
          onPress={() => router.back()}
          disabled={accepting}
        >
          Recusar
        </Button>
      </View>
    </ScrollView>
  );
}
