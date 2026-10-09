import { useState, useCallback } from 'react';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { 
  ArrowLeft, 
  MapPin, 
  MessageCircle, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Navigation, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  BadgeDollarSign
} from 'lucide-react-native';
import { 
  View, 
  Text, 
  ActivityIndicator, 
  Alert, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Platform 
} from 'react-native';
import { useFetch } from '../../../hooks/useFetch';
import { WorkEzTheme } from '../../../constants/theme';
import { apiRequest } from '../../../services/api';

interface ServiceDetail {
  id: string;
  category: string;
  description: string;
  address?: string;
  startTime?: string;
  createdAt?: string;
  date?: string;
  status: string;
  clientName: string;
  clientPhone?: string;
  price?: number;
}

export default function AcceptedService() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [starting, setStarting] = useState(false);

  const { data: service, loading, error, refetch } = useFetch<ServiceDetail>(
    id ? `/api/Services/${id}` : null
  );

  useFocusEffect(
    useCallback(() => {
      if (id) {
        refetch();
      }
    }, [id, refetch])
  );

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/provider/calls' as any);
    }
  };

  const handleOpenChat = () => {
    if (!id) return;
    router.push({
      pathname: '/provider/chat/[id]',
      params: { id, serviceId: id }
    } as any);
  };

  const handleStartDisplacement = async () => {
    if (!id) return;
    setStarting(true);
    try {
      const res = await apiRequest<{ id: string; status: string }>(`/api/Services/${id}/start-displacement`, {
        method: 'POST'
      });

      if (res.error) {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert(`Erro: ${res.error}`);
        } else {
          Alert.alert('Erro', res.error);
        }
      } else {
        router.push(`/provider/in-progress/${id}` as any);
      }
    } catch (err: any) {
      const msg = err?.message || 'Não foi possível se conectar ao servidor.';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(`Erro: ${msg}`);
      } else {
        Alert.alert('Erro', msg);
      }
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={WorkEzTheme.colors.primary} />
        <Text style={styles.loadingText}>Carregando detalhes do serviço...</Text>
      </View>
    );
  }

  if (error || !service) {
    return (
      <View style={styles.centerContainer}>
        <AlertCircle size={44} color="#EF4444" />
        <Text style={styles.errorTitle}>Não foi possível carregar o chamado</Text>
        <Text style={styles.errorSub}>{error || 'Serviço não encontrado no sistema.'}</Text>
        <TouchableOpacity style={styles.btnSecondary} onPress={handleBack}>
          <Text style={styles.btnSecondaryText}>Voltar para Meus Chamados</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const formattedPrice = service.price !== undefined && service.price !== null
    ? `R$ ${Number(service.price).toFixed(2).replace('.', ',')}`
    : 'A combinar';

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity 
            onPress={handleBack} 
            style={styles.backButton}
            accessibilityLabel="Voltar"
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color="#0F172A" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Chamado Aceito</Text>
            <Text style={styles.headerSubtitle}>Aguardando início do deslocamento</Text>
          </View>
          <View style={styles.badgeSuccess}>
            <Text style={styles.badgeSuccessText}>Aceito</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Banner de status */}
        <View style={styles.statusBanner}>
          <CheckCircle2 size={22} color="#16A34A" style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.statusBannerTitle}>Proposta Aceita!</Text>
            <Text style={styles.statusBannerText}>
              O cliente confirmou a sua proposta. Quando estiver pronto para ir até o endereço, clique no botão abaixo para avisar que está a caminho.
            </Text>
          </View>
        </View>

        {/* Card do Serviço & Valor */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.serviceCategory}>{service.category || 'Serviço Técnico'}</Text>
              <Text style={styles.serviceLabel}>Detalhes do Pedido</Text>
            </View>
            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>Valor Fechado</Text>
              <Text style={styles.priceValue}>{formattedPrice}</Text>
            </View>
          </View>

          {service.description ? (
            <View style={styles.descriptionBox}>
              <FileText size={16} color="#64748B" style={{ marginTop: 2 }} />
              <Text style={styles.descriptionText}>{service.description}</Text>
            </View>
          ) : null}

          <View style={styles.divider} />

          <View style={styles.infoGrid}>
            <View style={styles.infoCol}>
              <View style={styles.infoIconRow}>
                <Calendar size={16} color="#64748B" />
                <Text style={styles.infoMetaLabel}>Data do Serviço</Text>
              </View>
              <Text style={styles.infoMetaValue}>{service.date || 'Hoje'}</Text>
            </View>

            <View style={styles.infoCol}>
              <View style={styles.infoIconRow}>
                <Clock size={16} color="#64748B" />
                <Text style={styles.infoMetaLabel}>Criado / Agendado</Text>
              </View>
              <Text style={styles.infoMetaValue}>{service.startTime || 'Conforme combinado'}</Text>
            </View>
          </View>
        </View>

        {/* Card do Cliente & Contato */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Cliente</Text>
          
          <View style={styles.clientRow}>
            <View style={styles.avatar}>
              <User size={22} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.clientName}>{service.clientName || 'Cliente WorkEz'}</Text>
              {service.clientPhone ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <Phone size={13} color="#64748B" />
                  <Text style={styles.clientPhone}>{service.clientPhone}</Text>
                </View>
              ) : (
                <Text style={styles.clientSub}>Contato verificado</Text>
              )}
            </View>
          </View>

          <TouchableOpacity 
            style={styles.chatButton}
            onPress={handleOpenChat}
            activeOpacity={0.8}
          >
            <MessageCircle size={18} color="#2563EB" />
            <Text style={styles.chatButtonText}>Conversar no Chat com o Cliente</Text>
          </TouchableOpacity>
        </View>

        {/* Card de Localização */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Local de Atendimento</Text>
          <View style={styles.addressRow}>
            <View style={styles.addressIconWrap}>
              <MapPin size={20} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.addressTitle}>Endereço do Chamado</Text>
              <Text style={styles.addressValue}>
                {service.address || 'Endereço cadastrado pelo cliente'}
              </Text>
            </View>
          </View>
        </View>

        {/* Linha do Tempo / Próximos Passos */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Etapas do Chamado</Text>
          
          <View style={styles.timelineItem}>
            <View style={[styles.timelineDot, styles.timelineDotDone]}>
              <CheckCircle2 size={16} color="#FFFFFF" />
            </View>
            <View style={styles.timelineBody}>
              <Text style={styles.timelineTitleDone}>1. Chamado Aceito</Text>
              <Text style={styles.timelineDesc}>Proposta fechada por {formattedPrice}.</Text>
            </View>
          </View>

          <View style={styles.timelineConnector} />

          <View style={styles.timelineItem}>
            <View style={[styles.timelineDot, styles.timelineDotActive]}>
              <Navigation size={14} color="#FFFFFF" />
            </View>
            <View style={styles.timelineBody}>
              <Text style={styles.timelineTitleActive}>2. Iniciar Deslocamento (Próximo passo)</Text>
              <Text style={styles.timelineDesc}>Avise o cliente quando você sair para o local.</Text>
            </View>
          </View>

          <View style={styles.timelineConnector} />

          <View style={styles.timelineItem}>
            <View style={[styles.timelineDot, styles.timelineDotPending]} />
            <View style={styles.timelineBody}>
              <Text style={styles.timelineTitlePending}>3. Execução do Serviço</Text>
              <Text style={styles.timelineDesc}>Realização do serviço no endereço.</Text>
            </View>
          </View>

          <View style={styles.timelineConnector} />

          <View style={styles.timelineItem}>
            <View style={[styles.timelineDot, styles.timelineDotPending]} />
            <View style={styles.timelineBody}>
              <Text style={styles.timelineTitlePending}>4. Finalização e Pagamento</Text>
              <Text style={styles.timelineDesc}>Liberação do pagamento acordado.</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Barra Inferior com Ação Primária */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryActionBtn, starting && styles.btnDisabled]}
          onPress={handleStartDisplacement}
          disabled={starting}
          activeOpacity={0.85}
        >
          {starting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Navigation size={20} color="#FFFFFF" />
              <Text style={styles.primaryActionText}>Iniciar Deslocamento</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 24,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    color: '#64748B',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12,
  },
  errorSub: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 6,
    textAlign: 'center',
    marginBottom: 20,
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 1,
  },
  badgeSuccess: {
    backgroundColor: 'rgba(22, 163, 74, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.25)',
  },
  badgeSuccessText: {
    color: '#15803D',
    fontWeight: '700',
    fontSize: 12,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
    gap: 16,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  statusBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 2,
  },
  statusBannerText: {
    fontSize: 13,
    color: '#15803D',
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  serviceCategory: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  serviceLabel: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  priceContainer: {
    alignItems: 'flex-end',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  priceLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#15803D',
    marginTop: 2,
  },
  descriptionBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  descriptionText: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  infoCol: {
    flex: 1,
  },
  infoIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  infoMetaLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  infoMetaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  clientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  clientPhone: {
    fontSize: 13,
    color: '#64748B',
  },
  clientSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  chatButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  addressIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 2,
  },
  addressValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    lineHeight: 20,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  timelineDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  timelineDotDone: {
    backgroundColor: '#16A34A',
  },
  timelineDotActive: {
    backgroundColor: '#2563EB',
  },
  timelineDotPending: {
    backgroundColor: '#E2E8F0',
    borderWidth: 2,
    borderColor: '#CBD5E1',
  },
  timelineConnector: {
    width: 2,
    height: 20,
    backgroundColor: '#E2E8F0',
    marginLeft: 12,
    marginVertical: 2,
  },
  timelineBody: {
    flex: 1,
  },
  timelineTitleDone: {
    fontSize: 14,
    fontWeight: '700',
    color: '#15803D',
  },
  timelineTitleActive: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },
  timelineTitlePending: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  timelineDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    alignItems: 'center',
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#2563EB',
    width: '100%',
    maxWidth: 760,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryActionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnDisabled: {
    opacity: 0.65,
  },
  btnSecondary: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  btnSecondaryText: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 14,
  },
});
