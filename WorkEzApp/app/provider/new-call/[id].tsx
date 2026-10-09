import { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MapPin, FileText, Image as ImageIcon, X, Wrench, Timer, Star, User, Gavel, DollarSign, Clock } from 'lucide-react-native';
import { Button } from '../../../components/Button';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, Alert, ScrollView, TextInput } from 'react-native';
import { useFetch } from '../../../hooks/useFetch';
import { apiRequest } from '../../../services/api';
import { WorkEzTheme } from '../../../constants/theme';
import { useAuth } from '../../../contexts/AuthContext';

export default function NewCall() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [proposedPrice, setProposedPrice] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');

  const { data: service, loading, error } = useFetch<any>(
    id ? `/api/Services/${id}` : null
  );

  const handleSubmitProposal = async () => {
    if (!id || !user) return;
    const priceNum = parseFloat(proposedPrice.replace(',', '.'));
    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert('Valor inválido', 'Por favor, informe o valor que você está disposto a receber.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiRequest('/api/Proposals/propose', {
        method: 'POST',
        body: JSON.stringify({
          providerUserId: user.id,
          serviceId: id,
          proposedPrice: priceNum,
          description: description.trim() || undefined,
          estimatedTime: estimatedTime.trim() || undefined
        })
      });

      if (res.error) {
        Alert.alert('Erro ao enviar proposta', res.error);
      } else {
        Alert.alert(
          'Proposta Enviada!',
          'Seu lance no leilão foi enviado com sucesso. O cliente poderá aceitar, enviar contra-proposta ou abrir chat.',
          [
            { text: 'Acompanhar', onPress: () => router.push('/provider/calls' as any) }
          ]
        );
      }
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível conectar ao servidor.');
    } finally {
      setSubmitting(false);
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

        {/* Card do Leilão / Formulário de Proposta */}
        <View className="bg-white rounded-2xl p-5 shadow-sm border border-[#E2E8F0]">
          <View className="flex-row items-center gap-2 mb-3">
            <Gavel className="w-5 h-5 text-[#2563EB]" />
            <Text className="font-semibold text-lg text-[#0F172A]">Enviar Lance (Leilão)</Text>
          </View>
          <Text className="text-xs text-[#64748B] mb-4">
            Defina o valor que está disposto a receber. O cliente receberá as propostas e poderá aceitar, negociar ou fazer uma contra-proposta.
          </Text>

          <View style={{ gap: 12 }}>
            <View>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#1E293B', marginBottom: 4 }}>
                Valor da sua proposta (R$) *
              </Text>
              <TextInput
                style={{
                  backgroundColor: '#F8FAFC',
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#0F172A',
                }}
                placeholder="Ex: 250,00"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={proposedPrice}
                onChangeText={setProposedPrice}
              />
            </View>

            <View>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#1E293B', marginBottom: 4 }}>
                Estimativa de tempo (opcional)
              </Text>
              <TextInput
                style={{
                  backgroundColor: '#F8FAFC',
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  fontSize: 14,
                  color: '#0F172A',
                }}
                placeholder="Ex: 2 a 3 horas"
                placeholderTextColor="#94A3B8"
                value={estimatedTime}
                onChangeText={setEstimatedTime}
              />
            </View>

            <View>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#1E293B', marginBottom: 4 }}>
                Observações / Descrição da proposta (opcional)
              </Text>
              <TextInput
                style={{
                  backgroundColor: '#F8FAFC',
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  fontSize: 14,
                  color: '#0F172A',
                  height: 70,
                  textAlignVertical: 'top',
                }}
                placeholder="Ex: Inclui material básico e deslocamento."
                placeholderTextColor="#94A3B8"
                multiline
                value={description}
                onChangeText={setDescription}
              />
            </View>
          </View>
        </View>

        <View className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-4">
          <Text className="text-sm text-[#1d4ed8]">
            <Timer className="w-4 h-4 text-[#3B82F6] inline" /> <Text>Dica competitiva:</Text> Valores justos e boas descrições aumentam suas chances de ter a proposta aceita pelo cliente.
          </Text>
        </View>
      </View>

      <View className="bg-white p-6 border-t border-[#E2E8F0] space-y-3">
        <Button
          fullWidth
          onPress={handleSubmitProposal}
          disabled={submitting}
        >
          {submitting ? <ActivityIndicator color="#FFF" /> : 'Enviar Proposta'}
        </Button>
        <Button
          variant="secondary"
          fullWidth
          onPress={() => router.back()}
          disabled={submitting}
        >
          Voltar
        </Button>
      </View>
    </ScrollView>
  );
}
