import { useState, useCallback, useEffect } from 'react';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Star, User } from 'lucide-react-native';
import { Button } from '../../../components/Button';
import { View, Text, TouchableOpacity, Image, TextInput, ActivityIndicator, Alert, ScrollView, Platform, StyleSheet } from 'react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { useAppTheme } from '../../../contexts/ThemeContext';
import { useFetch } from '../../../hooks/useFetch';
import { apiRequest, resolveImageUrl } from '../../../services/api';
import { ScreenHeader } from '../../../components/ScreenHeader';

export default function Rating() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const { colors, isDark } = useAppTheme();

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

  const { data: existingReview, refetch: refetchReview } = useFetch<any>(
    id ? `/api/Reviews/by-service/${id}` : null
  );

  useEffect(() => {
    if (existingReview) {
      if (existingReview.rating) setRating(existingReview.rating);
      if (existingReview.comment) {
        const match = existingReview.comment.match(/^\[(.*?)\]\s*(.*)$/);
        if (match) {
          const parsedTags = match[1].split(',').map((t: string) => t.trim());
          setSelectedTags(parsedTags);
          const raw = match[2]?.trim() || '';
          setComment(raw === 'Serviço avaliado pelo cliente.' || raw === 'Nenhum comentário deixado.' ? '' : raw);
        } else {
          const raw = existingReview.comment.trim();
          setComment(raw === 'Serviço avaliado pelo cliente.' || raw === 'Nenhum comentário deixado.' ? '' : raw);
        }
      }
    }
  }, [existingReview]);

  useFocusEffect(
    useCallback(() => {
      if (id) {
        refetch();
        refetchReview();
      }
    }, [id, refetch, refetchReview])
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
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSendRating = async () => {
    if (!id || !service) return;
    if (rating === 0) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('Por favor, selecione pelo menos 1 estrela.');
      } else {
        Alert.alert('Avaliação necessária', 'Por favor, selecione pelo menos 1 estrela.');
      }
      return;
    }

    setSending(true);

    let activeCustomerId = customer?.id;
    if (!activeCustomerId && user?.id) {
      const custRes = await apiRequest<any>(`/api/Customers/by-user/${user.id}`);
      activeCustomerId = custRes.data?.id;
    }

    if (!activeCustomerId) {
      setSending(false);
      return;
    }

    const fullComment =
      selectedTags.length > 0
        ? `[${selectedTags.join(', ')}] ${comment}`.trim()
        : comment.trim();

    try {
      const reviewPayload = {
        serviceId: id,
        appointmentId: service.appointmentId,
        reviewedUserId: service.providerUserId || service.professional?.userId || service.professional?.id,
        rating: rating,
        comment: fullComment ? fullComment : null,
      };

      const res = await apiRequest<any>(`/api/Reviews/by-customer/${activeCustomerId}`, {
        method: 'POST',
        body: JSON.stringify(reviewPayload),
      });

      if (res.error) {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert(res.error);
        } else {
          Alert.alert('Erro ao enviar avaliação', res.error);
        }
      } else {
        const isUpdate = res.data?.isUpdate || !!existingReview;
        const msg = isUpdate
          ? 'Sua avaliação foi atualizada com sucesso.'
          : 'Sua avaliação foi enviada com sucesso.';

        const navigateBack = () => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace(`/client/tracking/${id}` as any);
          }
        };

        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert(msg);
          navigateBack();
        } else {
          Alert.alert('Obrigado!', msg, [{ text: 'OK', onPress: navigateBack }]);
        }
      }
    } catch (err) {
      console.error(err);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('Não foi possível se conectar ao servidor.');
      } else {
        Alert.alert('Erro', 'Não foi possível se conectar ao servidor.');
      }
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.backgroundAlt }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !service) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.backgroundAlt, padding: 24 }}>
        <Text style={{ color: colors.danger, textAlign: 'center', marginBottom: 16 }}>
          {error || 'Não foi possível carregar as informações do serviço.'}
        </Text>
        <Button onPress={() => (router.canGoBack() ? router.back() : router.replace(`/client/tracking/${id}` as any))}>
          Voltar
        </Button>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.backgroundAlt }}>
      <ScreenHeader
        title={existingReview ? 'Editar avaliação' : 'Avaliar profissional'}
        showBack
        onBack={() => (router.canGoBack() ? router.back() : router.replace(`/client/tracking/${id}` as any))}
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ padding: 24, gap: 20 }}>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.backgroundCard, borderColor: colors.border, alignItems: 'center' },
            ]}
          >
            {service.professional?.photo ? (
              <Image
                source={{ uri: resolveImageUrl(service.professional.photo) || service.professional.photo }}
                style={{ width: 80, height: 80, borderRadius: 40, marginBottom: 12 }}
              />
            ) : (
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: colors.backgroundAlt,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                }}
              >
                <User size={36} color={colors.textSecondary} />
              </View>
            )}
            <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 4 }}>
              {service.professional?.name || 'Profissional'}
            </Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>{service.category}</Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 16, textAlign: 'center' }}>
              Como foi sua experiência?
            </Text>

            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  accessibilityRole="button"
                  accessibilityLabel={`Avaliar com ${star} estrelas`}
                  onPress={() => setRating(star)}
                  style={{ padding: 4 }}
                >
                  <Star
                    size={40}
                    color={star <= rating ? '#FBBF24' : colors.border}
                    fill={star <= rating ? '#FBBF24' : 'transparent'}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text, marginBottom: 8 }}>
                Deixe um comentário (opcional)
              </Text>
              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder="Conte como foi sua experiência..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                style={{
                  minHeight: 100,
                  padding: 12,
                  backgroundColor: colors.backgroundAlt,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 12,
                  color: colors.text,
                }}
              />
            </View>

            <View>
              <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text, marginBottom: 12 }}>
                Tags rápidas
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {tags.map((tag) => {
                  const selected = selectedTags.includes(tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      onPress={() => toggleTag(tag)}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 20,
                        backgroundColor: selected ? '#2563EB' : colors.backgroundAlt,
                        borderWidth: 1,
                        borderColor: selected ? '#2563EB' : colors.border,
                      }}
                    >
                      <Text style={{ color: selected ? '#FFF' : colors.textSecondary, fontWeight: '500', fontSize: 13 }}>
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          <View
            style={{
              backgroundColor: isDark ? 'rgba(37, 99, 235, 0.16)' : '#EFF6FF',
              borderColor: isDark ? 'rgba(96, 165, 250, 0.35)' : '#BFDBFE',
              borderWidth: 1,
              borderRadius: 12,
              padding: 16,
            }}
          >
            <Text style={{ fontSize: 13, color: isDark ? '#93C5FD' : '#1D4ED8', lineHeight: 19 }}>
              Sua avaliação ajuda outros clientes a encontrarem os melhores profissionais.
            </Text>
          </View>
        </View>

        <View
          style={{
            backgroundColor: colors.backgroundCard,
            padding: 24,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            marginTop: 'auto',
          }}
        >
          <Button fullWidth onPress={handleSendRating} disabled={rating === 0 || sending}>
            {sending ? <ActivityIndicator color="#FFF" /> : existingReview ? 'Salvar avaliação' : 'Enviar avaliação'}
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
  },
});
