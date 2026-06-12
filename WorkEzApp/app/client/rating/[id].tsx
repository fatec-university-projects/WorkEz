import { useState, useCallback } from 'react';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { ArrowLeft, Star, User } from 'lucide-react-native';
import { Button } from '../../../components/Button';
import { View, Text, TouchableOpacity, Image, TextInput, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { useFetch } from '../../../hooks/useFetch';
import { apiRequest } from '../../../services/api';
import { WorkEzTheme } from '../../../constants/theme';

export default function Rating() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  const { data: customer } = useFetch<any>(
    user ? `/api/Customers/by-user/${user.id}` : null
  );

  const { data: service, loading, error, refetch } = useFetch<any>(
    id ? `/api/Services/${id}` : null
  );

  useFocusEffect(
    useCallback(() => {
      if (id) {
        refetch();
      }
    }, [id, refetch])
  );

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

  const handleSendRating = async () => {
    if (!id || !customer || !service) return;
    if (rating === 0) {
      Alert.alert('Avaliação necessária', 'Por favor, selecione pelo menos 1 estrela.');
      return;
    }

    setSending(true);

    const fullComment = selectedTags.length > 0 
      ? `[${selectedTags.join(', ')}] ${comment}`.trim()
      : comment.trim();

    try {
      const reviewPayload = {
        appointmentId: service.appointmentId,
        reviewedUserId: service.providerUserId,
        rating: rating,
        comment: fullComment || 'Serviço avaliado pelo cliente.'
      };

      const res = await apiRequest<any>(`/api/Reviews/by-customer/${customer.id}`, {
        method: 'POST',
        body: JSON.stringify(reviewPayload)
      });

      if (res.error) {
        Alert.alert('Erro ao enviar avaliação', res.error);
      } else {
        Alert.alert('Obrigado!', 'Sua avaliação foi enviada com sucesso.', [
          { text: 'OK', onPress: () => router.push('/client' as any) }
        ]);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Erro', 'Não foi possível se conectar ao servidor.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
        <ActivityIndicator size="large" color={WorkEzTheme.colors.primary} />
      </View>
    );
  }

  if (error || !service) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 24 }}>
        <Text style={{ color: WorkEzTheme.colors.danger, textAlign: 'center', marginBottom: 16 }}>
          {error || 'Não foi possível carregar as informações do serviço.'}
        </Text>
        <Button onPress={() => router.back()}>Voltar</Button>
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: '#F8FAFC' }} contentContainerStyle={{ flexGrow: 1 }}>
      <View className="bg-white px-6 py-4 border-b border-[#E2E8F0]">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 bg-[#F1F5F9] rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-[#0F172A]" />
          </TouchableOpacity>
          <Text className="text-xl font-semibold text-[#0F172A]">
            Avaliar profissional
          </Text>
        </View>
      </View>

      <View className="p-6 space-y-6">
        <View className="bg-white rounded-2xl p-6 shadow-sm border border-[#E2E8F0] items-center">
          {service.professional?.photo ? (
            <Image
              source={{ uri: service.professional.photo }}
              className="w-20 h-20 rounded-full object-cover mb-3"
            />
          ) : (
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <User size={36} color={WorkEzTheme.colors.textSecondary} />
            </View>
          )}
          <Text className="text-lg font-semibold text-[#0F172A] mb-1">
            {service.professional?.name || 'Profissional'}
          </Text>
          <Text className="text-sm text-[#64748B]">{service.category}</Text>
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
                style={{ padding: 4 }}
              >
                <Star
                  size={40}
                  color={star <= rating ? '#FBBF24' : '#E2E8F0'}
                  fill={star <= rating ? '#FBBF24' : 'transparent'}
                />
              </TouchableOpacity>
            ))}
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-[#0F172A] mb-2 text-left">
              Deixe um comentário (opcional)
            </Text>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Conte como foi sua experiência..."
              multiline={true}
              numberOfLines={4}
              textAlignVertical="top"
              style={{ minHeight: 100, padding: 12, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, color: '#0F172A' }}
            />
          </View>

          <View>
            <Text className="text-sm font-medium text-[#0F172A] mb-3 text-left">
              Tags rápidas
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {tags.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  onPress={() => toggleTag(tag)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${ selectedTags.includes(tag) ? 'bg-[#2563EB] text-white' : 'bg-[#F1F5F9] text-[#64748B]' }`}
                >
                  <Text style={{ color: selectedTags.includes(tag) ? '#FFF' : '#64748B', fontWeight: '500' }}>
                    {tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-4">
          <Text className="text-sm text-[#1d4ed8] text-left">
            Sua avaliação ajuda outros clientes a encontrarem os melhores profissionais.
          </Text>
        </View>
      </View>

      <View className="bg-white p-6 border-t border-[#E2E8F0]">
        <Button
          fullWidth
          onPress={handleSendRating}
          disabled={rating === 0 || sending}
        >
          {sending ? <ActivityIndicator color="#FFF" /> : 'Enviar avaliação'}
        </Button>
      </View>
    </ScrollView>
  );
}
