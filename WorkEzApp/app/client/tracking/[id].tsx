import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAppTheme } from '../../../contexts/ThemeContext';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { formatDate } from '../../../utils/date';
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
  BadgeDollarSign, 
  Wrench, 
  Star, 
  Gavel, 
  CornerDownRight, 
  X as XIcon, 
  Check,
  ChevronRight,
  ShieldCheck,
  QrCode,
  Copy,
  Camera,
  Eye
} from 'lucide-react-native';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Image, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  Alert, 
  Modal, 
  TextInput, 
  Platform 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WorkEzTheme } from '../../../constants/theme';
import { useFetch } from '../../../hooks/useFetch';
import { apiRequest, getWebSocketUrl, resolveImageUrl } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { LiveTrackingMap } from '../../../components/LiveTrackingMap';

interface Professional {
  id: string;
  userId?: string;
  name: string;
  photo?: string;
  rating?: number;
  phone?: string;
}

interface ProposalData {
  id: string;
  serviceId: string;
  providerId: string;
  providerName: string;
  providerPhoto?: string;
  providerRating?: number;
  providerUserId?: string;
  proposedPrice: number;
  laborPrice?: number;
  materialsPrice?: number;
  description?: string;
  estimatedTime?: string;
  status: string; // 'Pending' | 'Accepted' | 'Rejected' | 'CounterOffered' | 'NegotiationOpen'
  createdAt: string;
  counterPrice?: number;
  counterDescription?: string;
  counterOfferedAt?: string;
}

interface ServiceData {
  id: string;
  category: string;
  description?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  startTime?: string;
  date?: string;
  createdAt?: string;
  status:
    | 'open'
    | 'accepted'
    | 'undernegotiation'
    | 'on-the-way'
    | 'ontheway'
    | 'in-progress'
    | 'inprogress'
    | 'waiting-payment'
    | 'waitingpayment'
    | 'completed'
    | 'cancelled';
  price?: number;
  professional: Professional | null;
  startCheckInCode?: string;
  beforePhotos?: string[];
  afterPhotos?: string[];
  completedClientSignatureUrl?: string;
}

export default function ServiceTracking() {
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
  const router = useRouter();
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [cancelling, setCancelling] = useState(false);

  // Counter proposal modal state
  const [counterModalVisible, setCounterModalVisible] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<ProposalData | null>(null);
  const [counterPriceInput, setCounterPriceInput] = useState('');
  const [counterDescInput, setCounterDescInput] = useState('');
  const [submittingCounter, setSubmittingCounter] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Security Check-in OTP & Checklist Photos Modal States (Branch 5)
  const [showQrModal, setShowQrModal] = useState(false);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  const { data: initialService, loading, error, refetch: refetchInitialService } = useFetch<ServiceData>(
    id ? `/api/Services/${id}` : null
  );

  const { data: initialProposals, refetch: refetchInitialProposals } = useFetch<ProposalData[]>(
    id ? `/api/Proposals/by-service/${id}` : null
  );

  const { data: serviceReview, refetch: refetchServiceReview } = useFetch<any>(
    id ? `/api/Reviews/by-service/${id}` : null
  );

  useFocusEffect(
    useCallback(() => {
      if (id) {
        refetchInitialService();
        refetchInitialProposals();
        refetchServiceReview();
      }
    }, [id, refetchInitialService, refetchInitialProposals, refetchServiceReview])
  );

  const [service, setService] = useState<ServiceData | null>(null);
  const [proposals, setProposals] = useState<ProposalData[] | null>(null);

  // Sincroniza dados iniciais do carregamento ao abrir a tela
  useEffect(() => {
    if (initialService) setService(initialService);
  }, [initialService]);

  useEffect(() => {
    if (initialProposals) setProposals(initialProposals);
  }, [initialProposals]);

  // Atualização silenciosa em segundo plano (SEM recarregar a tela e SEM spinner)
  const silentFetchProposals = useCallback(async () => {
    if (!id) return;
    const res = await apiRequest<ProposalData[]>(`/api/Proposals/by-service/${id}`);
    if (res.data) {
      setProposals(prev => {
        if (JSON.stringify(prev) !== JSON.stringify(res.data)) {
          return res.data;
        }
        return prev;
      });
    }
  }, [id]);

  const silentFetchService = useCallback(async () => {
    if (!id) return;
    const res = await apiRequest<ServiceData>(`/api/Services/${id}`);
    if (res.data) {
      setService(prev => {
        if (JSON.stringify(prev) !== JSON.stringify(res.data)) {
          return res.data;
        }
        return prev;
      });
    }
  }, [id]);

  // Conexão WebSocket para atualizações em tempo real (push)
  useEffect(() => {
    if (!id) return;

    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;
    let isMounted = true;

    // Polling redundante a cada 4s para garantir sincronização contínua
    const pollTimer = setInterval(() => {
      if (isMounted) {
        silentFetchProposals();
        silentFetchService();
        refetchServiceReview();
      }
    }, 4000);

    async function connect() {
      if (!isMounted) return;
      try {
        const wsUrl = await getWebSocketUrl(`/ws/tracking?serviceId=${id}`);
        if (!isMounted) return;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('[Client Tracking WS] Conectado em tempo real ao chamado:', id);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('[Client Tracking WS] Atualização recebida:', data.eventType);
            if (isMounted) {
              silentFetchProposals();
              silentFetchService();
              refetchServiceReview();
            }
          } catch (e) {
            console.warn('[Client Tracking WS] Erro ao processar mensagem do socket:', e);
          }
        };

        ws.onclose = () => {
          if (isMounted) {
            reconnectTimeout = setTimeout(connect, 4000);
          }
        };
      } catch (e) {
        console.warn('[Client Tracking WS] Erro ao conectar socket:', e);
      }
    }

    connect();

    return () => {
      isMounted = false;
      clearInterval(pollTimer);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, [id, silentFetchProposals, silentFetchService, refetchServiceReview]);

  const formatEstimatedTime = (time: string | undefined | null) => {
    if (!time) return '';
    const trimmed = time.trim();
    if (!trimmed) return '';
    if (/^\d+([.,]\d+)?$/.test(trimmed)) {
      return `${trimmed} hora(s)`;
    }
    return trimmed;
  };

  const formatDateTime = (dateStr: string | undefined | null) => {
    if (!dateStr) return '-';
    if (dateStr.includes('às')) return dateStr;

    try {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        return new Intl.DateTimeFormat('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }).format(parsed).replace(', ', ' às ');
      }
    } catch {
      // fallback
    }

    const parts = dateStr.match(/^(\d{2})[-/](\d{2})[-/](\d{4})\s+(\d{2}):(\d{2})/);
    if (parts) {
      return `${parts[1]}/${parts[2]}/${parts[3]} às ${parts[4]}:${parts[5]}`;
    }

    return dateStr;
  };

  const handleBack = () => {
    if (from === 'services') {
      router.replace('/client/services' as any);
      return;
    }
    if (typeof router.canDismiss === 'function' && router.canDismiss()) {
      router.dismissAll();
    }
    router.replace('/client' as any);
  };

  const handleCancelService = async () => {
    const isDisplaced = service?.status === 'on-the-way' || service?.status === 'ontheway';
    const alertMessage = isDisplaced
      ? 'Tem certeza que deseja cancelar este serviço? Como o profissional já está a caminho, será cobrada uma taxa de deslocamento.'
      : 'Tem certeza que deseja cancelar este serviço?';

    const execute = async () => {
      setCancelling(true);
      try {
        const res = await apiRequest(`/api/Services/${id}/status?status=false`, {
          method: 'PATCH'
        });
        if (res.error) {
          Alert.alert('Erro', res.error);
        } else {
          Alert.alert('Sucesso', 'Serviço cancelado com sucesso!', [
            { text: 'OK', onPress: () => router.replace('/client/services' as any) }
          ]);
        }
      } catch (err) {
        console.error(err);
        Alert.alert('Erro', 'Não foi possível conectar ao servidor.');
      } finally {
        setCancelling(false);
      }
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(alertMessage)) {
        await execute();
      }
    } else {
      Alert.alert(
        'Cancelar chamado',
        alertMessage,
        [
          { text: 'Não', style: 'cancel' },
          { text: 'Sim, cancelar', style: 'destructive', onPress: execute }
        ]
      );
    }
  };

  const handleAcceptProposal = async (proposalId: string) => {
    if (!user) return;

    const execute = async () => {
      setActionLoadingId(proposalId);
      try {
        const res = await apiRequest('/api/Proposals/accept', {
          method: 'POST',
          body: JSON.stringify({ customerUserId: user.id, proposalId })
        });
        if (res.error) {
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.alert(`Erro ao aceitar proposta: ${res.error}`);
          } else {
            Alert.alert('Erro ao aceitar proposta', res.error);
          }
        } else {
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.alert('Proposta aceita! O agendamento foi confirmado.');
          } else {
            Alert.alert('Sucesso!', 'Proposta aceita! O agendamento foi confirmado.');
          }
          silentFetchService();
          silentFetchProposals();
        }
      } catch (err) {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert('Não foi possível aceitar a proposta.');
        } else {
          Alert.alert('Erro', 'Não foi possível aceitar a proposta.');
        }
      } finally {
        setActionLoadingId(null);
      }
    };

    const confirmMsg = 'Deseja aceitar esta proposta? Ao aceitar, o agendamento será confirmado e o chamado passará para as etapas de execução.';
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(confirmMsg)) {
        await execute();
      }
    } else {
      Alert.alert(
        'Aceitar Proposta',
        confirmMsg,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Confirmar', onPress: execute }
        ]
      );
    }
  };

  const handleRejectProposal = async (proposalId: string) => {
    if (!user) return;

    const execute = async () => {
      setActionLoadingId(proposalId);
      try {
        const res = await apiRequest('/api/Proposals/reject', {
          method: 'POST',
          body: JSON.stringify({ customerUserId: user.id, proposalId })
        });
        if (res.error) {
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.alert(`Erro ao recusar: ${res.error}`);
          } else {
            Alert.alert('Erro ao recusar', res.error);
          }
        } else {
          silentFetchProposals();
        }
      } catch (err) {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert('Não foi possível recusar a proposta.');
        } else {
          Alert.alert('Erro', 'Não foi possível recusar a proposta.');
        }
      } finally {
        setActionLoadingId(null);
      }
    };

    const confirmMsg = 'Tem certeza que deseja recusar esta proposta?';
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(confirmMsg)) {
        await execute();
      }
    } else {
      Alert.alert(
        'Recusar Proposta',
        confirmMsg,
        [
          { text: 'Não', style: 'cancel' },
          { text: 'Sim, recusar', style: 'destructive', onPress: execute }
        ]
      );
    }
  };

  const openCounterModal = (proposal: ProposalData) => {
    setSelectedProposal(proposal);
    setCounterPriceInput(proposal.counterPrice ? proposal.counterPrice.toString() : '');
    setCounterDescInput(proposal.counterDescription || '');
    setCounterModalVisible(true);
  };

  const handleSendCounterProposal = async () => {
    if (!user || !selectedProposal) return;
    const priceNum = parseFloat(counterPriceInput.replace(',', '.'));
    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert('Valor inválido', 'Por favor, informe um valor numérico válido maior que zero.');
      return;
    }

    setSubmittingCounter(true);
    try {
      const res = await apiRequest('/api/Proposals/counter', {
        method: 'POST',
        body: JSON.stringify({
          customerUserId: user.id,
          proposalId: selectedProposal.id,
          counterPrice: priceNum,
          counterDescription: counterDescInput.trim() || undefined
        })
      });

      if (res.error) {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert(`Erro ao enviar contra-proposta: ${res.error}`);
        } else {
          Alert.alert('Erro', res.error);
        }
      } else {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert('Contra-proposta enviada com sucesso! Aguarde a resposta do prestador.');
        } else {
          Alert.alert('Sucesso!', 'Contra-proposta enviada! Aguarde a resposta do prestador.');
        }
        setCounterModalVisible(false);
        silentFetchProposals();
        silentFetchService();
      }
    } catch (err) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('Não foi possível enviar contra-proposta.');
      } else {
        Alert.alert('Erro', 'Não foi possível enviar contra-proposta.');
      }
    } finally {
      setSubmittingCounter(false);
    }
  };

  if (loading && !service) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={WorkEzTheme.colors.primary} />
        <Text style={styles.loadingText}>Carregando informações do chamado...</Text>
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

  // Normalização de status
  const currentStatus = (service?.status || '').toLowerCase();
  const isCancelled = currentStatus === 'cancelled';
  const isCompleted = currentStatus === 'completed';
  const isWaitingPayment = currentStatus === 'waiting-payment' || currentStatus === 'waitingpayment';
  const isInProgress = currentStatus === 'in-progress' || currentStatus === 'inprogress';
  const isOnTheWay = currentStatus === 'on-the-way' || currentStatus === 'ontheway';
  const isAccepted = currentStatus === 'accepted';
  const isOpenOrAuction = currentStatus === 'open' || currentStatus === 'undernegotiation';

  // Proposta aceita ativa
  const acceptedProposal = proposals?.find(p => p.status?.toLowerCase() === 'accepted');
  const targetChatProposalId = acceptedProposal ? acceptedProposal.id : (proposals?.[0]?.id || id);

  // Preço formatado
  const displayedPrice = service.price || acceptedProposal?.proposedPrice;
  const formattedPrice = displayedPrice !== undefined && displayedPrice !== null
    ? `R$ ${Number(displayedPrice).toFixed(2).replace('.', ',')}`
    : isOpenOrAuction
    ? 'Em Leilão'
    : 'A combinar';

  // Configuração do Cabeçalho
  const getHeaderProps = () => {
    if (isCancelled) {
      return {
        title: 'Chamado Cancelado',
        subtitle: 'Este chamado foi cancelado',
        badge: 'Cancelado',
        badgeStyle: styles.badgeDanger,
        badgeTextStyle: styles.badgeDangerText
      };
    }
    if (isCompleted) {
      return {
        title: 'Serviço Concluído',
        subtitle: 'Chamado finalizado com sucesso',
        badge: 'Concluído',
        badgeStyle: styles.badgeSuccess,
        badgeTextStyle: styles.badgeSuccessText
      };
    }
    if (isWaitingPayment) {
      return {
        title: 'Aguardando Pagamento',
        subtitle: 'Serviço finalizado, efetue o pagamento',
        badge: 'Pagamento',
        badgeStyle: styles.badgeWarning,
        badgeTextStyle: styles.badgeWarningText
      };
    }
    if (isInProgress) {
      return {
        title: 'Serviço em Andamento',
        subtitle: 'Prestador executando o trabalho no local',
        badge: 'Em Execução',
        badgeStyle: styles.badgePrimary,
        badgeTextStyle: styles.badgePrimaryText
      };
    }
    if (isOnTheWay) {
      return {
        title: 'Profissional a Caminho',
        subtitle: 'Prestador em deslocamento até o seu endereço',
        badge: 'A Caminho',
        badgeStyle: styles.badgePrimary,
        badgeTextStyle: styles.badgePrimaryText
      };
    }
    if (isAccepted) {
      return {
        title: 'Chamado Aceito',
        subtitle: 'Aguardando início do deslocamento',
        badge: 'Aceito',
        badgeStyle: styles.badgeSuccess,
        badgeTextStyle: styles.badgeSuccessText
      };
    }
    return {
      title: 'Acompanhar Chamado',
      subtitle: proposals && proposals.length > 0 ? `${proposals.length} proposta(s) no leilão` : 'Aguardando propostas de prestadores',
      badge: proposals && proposals.length > 0 ? 'Em Leilão' : 'Aberto',
      badgeStyle: styles.badgePrimary,
      badgeTextStyle: styles.badgePrimaryText
    };
  };

  const headerProps = getHeaderProps();

  return (
    <View style={styles.container}>
      {/* Top Header unificado */}
      <ScreenHeader
        title={headerProps.title}
        subtitle={headerProps.subtitle}
        showBack
        onBack={handleBack}
        rightElement={
          <View style={headerProps.badgeStyle}>
            <Text style={headerProps.badgeTextStyle}>{headerProps.badge}</Text>
          </View>
        }
      />

      <ScrollView 
        contentContainerStyle={[
          styles.scrollContent, 
          { paddingBottom: 40 + (insets.bottom > 0 ? insets.bottom : (Platform.OS === 'ios' ? 24 : 16)) }
        ]} 
        showsVerticalScrollIndicator={false}
      >
        {/* Banner de status contextual padronizado */}
        {isCancelled ? (
          <View style={[styles.statusBanner, styles.bannerDanger]}>
            <AlertCircle size={22} color="#DC2626" style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusBannerTitle, { color: '#991B1B' }]}>Chamado Cancelado</Text>
              <Text style={[styles.statusBannerText, { color: '#B91C1C' }]}>
                Este chamado foi cancelado. Você pode solicitar um novo chamado quando quiser.
              </Text>
            </View>
          </View>
        ) : isCompleted ? (
          <View style={[styles.statusBanner, styles.bannerSuccess]}>
            <CheckCircle2 size={22} color="#16A34A" style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.statusBannerTitle}>Serviço Concluído com Sucesso!</Text>
              <Text style={styles.statusBannerText}>
                O chamado foi finalizado pelo prestador. Não se esqueça de avaliar a experiência abaixo!
              </Text>
            </View>
          </View>
        ) : isWaitingPayment ? (
          <View style={[styles.statusBanner, styles.bannerWarning]}>
            <Clock size={22} color="#D97706" style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusBannerTitle, { color: '#B45309' }]}>Serviço Concluído • Pagamento Pendente</Text>
              <Text style={[styles.statusBannerText, { color: '#92400E' }]}>
                O profissional concluiu o atendimento. Efetue o pagamento para liberar o valor acordado.
              </Text>
            </View>
          </View>
        ) : isInProgress ? (
          <View style={[styles.statusBanner, styles.bannerPrimary]}>
            <Wrench size={22} color="#2563EB" style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusBannerTitle, { color: '#1E40AF' }]}>Serviço em Andamento no seu Local</Text>
              <Text style={[styles.statusBannerText, { color: '#1D4ED8' }]}>
                O profissional está realizando as atividades no seu endereço. Qualquer dúvida, utilize o chat.
              </Text>
            </View>
          </View>
        ) : isOnTheWay ? (
          <View style={[styles.statusBanner, styles.bannerPrimary]}>
            <Navigation size={22} color="#2563EB" style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusBannerTitle, { color: '#1E40AF' }]}>Profissional a Caminho!</Text>
              <Text style={[styles.statusBannerText, { color: '#1D4ED8' }]}>
                O prestador iniciou o deslocamento até o seu endereço. Fique atento à sua chegada.
              </Text>
            </View>
          </View>
        ) : isAccepted ? (
          <View style={styles.statusBanner}>
            <CheckCircle2 size={22} color="#16A34A" style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.statusBannerTitle}>Proposta aceita! Agendamento gerado.</Text>
              <Text style={styles.statusBannerText}>
                Você aceitou a proposta do prestador. Aguardando o início do deslocamento até o endereço.
              </Text>
            </View>
          </View>
        ) : (
          <View style={[styles.statusBanner, styles.bannerPrimary]}>
            <Gavel size={22} color="#2563EB" style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusBannerTitle, { color: '#1E40AF' }]}>Leilão de Propostas em Andamento</Text>
              <Text style={[styles.statusBannerText, { color: '#1D4ED8' }]}>
                Profissionais qualificados estão enviando lances. Analise os valores abaixo e aceite o melhor orçamento!
              </Text>
            </View>
          </View>
        )}

        {/* Mapa com trajeto em tempo real e polyline do deslocamento do prestador */}
        {(isOnTheWay || isInProgress || isAccepted) && (
          <LiveTrackingMap
            providerName={acceptedProposal?.providerName || service.professional?.name || 'Profissional WorkEz'}
            status={currentStatus}
            clientAddress={service.address || 'Endereço de Atendimento'}
            distanceKm={3.2}
            estimatedMinutes={isOnTheWay ? 12 : 5}
          />
        )}

        {/* ─── CARD DE CHECK-IN DE SEGURANÇA (BRANCH 5) ────────────────────────── */}
        {(isAccepted || isOnTheWay || isInProgress) && (
          <View style={styles.securityCard}>
            <View style={styles.securityHeaderRow}>
              <View style={[styles.securityShieldBadge, isInProgress && { backgroundColor: '#16A34A' }]}>
                <ShieldCheck size={20} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.securityCardTitle}>
                  {isInProgress ? 'Check-in Realizado com Sucesso' : 'Código de Início do Atendimento'}
                </Text>
                <Text style={styles.securityCardSubtitle}>
                  {isInProgress
                    ? 'Presença do profissional validada presencialmente'
                    : 'Informe ao profissional apenas quando ele estiver no seu local'}
                </Text>
              </View>
            </View>

            {!isInProgress ? (
              <>
                {/* Bloco dos 4 dígitos */}
                <View style={styles.otpContainer}>
                  {(() => {
                    const rawCode = service.startCheckInCode || '7492';
                    const digits = rawCode.padEnd(4, '-').slice(0, 4).split('');
                    return digits.map((digit, idx) => (
                      <View key={idx} style={styles.otpDigitBox}>
                        <Text style={styles.otpDigitText}>{digit}</Text>
                      </View>
                    ));
                  })()}
                </View>

                {/* Botões de Ação: Copiar e QR Code */}
                <View style={styles.securityActionsRow}>
                  <TouchableOpacity
                    style={styles.securityBtnSecondary}
                    onPress={async () => {
                      const code = service.startCheckInCode || '7492';
                      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
                        await navigator.clipboard.writeText(code);
                      }
                      setCodeCopied(true);
                      setTimeout(() => setCodeCopied(false), 2500);
                      if (Platform.OS !== 'web') {
                        Alert.alert('Código Copiado!', `Código ${code} copiado para a área de transferência.`);
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    {codeCopied ? <Check size={16} color="#16A34A" /> : <Copy size={16} color="#2563EB" />}
                    <Text style={[styles.securityBtnSecondaryText, codeCopied && { color: '#16A34A' }]}>
                      {codeCopied ? 'Copiado!' : 'Copiar Código'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.securityBtnPrimary}
                    onPress={() => setShowQrModal(true)}
                    activeOpacity={0.8}
                  >
                    <QrCode size={16} color="#FFFFFF" />
                    <Text style={styles.securityBtnPrimaryText}>Mostrar QR Code</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.securityDisclaimer}>
                  Proteção WorkEz: O profissional só poderá destravar a execução e faturar o chamado após validar este código com você.
                </Text>
              </>
            ) : (
              <View style={styles.securityValidatedRow}>
                <CheckCircle2 size={18} color="#16A34A" />
                <Text style={styles.securityValidatedText}>
                  Atendimento desbloqueado presencialmente e registrado em segurança.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ─── VISTORIA FOTOGRÁFICA DO SERVIÇO (BRANCH 5) ────────────────────────── */}
        {((service.beforePhotos && service.beforePhotos.length > 0) || (service.afterPhotos && service.afterPhotos.length > 0)) && (
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Camera size={18} color="#2563EB" />
              <Text style={styles.sectionTitle}>Vistoria Fotográfica do Serviço</Text>
            </View>
            <Text style={styles.checklistSubtitle}>
              Fotos registradas pelo profissional para segurança e transparência:
            </Text>

            {service.beforePhotos && service.beforePhotos.length > 0 && (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.checklistSectionLabel}>Fotos de Início (Antes)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, marginTop: 6 }}>
                  {service.beforePhotos.map((url, idx) => (
                    <TouchableOpacity key={idx} onPress={() => setPreviewPhotoUrl(url)} activeOpacity={0.85}>
                      <Image source={{ uri: resolveImageUrl(url) || url }} style={styles.checklistThumb} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {service.afterPhotos && service.afterPhotos.length > 0 && (
              <View style={{ marginTop: 14 }}>
                <Text style={styles.checklistSectionLabel}>Fotos de Conclusão (Depois)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, marginTop: 6 }}>
                  {service.afterPhotos.map((url, idx) => (
                    <TouchableOpacity key={idx} onPress={() => setPreviewPhotoUrl(url)} activeOpacity={0.85}>
                      <Image source={{ uri: resolveImageUrl(url) || url }} style={styles.checklistThumb} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        )}

        {/* Card do Serviço & Valor padronizado */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.serviceCategory}>{service.category || 'Serviço Solicitado'}</Text>
              <Text style={styles.serviceLabel}>Detalhes do Pedido</Text>
            </View>
            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>{isAccepted || isOnTheWay || isInProgress || isWaitingPayment || isCompleted ? 'Valor Fechado' : 'Valor'}</Text>
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
              <Text style={styles.infoMetaValue}>{service.date ? formatDate(service.date) : 'Hoje'}</Text>
            </View>

            <View style={styles.infoCol}>
              <View style={styles.infoIconRow}>
                <Clock size={16} color="#64748B" />
                <Text style={styles.infoMetaLabel}>Criado / Agendado</Text>
              </View>
              <Text style={styles.infoMetaValue}>{formatDateTime(service.startTime)}</Text>
            </View>
          </View>
        </View>

        {/* Card do Profissional / Propostas do Leilão */}
        {isOpenOrAuction && (!proposals || proposals.length === 0) ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Propostas Recebidas</Text>
            <View style={{ paddingVertical: 14, alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#2563EB" style={{ marginBottom: 8 }} />
              <Text style={{ color: '#64748B', fontSize: 14, textAlign: 'center' }}>
                Buscando prestadores disponíveis na sua região... Os lances aparecerão aqui automaticamente.
              </Text>
            </View>
          </View>
        ) : isOpenOrAuction && proposals && proposals.length > 0 ? (
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={styles.sectionTitle}>Lances no Leilão ({proposals.length})</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Clock size={13} color="#2563EB" />
                <Text style={{ fontSize: 12, color: '#2563EB', fontWeight: '600' }}>Tempo real</Text>
              </View>
            </View>

            {proposals.map((proposal) => {
              const isPending = proposal.status?.toLowerCase() === 'pending';
              const isCountered = proposal.status?.toLowerCase() === 'counteroffered';
              const isNegotiating = proposal.status?.toLowerCase() === 'negotiationopen';
              const isPropAccepted = proposal.status?.toLowerCase() === 'accepted';
              const isRejected = proposal.status?.toLowerCase() === 'rejected';
              const isLoading = actionLoadingId === proposal.id;

              return (
                <View key={proposal.id} style={styles.proposalItemCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <TouchableOpacity
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                      onPress={() => {
                        const targetId = proposal.providerId || (proposal as any)?.providerUserId;
                        if (targetId) {
                          router.push({
                            pathname: '/client/professional/[id]',
                            params: { id: targetId, serviceId: id }
                          } as any);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      {proposal.providerPhoto ? (
                        <Image
                          source={{ uri: resolveImageUrl(proposal.providerPhoto) || proposal.providerPhoto }}
                          style={styles.avatarImg}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.avatar}>
                          <User size={20} color="#2563EB" />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F172A' }}>
                            {proposal.providerName}
                          </Text>
                          <View style={styles.miniProfileBadge}>
                            <Text style={styles.miniProfileBadgeText}>Ver perfil ›</Text>
                          </View>
                        </View>
                        {proposal.estimatedTime && (
                          <Text style={{ fontSize: 12, color: '#64748B', marginTop: 1 }}>
                            Estimativa: {formatEstimatedTime(proposal.estimatedTime)}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 18, fontWeight: '800', color: isDark ? '#34D399' : '#15803D' }}>
                        R$ {proposal.proposedPrice?.toFixed(2).replace('.', ',')}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', fontWeight: '500' }}>
                        Lance proposto
                      </Text>
                    </View>
                  </View>

                  {/* Detalhes de Mão de Obra e Materiais */}
                  {proposal.materialsPrice && proposal.materialsPrice > 0 ? (
                    <View style={{ marginTop: 8, flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                      <View style={styles.tagBlue}>
                        <Text style={styles.tagBlueText}>
                          Mão de obra: R$ {(proposal.laborPrice || (proposal.proposedPrice - proposal.materialsPrice)).toFixed(2).replace('.', ',')}
                        </Text>
                      </View>
                      <View style={styles.tagGreen}>
                        <Text style={styles.tagGreenText}>
                          Materiais: R$ {proposal.materialsPrice.toFixed(2).replace('.', ',')}
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  {proposal.description ? (
                    <View style={{ marginTop: 8, padding: 10, backgroundColor: '#F8FAFC', borderRadius: 8, borderWidth: 1, borderColor: '#F1F5F9' }}>
                      <Text style={{ fontSize: 13, color: '#334155', lineHeight: 18 }}>
                        "{proposal.description}"
                      </Text>
                    </View>
                  ) : null}

                  {/* Contra-proposta ativa */}
                  {isCountered && (
                    <View style={styles.counterBanner}>
                      <CornerDownRight size={16} color="#D97706" style={{ marginTop: 2 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#B45309', fontWeight: '700', fontSize: 13 }}>
                          Sua contra-proposta: R$ {proposal.counterPrice?.toFixed(2).replace('.', ',')}
                        </Text>
                        {proposal.counterDescription && (
                          <Text style={{ color: '#92400E', fontSize: 12, marginTop: 2 }}>
                            "{proposal.counterDescription}"
                          </Text>
                        )}
                        <Text style={{ color: '#B45309', fontSize: 11, marginTop: 3, fontStyle: 'italic' }}>
                          Aguardando resposta do prestador...
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Botões de Ação do Leilão */}
                  {(isPending || isNegotiating) && (
                    <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9', gap: 8 }}>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.acceptBtn]}
                          onPress={() => handleAcceptProposal(proposal.id)}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <ActivityIndicator size="small" color="#FFF" />
                          ) : (
                            <Text style={styles.actionBtnTextWhite}>Aceitar Lance</Text>
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.actionBtn, styles.counterBtn]}
                          onPress={() => openCounterModal(proposal)}
                          disabled={isLoading}
                        >
                          <Text style={styles.actionBtnTextWhite}>Contra-proposta</Text>
                        </TouchableOpacity>
                      </View>

                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.chatActionBtn, { flex: 1 }]}
                          onPress={() => router.push(`/client/chat/${proposal.id}` as any)}
                        >
                          <MessageCircle size={15} color="#2563EB" />
                          <Text style={{ color: '#2563EB', fontWeight: '600', fontSize: 13 }}>
                            Chat
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.actionBtn, styles.profileActionBtn, { flex: 1 }]}
                          onPress={() => {
                            const targetId = proposal.providerId || (proposal as any)?.providerUserId;
                            if (targetId) {
                              router.push({
                                pathname: '/client/professional/[id]',
                                params: { id: targetId, serviceId: id }
                              } as any);
                            }
                          }}
                        >
                          <User size={15} color="#0F766E" />
                          <Text style={{ color: '#0F766E', fontWeight: '600', fontSize: 13 }}>
                            Perfil
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.actionBtn, styles.rejectBtn]}
                          onPress={() => handleRejectProposal(proposal.id)}
                          disabled={isLoading}
                        >
                          <Text style={{ color: '#DC2626', fontWeight: '600', fontSize: 13 }}>Recusar</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {isCountered && (
                    <View style={{ marginTop: 10, flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.chatActionBtn, { flex: 1 }]}
                        onPress={() => router.push(`/client/chat/${proposal.id}` as any)}
                      >
                        <MessageCircle size={15} color="#2563EB" />
                        <Text style={{ color: '#2563EB', fontWeight: '600', fontSize: 13 }}>
                          Chat
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionBtn, styles.profileActionBtn, { flex: 1 }]}
                        onPress={() => {
                          const targetId = proposal.providerId || (proposal as any)?.providerUserId;
                          if (targetId) {
                            router.push({
                              pathname: '/client/professional/[id]',
                              params: { id: targetId, serviceId: id }
                            } as any);
                          }
                        }}
                      >
                        <User size={15} color="#0F766E" />
                        <Text style={{ color: '#0F766E', fontWeight: '600', fontSize: 13 }}>
                          Perfil
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionBtn, styles.rejectBtn]}
                        onPress={() => handleRejectProposal(proposal.id)}
                        disabled={isLoading}
                      >
                        <Text style={{ color: '#DC2626', fontWeight: '600', fontSize: 13 }}>Desistir</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          /* Prestador Confirmado */
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Profissional</Text>
            {(() => {
              const confirmedProviderId =
                service.professional?.id ||
                acceptedProposal?.providerId ||
                (service as any)?.providerUserId ||
                service.professional?.userId;

              const handleOpenConfirmedProfile = () => {
                if (confirmedProviderId) {
                  router.push({
                    pathname: '/client/professional/[id]',
                    params: { id: confirmedProviderId, serviceId: id }
                  } as any);
                }
              };

              return (
                <>
                  <TouchableOpacity
                    style={styles.clientRow}
                    onPress={handleOpenConfirmedProfile}
                    activeOpacity={0.7}
                    disabled={!confirmedProviderId}
                  >
                    {(() => {
                      const photoUrl = service.professional?.photo || acceptedProposal?.providerPhoto;
                      const resolved = resolveImageUrl(photoUrl) || photoUrl;
                      return resolved ? (
                        <Image source={{ uri: resolved }} style={styles.avatarImg} resizeMode="cover" />
                      ) : (
                        <View style={styles.avatar}>
                          <User size={22} color="#2563EB" />
                        </View>
                      );
                    })()}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.clientName}>
                        {service.professional?.name || acceptedProposal?.providerName || 'Prestador Confirmado'}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                          <Star size={13} color="#F59E0B" fill="#F59E0B" />
                          <Text style={{ fontSize: 13, fontWeight: '600', color: '#B45309' }}>
                            {service.professional?.rating ? service.professional.rating.toFixed(1) : '5.0'}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 12, color: '#94A3B8' }}>•</Text>
                        <Text style={styles.clientSub}>Profissional Verificado</Text>
                      </View>
                    </View>
                    {confirmedProviderId ? (
                      <ChevronRight size={20} color="#94A3B8" />
                    ) : null}
                  </TouchableOpacity>

                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                    <TouchableOpacity 
                      style={[styles.chatButton, { flex: 1 }]}
                      onPress={() => {
                        router.push({
                          pathname: '/client/chat/[id]',
                          params: { id: targetChatProposalId, serviceId: id }
                        } as any);
                      }}
                      activeOpacity={0.8}
                    >
                      <MessageCircle size={18} color={isDark ? '#60A5FA' : '#2563EB'} />
                      <Text style={styles.chatButtonText}>Chat</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.profileButton, { flex: 1 }]}
                      onPress={handleOpenConfirmedProfile}
                      activeOpacity={0.8}
                      disabled={!confirmedProviderId}
                    >
                      <User size={18} color="#0F766E" />
                      <Text style={styles.profileButtonText}>Ver Perfil</Text>
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}
          </View>
        )}

        {/* Card de Localização padronizado */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Local de Atendimento</Text>
          <View style={styles.addressRow}>
            <View style={styles.addressIconWrap}>
              <MapPin size={20} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.addressTitle}>Endereço do Chamado</Text>
              <Text style={styles.addressValue}>
                {service.address || 'Endereço cadastrado'}
              </Text>
            </View>
          </View>
        </View>

        {/* Card "Etapas do Chamado" - Exatamente o mesmo stepper elegante do prestador */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Etapas do Chamado</Text>
          
          {/* Etapa 1: Chamado Aceito / Leilão */}
          <View style={styles.timelineItem}>
            <View style={[
              styles.timelineDot,
              (isAccepted || isOnTheWay || isInProgress || isWaitingPayment || isCompleted)
                ? styles.timelineDotDone
                : styles.timelineDotActive
            ]}>
              {(isAccepted || isOnTheWay || isInProgress || isWaitingPayment || isCompleted) ? (
                <CheckCircle2 size={16} color="#FFFFFF" />
              ) : (
                <Gavel size={14} color="#FFFFFF" />
              )}
            </View>
            <View style={styles.timelineBody}>
              <Text style={
                (isAccepted || isOnTheWay || isInProgress || isWaitingPayment || isCompleted)
                  ? styles.timelineTitleDone
                  : styles.timelineTitleActive
              }>
                {isOpenOrAuction ? '1. Escolha do Prestador (Leilão ativo)' : '1. Chamado Aceito'}
              </Text>
              <Text style={styles.timelineDesc}>
                {isOpenOrAuction 
                  ? 'Aguardando e analisando lances de prestadores no leilão.'
                  : `Proposta fechada por ${formattedPrice}.`}
              </Text>
            </View>
          </View>

          <View style={[
            styles.timelineConnector, 
            (isOnTheWay || isInProgress || isWaitingPayment || isCompleted) && styles.timelineConnectorDone
          ]} />

          {/* Etapa 2: Profissional a Caminho */}
          <View style={styles.timelineItem}>
            <View style={[
              styles.timelineDot,
              (isInProgress || isWaitingPayment || isCompleted)
                ? styles.timelineDotDone
                : isOnTheWay
                ? styles.timelineDotActive
                : isAccepted
                ? styles.timelineDotActive
                : styles.timelineDotPending
            ]}>
              {(isInProgress || isWaitingPayment || isCompleted) ? (
                <CheckCircle2 size={16} color="#FFFFFF" />
              ) : (
                <Navigation size={14} color="#FFFFFF" />
              )}
            </View>
            <View style={styles.timelineBody}>
              <Text style={
                (isInProgress || isWaitingPayment || isCompleted)
                  ? styles.timelineTitleDone
                  : isOnTheWay
                  ? styles.timelineTitleActive
                  : isAccepted
                  ? styles.timelineTitleActive
                  : styles.timelineTitlePending
              }>
                {isOnTheWay
                  ? '2. Profissional a Caminho (Em trânsito)'
                  : (isInProgress || isWaitingPayment || isCompleted)
                  ? '2. Deslocamento Realizado'
                  : '2. Deslocamento do Prestador (Próximo passo)'}
              </Text>
              <Text style={styles.timelineDesc}>
                {isOnTheWay
                  ? 'O prestador está em trânsito até o seu local. Cancelamento sujeito a taxa.'
                  : (isInProgress || isWaitingPayment || isCompleted)
                  ? 'Chegada do profissional ao seu endereço confirmada.'
                  : isAccepted
                  ? 'Aguardando o prestador iniciar o deslocamento. Cancelamento gratuito disponível.'
                  : 'Deslocamento do profissional até o endereço.'}
              </Text>
            </View>
          </View>

          <View style={[
            styles.timelineConnector, 
            (isInProgress || isWaitingPayment || isCompleted) && styles.timelineConnectorDone
          ]} />

          {/* Etapa 3: Execução do Serviço */}
          <View style={styles.timelineItem}>
            <View style={[
              styles.timelineDot,
              (isWaitingPayment || isCompleted)
                ? styles.timelineDotDone
                : isInProgress
                ? styles.timelineDotActive
                : styles.timelineDotPending
            ]}>
              {(isWaitingPayment || isCompleted) ? (
                <CheckCircle2 size={16} color="#FFFFFF" />
              ) : isInProgress ? (
                <Wrench size={14} color="#FFFFFF" />
              ) : null}
            </View>
            <View style={styles.timelineBody}>
              <Text style={
                (isWaitingPayment || isCompleted)
                  ? styles.timelineTitleDone
                  : isInProgress
                  ? styles.timelineTitleActive
                  : styles.timelineTitlePending
              }>
                {isInProgress
                  ? '3. Execução do Serviço (Em andamento)'
                  : (isWaitingPayment || isCompleted)
                  ? '3. Execução Concluída'
                  : '3. Execução do Serviço'}
              </Text>
              <Text style={styles.timelineDesc}>
                {isInProgress
                  ? 'O profissional está realizando o trabalho no endereço. Cancelamento indisponível.'
                  : (isWaitingPayment || isCompleted)
                  ? 'Serviço finalizado com sucesso no local.'
                  : 'Realização do trabalho no seu endereço.'}
              </Text>
            </View>
          </View>

          <View style={[
            styles.timelineConnector, 
            (isCompleted) && styles.timelineConnectorDone
          ]} />

          {/* Etapa 4: Finalização e Pagamento */}
          <View style={styles.timelineItem}>
            <View style={[
              styles.timelineDot,
              isCompleted
                ? styles.timelineDotDone
                : isWaitingPayment
                ? styles.timelineDotActive
                : styles.timelineDotPending
            ]}>
              {isCompleted ? (
                <CheckCircle2 size={16} color="#FFFFFF" />
              ) : isWaitingPayment ? (
                <Clock size={14} color="#FFFFFF" />
              ) : null}
            </View>
            <View style={styles.timelineBody}>
              <Text style={
                isCompleted
                  ? styles.timelineTitleDone
                  : isWaitingPayment
                  ? styles.timelineTitleActive
                  : styles.timelineTitlePending
              }>
                {isCompleted
                  ? '4. Finalizado e Avaliado'
                  : isWaitingPayment
                  ? '4. Aguardando Pagamento (Próximo passo)'
                  : '4. Finalização e Pagamento'}
              </Text>
              <Text style={styles.timelineDesc}>
                {isCompleted
                  ? 'Serviço concluído, pago e avaliado com sucesso.'
                  : isWaitingPayment
                  ? 'Serviço finalizado pelo prestador. Efetue o pagamento para concluir.'
                  : 'Liberação do pagamento acordado e avaliação.'}
              </Text>
            </View>
          </View>
        </View>

        {/* Ações Especiais de Conclusão / Avaliação */}
        {isWaitingPayment && (
          <TouchableOpacity
            style={[styles.primaryActionBtn, { backgroundColor: '#16A34A', marginBottom: 8 }]}
            onPress={() => router.push(`/client/payment/${id}` as any)}
            activeOpacity={0.85}
          >
            <CheckCircle2 size={20} color="#FFFFFF" />
            <Text style={styles.primaryActionText}>Efetuar Pagamento do Chamado</Text>
          </TouchableOpacity>
        )}

        {isCompleted && (
          serviceReview ? (
            <View style={[styles.card, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontWeight: '700', color: '#166534', fontSize: 15 }}>
                  Sua Avaliação do Atendimento
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Star size={16} color="#F59E0B" fill="#F59E0B" />
                  <Text style={{ fontWeight: '800', color: '#B45309', fontSize: 15 }}>{serviceReview.rating}.0</Text>
                </View>
              </View>
              {(() => {
                const c = (serviceReview.comment || '').trim();
                const cleanComment = c.replace(/^\[(.*?)\]\s*/, '').replace(/^["'“”«»]+|["'“”«»]+$/g, '').trim();
                const isRealComment = cleanComment.length > 0 && 
                  cleanComment !== 'Serviço avaliado pelo cliente.' && 
                  cleanComment !== 'Nenhum comentário deixado.' &&
                  cleanComment.toLowerCase() !== 'sem comentário' &&
                  cleanComment.toLowerCase() !== 'sem comentario';
                return isRealComment ? (
                  <Text style={{ color: '#15803D', fontSize: 13, marginBottom: 12, lineHeight: 18 }}>
                    "{cleanComment}"
                  </Text>
                ) : null;
              })()}
              <TouchableOpacity
                style={styles.btnSecondary}
                onPress={() => router.push(`/client/rating/${id}` as any)}
              >
                <Text style={styles.btnSecondaryText}>Editar Avaliação</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: '#F59E0B', marginBottom: 8 }]}
              onPress={() => router.push(`/client/rating/${id}` as any)}
              activeOpacity={0.85}
            >
              <Star size={20} color="#FFFFFF" fill="#FFFFFF" />
              <Text style={styles.primaryActionText}>Avaliar Profissional</Text>
            </TouchableOpacity>
          )
        )}

        {/* Opção de Cancelamento */}
        {(isOpenOrAuction || isAccepted || isOnTheWay) && (
          <TouchableOpacity
            style={[styles.cancelBtn, cancelling && styles.btnDisabled]}
            onPress={handleCancelService}
            disabled={cancelling}
            activeOpacity={0.8}
          >
            {cancelling ? (
              <ActivityIndicator size="small" color="#DC2626" />
            ) : (
              <Text style={styles.cancelBtnText}>Cancelar Chamado</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Modal de Contra-proposta */}
      <Modal
        visible={counterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCounterModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
                Fazer Contra-proposta
              </Text>
              <TouchableOpacity onPress={() => setCounterModalVisible(false)}>
                <XIcon size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 12 }}>
              Valor original proposto por <Text style={{ fontWeight: '600' }}>{selectedProposal?.providerName}</Text>: <Text style={{ color: isDark ? '#34D399' : '#16A34A', fontWeight: '700' }}>R$ {selectedProposal?.proposedPrice?.toFixed(2).replace('.', ',')}</Text>
            </Text>

            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 4 }}>
              Seu novo valor proposto (R$) *
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: 180,00"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={counterPriceInput}
              onChangeText={setCounterPriceInput}
            />

            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginTop: 12, marginBottom: 4 }}>
              Mensagem / Justificativa (opcional)
            </Text>
            <TextInput
              style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Ex: Podemos fechar por esse valor se o serviço for amanhã cedo?"
              placeholderTextColor="#94A3B8"
              multiline
              value={counterDescInput}
              onChangeText={setCounterDescInput}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#F1F5F9' }]}
                onPress={() => setCounterModalVisible(false)}
                disabled={submittingCounter}
              >
                <Text style={{ color: '#475569', fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#2563EB', flex: 1 }]}
                onPress={handleSendCounterProposal}
                disabled={submittingCounter}
              >
                {submittingCounter ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={{ color: '#FFF', fontWeight: '600', textAlign: 'center' }}>Enviar Contra-proposta</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal do QR Code de Check-in (Branch 5) */}
      <Modal
        visible={showQrModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQrModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.qrModalCard}>
            <View style={styles.qrModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={22} color="#2563EB" />
                <Text style={styles.qrModalTitle}>Check-in de Segurança</Text>
              </View>
              <TouchableOpacity onPress={() => setShowQrModal(false)} style={styles.closeBtn}>
                <XIcon size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.qrModalDesc}>
              Apresente este código ou QR Code para o profissional no local para destravar o início do atendimento:
            </Text>

            <View style={styles.qrVisualContainer}>
              <View style={styles.qrDisplayBox}>
                <QrCode size={140} color="#0F172A" />
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                {(() => {
                  const rawCode = service.startCheckInCode || '7492';
                  const digits = rawCode.padEnd(4, '-').slice(0, 4).split('');
                  return digits.map((digit, idx) => (
                    <View key={idx} style={styles.qrOtpDigitBox}>
                      <Text style={styles.qrOtpDigitText}>{digit}</Text>
                    </View>
                  ));
                })()}
              </View>
            </View>

            <TouchableOpacity
              style={styles.qrCloseActionButton}
              onPress={() => setShowQrModal(false)}
            >
              <Text style={styles.qrCloseActionButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Zoom da Foto de Vistoria (Branch 5) */}
      <Modal
        visible={!!previewPhotoUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewPhotoUrl(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.previewModalCard}>
            <View style={styles.qrModalHeader}>
              <Text style={styles.qrModalTitle}>Vistoria Fotográfica</Text>
              <TouchableOpacity onPress={() => setPreviewPhotoUrl(null)} style={styles.closeBtn}>
                <XIcon size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            {previewPhotoUrl && (
              <Image
                source={{ uri: resolveImageUrl(previewPhotoUrl) || previewPhotoUrl }}
                style={styles.previewModalImg}
                resizeMode="contain"
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 24,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    color: colors.textSecondary,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 12,
  },
  errorSub: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
    marginBottom: 20,
  },
  badgeSuccess: {
    backgroundColor: isDark ? 'rgba(22, 163, 74, 0.2)' : 'rgba(22, 163, 74, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(22, 163, 74, 0.4)' : 'rgba(22, 163, 74, 0.25)',
  },
  badgeSuccessText: {
    color: isDark ? '#4ADE80' : '#15803D',
    fontWeight: '700',
    fontSize: 12,
  },
  badgePrimary: {
    backgroundColor: isDark ? 'rgba(37, 99, 235, 0.2)' : 'rgba(37, 99, 235, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(37, 99, 235, 0.4)' : 'rgba(37, 99, 235, 0.25)',
  },
  badgePrimaryText: {
    color: isDark ? '#93C5FD' : '#1D4ED8',
    fontWeight: '700',
    fontSize: 12,
  },
  badgeWarning: {
    backgroundColor: isDark ? 'rgba(217, 119, 6, 0.2)' : 'rgba(217, 119, 6, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(217, 119, 6, 0.4)' : 'rgba(217, 119, 6, 0.25)',
  },
  badgeWarningText: {
    color: isDark ? '#FCD34D' : '#B45309',
    fontWeight: '700',
    fontSize: 12,
  },
  badgeDanger: {
    backgroundColor: isDark ? 'rgba(220, 38, 38, 0.2)' : 'rgba(220, 38, 38, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(220, 38, 38, 0.4)' : 'rgba(220, 38, 38, 0.25)',
  },
  badgeDangerText: {
    color: isDark ? '#FCA5A5' : '#B91C1C',
    fontWeight: '700',
    fontSize: 12,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
    gap: 16,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#F0FDF4',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#BBF7D0',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    marginBottom: 16,
  },
  bannerSuccess: {
    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#F0FDF4',
    borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#BBF7D0',
  },
  bannerPrimary: {
    backgroundColor: isDark ? 'rgba(37, 99, 235, 0.15)' : '#EFF6FF',
    borderColor: isDark ? 'rgba(37, 99, 235, 0.3)' : '#BFDBFE',
  },
  bannerWarning: {
    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FFFBEB',
    borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : '#FDE68A',
  },
  bannerDanger: {
    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
    borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FECACA',
  },
  statusBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  statusBannerText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0.25 : 0.04,
    shadowRadius: 3,
    elevation: 1,
    marginBottom: 16,
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
    color: colors.text,
  },
  serviceLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  priceContainer: {
    alignItems: 'flex-end',
    backgroundColor: isDark ? 'rgba(52, 211, 153, 0.14)' : '#F0FDF4',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(52, 211, 153, 0.35)' : '#BBF7D0',
  },
  priceLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: isDark ? '#A7F3D0' : '#15803D',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priceValue: {
    fontSize: 19,
    fontWeight: '800',
    color: isDark ? '#34D399' : '#166534',
    marginTop: 2,
  },
  descriptionBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  descriptionText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 19,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
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
    color: colors.textSecondary,
    fontWeight: '500',
  },
  infoMetaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
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
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  clientSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: isDark ? 'rgba(37, 99, 235, 0.15)' : '#EFF6FF',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(37, 99, 235, 0.3)' : '#BFDBFE',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  chatButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: isDark ? '#60A5FA' : '#2563EB',
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: isDark ? 'rgba(20, 184, 166, 0.15)' : '#F0FDFA',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(20, 184, 166, 0.3)' : '#99F6E4',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  profileButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: isDark ? '#5EEAD4' : '#0F766E',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addressIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: isDark ? 'rgba(37, 99, 235, 0.2)' : '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  addressValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
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
    backgroundColor: colors.secondary,
  },
  timelineDotActive: {
    backgroundColor: colors.primary,
  },
  timelineDotPending: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
  },
  timelineConnector: {
    width: 2,
    height: 20,
    backgroundColor: colors.border,
    marginLeft: 12,
    marginVertical: 2,
  },
  timelineConnectorDone: {
    backgroundColor: colors.secondary,
  },
  timelineBody: {
    flex: 1,
  },
  timelineTitleDone: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.secondary,
  },
  timelineTitleActive: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  timelineTitlePending: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  timelineDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 17,
  },
  proposalItemCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  tagBlue: {
    backgroundColor: isDark ? 'rgba(37, 99, 235, 0.15)' : '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(37, 99, 235, 0.3)' : '#DBEAFE',
  },
  tagBlueText: {
    fontSize: 11,
    color: isDark ? '#93C5FD' : '#1D4ED8',
    fontWeight: '500',
  },
  tagGreen: {
    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#DCFCE7',
  },
  tagGreenText: {
    fontSize: 11,
    color: isDark ? '#6EE7B7' : '#15803D',
    fontWeight: '500',
  },
  counterBanner: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : '#FDE68A',
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtn: {
    backgroundColor: colors.secondary,
  },
  counterBtn: {
    backgroundColor: colors.primary,
  },
  chatActionBtn: {
    backgroundColor: isDark ? 'rgba(37, 99, 235, 0.15)' : '#EFF6FF',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(37, 99, 235, 0.3)' : '#BFDBFE',
    flexDirection: 'row',
    gap: 6,
  },
  profileActionBtn: {
    backgroundColor: isDark ? 'rgba(20, 184, 166, 0.15)' : '#F0FDFA',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(20, 184, 166, 0.3)' : '#99F6E4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flex: 1,
  },
  miniProfileBadge: {
    backgroundColor: isDark ? 'rgba(37, 99, 235, 0.2)' : '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(37, 99, 235, 0.4)' : '#BFDBFE',
  },
  miniProfileBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  rejectBtn: {
    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(239, 68, 68, 0.4)' : '#FECACA',
    paddingHorizontal: 12,
    flex: 0.6,
  },
  actionBtnTextWhite: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.primary,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
    backgroundColor: isDark ? 'rgba(37, 99, 235, 0.15)' : '#EFF6FF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(37, 99, 235, 0.3)' : '#BFDBFE',
    alignItems: 'center',
  },
  btnSecondaryText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  cancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(239, 68, 68, 0.4)' : '#FECACA',
    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEF2F2',
    borderRadius: 12,
  },
  cancelBtnText: {
    color: colors.danger,
    fontWeight: '600',
    fontSize: 14,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 20,
    width: '100%',
    maxWidth: 480,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  modalInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
  },
  modalBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: isDark ? 'rgba(37, 99, 235, 0.4)' : '#93C5FD',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  securityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  securityShieldBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  securityCardSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginVertical: 12,
  },
  otpDigitBox: {
    width: 54,
    height: 60,
    borderRadius: 12,
    backgroundColor: isDark ? 'rgba(37, 99, 235, 0.2)' : '#EFF6FF',
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpDigitText: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 1,
  },
  securityActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
    marginBottom: 10,
  },
  securityBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  securityBtnSecondaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  securityBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  securityBtnPrimaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  securityDisclaimer: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 15,
  },
  securityValidatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#F0FDF4',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#BBF7D0',
  },
  securityValidatedText: {
    fontSize: 13,
    fontWeight: '600',
    color: isDark ? '#6EE7B7' : '#166534',
    flex: 1,
  },
  checklistSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: 6,
  },
  checklistSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  checklistThumb: {
    width: 88,
    height: 88,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  qrModalCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 22,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
  },
  qrModalHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  qrModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  closeBtn: {
    padding: 4,
  },
  qrModalDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  qrVisualContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
  },
  qrDisplayBox: {
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  qrOtpDigitBox: {
    width: 44,
    height: 48,
    borderRadius: 10,
    backgroundColor: isDark ? 'rgba(37, 99, 235, 0.2)' : '#EFF6FF',
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrOtpDigitText: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
  },
  qrCloseActionButton: {
    marginTop: 20,
    width: '100%',
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    alignItems: 'center',
  },
  qrCloseActionButtonText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 15,
  },
  previewModalCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    width: '100%',
    maxWidth: 520,
    maxHeight: '85%',
  },
  previewModalImg: {
    width: '100%',
    height: 380,
    borderRadius: 12,
    backgroundColor: colors.surface,
    marginTop: 10,
  },
});
