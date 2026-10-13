import { useEffect, useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Star, MessageCircle, User, CheckCircle, Clock, MapPin, AlertCircle, ArrowLeft } from 'lucide-react-native';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WorkEzTheme } from '../../constants/theme';
import { apiRequest } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface ProfessionalInfo {
  id: string;
  userId?: string;
  name: string;
  photo: string | null;
  rating: number;
  servicesCompleted: number;
  specialty: string;
  verified: boolean;
}

interface ServiceInfo {
  id: string;
  category: string;
  status: string;
  price?: number | null;
  startTime?: string | null;
  date?: string | null;
  appointmentId?: string | null;
}

export default function ProfessionalFound() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { id, serviceId: queryServiceId, providerId: queryProviderId } = useLocalSearchParams<{
    id?: string;
    serviceId?: string;
    providerId?: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [professional, setProfessional] = useState<ProfessionalInfo | null>(null);
  const [service, setService] = useState<ServiceInfo | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        let activeServiceId = queryServiceId || id;
        let activeProviderId = queryProviderId;

        // Se nenhum serviceId ou providerId foi passado, busca o chamado ativo mais recente do cliente
        if (!activeServiceId && !activeProviderId && user?.id) {
          const customerRes = await apiRequest<any>(`/api/Customers/by-user/${user.id}`);
          if (customerRes.data?.id) {
            const servicesRes = await apiRequest<any[]>(`/api/Services/by-customer/${customerRes.data.id}`);
            if (servicesRes.data && servicesRes.data.length > 0) {
              const activeCall = servicesRes.data.find((s: any) =>
                ['accepted', 'ontheway', 'on-the-way', 'inprogress', 'in-progress', 'undernegotiation'].includes(s.status)
              ) || servicesRes.data[0];

              if (activeCall) {
                activeServiceId = activeCall.id;
              }
            }
          }
        }

        let loadedService: any = null;

        // Se temos um serviceId, busca os detalhes do serviço
        if (activeServiceId) {
          const serviceRes = await apiRequest<any>(`/api/Services/${activeServiceId}`);
          if (serviceRes.data) {
            loadedService = serviceRes.data;
            if (isMounted) {
              setService({
                id: loadedService.id,
                category: loadedService.category || 'Serviço',
                status: loadedService.status,
                price: loadedService.price,
                startTime: loadedService.startTime,
                date: loadedService.date,
                appointmentId: loadedService.appointmentId,
              });
            }

            if (!activeProviderId && loadedService.professional?.id) {
              activeProviderId = loadedService.professional.id;
            }
          }
        }

        // Se temos providerId, busca dados completos do prestador
        if (activeProviderId) {
          const providerRes = await apiRequest<any>(`/api/ServiceProviders/${activeProviderId}`);
          if (providerRes.data && isMounted) {
            const p = providerRes.data;
            setProfessional({
              id: p.id,
              userId: p.userId,
              name: p.name || 'Profissional',
              photo: p.photo || null,
              rating: Number(p.averageRating ?? p.rating ?? 5.0),
              servicesCompleted: p.completedServicesCount ?? 0,
              specialty: (p.specialties && p.specialties.length > 0)
                ? p.specialties.map((s: any) => typeof s === 'string' ? s : s.name).join(', ')
                : (loadedService?.category || 'Especialista'),
              verified: p.documentVerified ?? true,
            });
            return;
          }
        }

        // Se tínhamos os dados do profissional embutidos no retorno do serviço
        if (loadedService?.professional && isMounted) {
          const prof = loadedService.professional;
          setProfessional({
            id: prof.id || '',
            userId: prof.userId,
            name: prof.name || 'Profissional',
            photo: prof.photo || null,
            rating: Number(prof.rating || 5.0),
            servicesCompleted: prof.servicesCompleted || 0,
            specialty: loadedService.category || 'Especialista',
            verified: true,
          });
          return;
        }

        if (isMounted) {
          setError('Nenhum profissional vinculado a este chamado no momento.');
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Erro ao carregar dados do profissional.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [id, queryServiceId, queryProviderId, user?.id]);

  const formatStatus = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'accepted':
        return 'Chamado aceito';
      case 'ontheway':
      case 'on-the-way':
        return 'A caminho';
      case 'inprogress':
      case 'in-progress':
        return 'Em andamento';
      case 'undernegotiation':
        return 'Em negociação';
      default:
        return 'Confirmado';
    }
  };

  const topInset = insets.top > 0 ? insets.top + 16 : 24;
  const bottomInset = insets.bottom > 0 ? insets.bottom + 16 : 24;

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContainer, { paddingTop: topInset, paddingBottom: bottomInset }]}>
        <ActivityIndicator size="large" color={WorkEzTheme.colors.primary} />
        <Text style={styles.loadingText}>Carregando dados do profissional...</Text>
      </View>
    );
  }

  if (error || !professional) {
    return (
      <View style={[styles.container, styles.centerContainer, { paddingTop: topInset, paddingBottom: bottomInset }]}>
        <View style={styles.errorIconWrapper}>
          <AlertCircle size={40} color={WorkEzTheme.colors.danger} />
        </View>
        <Text style={styles.errorTitle}>Profissional não encontrado</Text>
        <Text style={styles.errorSubtitle}>
          {error || 'Não foi possível identificar o profissional deste chamado.'}
        </Text>
        <Button onPress={() => router.replace('/client')} style={styles.backButton}>
          Voltar ao início
        </Button>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topInset, paddingBottom: bottomInset }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header / Banner de Sucesso */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <CheckCircle size={32} color="#059669" />
          </View>
          <Text style={styles.headerTitle}>Profissional encontrado!</Text>
          <Text style={styles.headerSubtitle}>
            {professional.name} aceitou seu chamado
          </Text>
        </View>

        {/* Card do Prestador */}
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.photoContainer}>
              {professional.photo ? (
                <Image
                  source={{ uri: professional.photo }}
                  style={styles.photo}
                />
              ) : (
                <View style={[styles.photo, styles.photoPlaceholder]}>
                  <User size={36} color={WorkEzTheme.colors.textSecondary} />
                </View>
              )}
              {professional.verified && (
                <View style={styles.verifiedBadge}>
                  <CheckCircle size={14} color="#FFFFFF" />
                </View>
              )}
            </View>

            <View style={styles.profileInfo}>
              <Text style={styles.profileName} numberOfLines={1}>
                {professional.name}
              </Text>
              {professional.verified && (
                <View style={styles.badgeWrapper}>
                  <Badge variant="verified" size="sm" />
                </View>
              )}

              <View style={styles.statsRow}>
                <View style={styles.ratingBadge}>
                  <Star size={16} color="#FBBF24" fill="#FBBF24" />
                  <Text style={styles.ratingText}>
                    {professional.rating > 0 ? professional.rating.toFixed(1) : '5.0'}
                  </Text>
                </View>
                <Text style={styles.servicesCount}>
                  {professional.servicesCompleted > 0
                    ? `${professional.servicesCompleted} ${professional.servicesCompleted === 1 ? 'serviço' : 'serviços'}`
                    : 'Prestador verificado'}
                </Text>
              </View>
            </View>
          </View>

          {/* Detalhes do Chamado */}
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status</Text>
              <Text style={styles.detailValue}>
                {formatStatus(service?.status)}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Especialidade</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {professional.specialty}
              </Text>
            </View>

            {service?.price != null && service.price > 0 && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Valor da proposta</Text>
                <Text style={[styles.detailValue, styles.priceValue]}>
                  R$ {Number(service.price).toFixed(2).replace('.', ',')}
                </Text>
              </View>
            )}

            {service?.startTime ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Data e horário</Text>
                <Text style={styles.detailValue}>{service.startTime}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Mensagem Informativa */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            O profissional já tem acesso aos detalhes do chamado e está pronto para prosseguir com o atendimento.
          </Text>
        </View>
      </ScrollView>

      {/* Botões de Ação na Base */}
      <View style={styles.footer}>
        {professional.id ? (
          <Button
            fullWidth
            onPress={() => router.push(`/client/professional/${professional.id}` as any)}
          >
            <User size={18} color="#FFFFFF" style={styles.buttonIcon} />
            Ver perfil completo
          </Button>
        ) : null}

        <Button
          variant="secondary"
          fullWidth
          onPress={() => {
            const chatId = service?.id || professional.id || '1';
            router.push(`/client/chat/${chatId}` as any);
          }}
        >
          <MessageCircle size={18} color={WorkEzTheme.colors.primary} style={styles.buttonIcon} />
          Abrir chat
        </Button>

        {service?.id ? (
          <Button
            variant="ghost"
            fullWidth
            onPress={() => router.push(`/client/tracking/${service.id}` as any)}
          >
            Acompanhar chamado
          </Button>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'space-between',
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    ...WorkEzTheme.typography.base,
    color: WorkEzTheme.colors.textSecondary,
    marginTop: 16,
  },
  errorIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    ...WorkEzTheme.typography.xl,
    fontWeight: WorkEzTheme.typography.fontWeight.bold,
    color: WorkEzTheme.colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtitle: {
    ...WorkEzTheme.typography.base,
    color: WorkEzTheme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 280,
  },
  backButton: {
    minWidth: 160,
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  headerSubtitle: {
    ...WorkEzTheme.typography.base,
    color: '#64748B',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 16,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 16,
  },
  photoContainer: {
    position: 'relative',
  },
  photo: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  photoPlaceholder: {
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#10B981',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  badgeWrapper: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  servicesCount: {
    fontSize: 13,
    color: '#64748B',
  },
  detailsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 16,
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    maxWidth: '65%',
  },
  priceValue: {
    color: '#2563EB',
    fontSize: 15,
  },
  infoBox: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#1D4ED8',
  },
  footer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    padding: 20,
    gap: 10,
  },
  buttonIcon: {
    marginRight: 8,
  },
});
