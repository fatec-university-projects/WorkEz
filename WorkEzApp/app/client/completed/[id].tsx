import { useCallback } from 'react';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { CheckCircle, ShieldCheck, Star, User } from 'lucide-react-native';
import { Button } from '../../../components/Button';
import { Badge } from '../../../components/Badge';
import { View, Text, Image, ActivityIndicator, StyleSheet, ScrollView } from 'react-native';
import { useFetch } from '../../../hooks/useFetch';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../../contexts/ThemeContext';
import { resolveImageUrl } from '../../../services/api';

export default function ServiceCompleted() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const { colors, isDark } = useAppTheme();

  const { data: service, loading, error, refetch: refetchService } = useFetch<any>(
    id ? `/api/Services/${id}` : null
  );

  const { data: serviceReview, refetch: refetchReview } = useFetch<any>(
    id ? `/api/Reviews/by-service/${id}` : null
  );

  useFocusEffect(
    useCallback(() => {
      if (id) {
        refetchService();
        refetchReview();
      }
    }, [id, refetchService, refetchReview])
  );

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.backgroundAlt }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !service) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.backgroundAlt }]}>
        <Text style={{ color: colors.danger, textAlign: 'center', marginBottom: 16 }}>
          {error || 'Não foi possível carregar o serviço.'}
        </Text>
        <Button onPress={() => router.push('/client' as any)}>Ir para o início</Button>
      </View>
    );
  }

  const priceVal = service.price || 150.0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.backgroundAlt }}
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: 'center',
        paddingTop: insets.top > 0 ? insets.top + 20 : 24,
        paddingBottom: 24,
        paddingHorizontal: 24,
      }}
    >
      <View style={{ width: '100%', maxWidth: 440, alignSelf: 'center' }}>
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: isDark ? 'rgba(45, 212, 191, 0.16)' : 'rgba(15, 118, 110, 0.12)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <CheckCircle size={40} color={colors.primaryText} />
          </View>
          <Text style={{ fontSize: 28, fontWeight: '700', color: colors.text, marginBottom: 6, textAlign: 'center' }}>
            Serviço concluído!
          </Text>
          <Text style={{ fontSize: 15, color: colors.textSecondary, textAlign: 'center' }}>
            Pagamento realizado com sucesso
          </Text>
        </View>

        <View
          style={{
            backgroundColor: colors.backgroundCard,
            borderRadius: 16,
            padding: 20,
            borderWidth: 1,
            borderColor: colors.border,
            marginBottom: 20,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            {service.professional?.photo ? (
              <Image
                source={{ uri: resolveImageUrl(service.professional.photo) || service.professional.photo }}
                style={{ width: 64, height: 64, borderRadius: 32 }}
              />
            ) : (
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: colors.backgroundAlt,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <User size={32} color={colors.textSecondary} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
                {service.professional?.name || 'Profissional'}
              </Text>
              <Text style={{ fontSize: 14, color: colors.textSecondary }}>{service.category}</Text>
            </View>
          </View>

          <View style={{ paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 14, color: colors.textSecondary }}>Valor pago</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>R$ {priceVal.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        <View
          style={{
            backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7',
            borderColor: isDark ? 'rgba(251, 191, 36, 0.35)' : '#FDE047',
            borderWidth: 1,
            borderRadius: 14,
            padding: 16,
            marginBottom: 24,
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <ShieldCheck size={20} color={isDark ? '#FCD34D' : '#854D0E'} style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Badge variant="active-guarantee" size="sm" />
            <Text style={{ fontSize: 13, color: isDark ? '#FDE68A' : '#92400E', marginTop: 8, lineHeight: 19 }}>
              Você tem 7 dias de garantia. Se houver algum problema, acione o suporte.
            </Text>
          </View>
        </View>

        <View style={{ gap: 12 }}>
          <Button fullWidth onPress={() => router.push(`/client/rating/${id}` as any)}>
            <Star size={18} color="#FFFFFF" />
            {serviceReview ? 'Editar avaliação' : 'Avaliar profissional'}
          </Button>

          <Button variant="secondary" fullWidth onPress={() => router.push('/client' as any)}>
            Voltar ao início
          </Button>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
});
