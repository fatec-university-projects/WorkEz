import { useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ShieldCheck, Star, Clock } from 'lucide-react-native';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useAppTheme } from '../../contexts/ThemeContext';
import { useFetch } from '../../hooks/useFetch';
import { apiRequest } from '../../services/api';
import { geocodeAddress } from '../../hooks/useLocation';

export default function SearchingProfessional() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { colors, isDark } = useAppTheme();

  const {
    category,
    categoryId,
    description,
    cep,
    street,
    number,
    complement,
    neighborhood,
    city,
    state,
    latitude,
    longitude,
    images
  } = useLocalSearchParams<{
    category: string;
    categoryId: string;
    description: string;
    cep: string;
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
    latitude?: string;
    longitude?: string;
    images: string;
  }>();

  const parsedImages: string[] = (() => {
    if (!images) return [];
    if (Array.isArray(images)) return images;
    try {
      const p = JSON.parse(images);
      return Array.isArray(p) ? p : [p];
    } catch {
      return [images];
    }
  })();

  const { data: customer, loading: customerLoading, error: customerError } = useFetch<any>(
    user ? `/api/Customers/by-user/${user.id}` : null
  );

  useEffect(() => {
    if (customerError) {
      alert('Não foi possível identificar o perfil de cliente: ' + customerError);
      router.back();
    }
  }, [customerError]);

  useEffect(() => {
    if (!customer) return;

    let isMounted = true;

    async function createServiceCall() {
      try {
        let resolvedLat: number | undefined = latitude ? parseFloat(latitude) : undefined;
        let resolvedLon: number | undefined = longitude ? parseFloat(longitude) : undefined;

        if (resolvedLat === undefined || isNaN(resolvedLat) || resolvedLon === undefined || isNaN(resolvedLon)) {
          const geo = await geocodeAddress({
            street,
            number,
            neighborhood,
            city,
            state,
            postalCode: cep,
          });
          if (geo) {
            resolvedLat = geo.latitude;
            resolvedLon = geo.longitude;
          }
        }

        const payload = {
          title: `Chamado para ${category || 'Serviço'}`,
          description: description || '',
          categoryId: categoryId,
          imageUrl: parsedImages.length > 0 ? (parsedImages.length === 1 ? parsedImages[0] : JSON.stringify(parsedImages)) : null,
          address: {
            zipCode: cep,
            street: street,
            number: number,
            complement: complement || '',
            neighborhood: neighborhood,
            city: city,
            state: state,
            addressType: 'Home',
            latitude: resolvedLat,
            longitude: resolvedLon
          }
        };

        const response = await apiRequest<any>(`/api/Services/by-customer/${customer.id}`, {
          method: 'POST',
          body: JSON.stringify(payload)
        });

        if (isMounted) {
          if (response.error) {
            alert('Erro ao criar o chamado: ' + response.error);
            router.back();
          } else {
            setTimeout(() => {
              if (isMounted) {
                if (typeof router.canDismiss === 'function' && router.canDismiss()) {
                  router.dismissAll();
                }
                router.replace(`/client/tracking/${response.data.id}?from=created` as any);
              }
            }, 2500);
          }
        }
      } catch (err) {
        if (isMounted) {
          alert('Erro ao processar criação de chamado no servidor.');
          router.back();
        }
      }
    }

    createServiceCall();

    return () => {
      isMounted = false;
    };
  }, [customer]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.backgroundAlt,
        paddingTop: insets.top > 0 ? insets.top + 12 : 20,
        paddingBottom: insets.bottom > 0 ? insets.bottom + 12 : 20,
        justifyContent: 'space-between',
      }}
    >
      <View style={styles.centerBox}>
        <View
          style={[
            styles.loaderCircle,
            {
              backgroundColor: isDark ? 'rgba(37, 99, 235, 0.18)' : 'rgba(37, 99, 235, 0.1)',
              borderColor: isDark ? 'rgba(96, 165, 250, 0.35)' : 'rgba(37, 99, 235, 0.2)',
            },
          ]}
        >
          <ActivityIndicator size="large" color={isDark ? '#60A5FA' : '#2563EB'} />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>Publicando seu chamado</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Estamos enviando as informações e procurando profissionais da categoria {category} próximos a você...
        </Text>

        {customerLoading && (
          <Text style={[styles.loadingHint, { color: colors.textSecondary }]}>
            Obtendo dados do perfil do cliente...
          </Text>
        )}

        <View style={{ marginTop: 24 }}>
          <Text onPress={() => router.back()} style={[styles.cancelLink, { color: colors.danger }]}>
            Cancelar e voltar
          </Text>
        </View>
      </View>

      <View style={[styles.footerCard, { backgroundColor: colors.backgroundCard, borderTopColor: colors.border }]}>
        <View style={styles.featureRow}>
          <View style={[styles.featureIcon, { backgroundColor: 'rgba(38, 255, 245, 0.14)' }]}>
            <ShieldCheck size={16} color={colors.primaryText} />
          </View>
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
            Todos os profissionais são verificados
          </Text>
        </View>

        <View style={styles.featureRow}>
          <View style={[styles.featureIcon, { backgroundColor: 'rgba(251, 191, 36, 0.14)' }]}>
            <Star size={16} color="#FBBF24" />
          </View>
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
            Selecionamos os melhores avaliados
          </Text>
        </View>

        <View style={styles.featureRow}>
          <View style={[styles.featureIcon, { backgroundColor: 'rgba(37, 99, 235, 0.14)' }]}>
            <Clock size={16} color={isDark ? '#60A5FA' : '#2563EB'} />
          </View>
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
            Atendimento rápido garantido
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loaderCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 20,
  },
  loadingHint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
  cancelLink: {
    fontWeight: '600',
    fontSize: 14,
    textDecorationLine: 'underline',
    padding: 8,
  },
  footerCard: {
    padding: 24,
    gap: 12,
    borderTopWidth: 1,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
