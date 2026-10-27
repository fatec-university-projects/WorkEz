import { useState, useRef, useEffect, useCallback, useMemo, ComponentRef } from 'react';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { ArrowLeft, Send, AlertCircle, User, Check, X, CornerDownRight, CheckCircle, MessageCircle } from 'lucide-react-native';
import { View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet, ActivityIndicator, Alert, Platform, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WorkEzTheme } from '../../../constants/theme';
import { useAppTheme } from '../../../contexts/ThemeContext';
import { useFetch } from '../../../hooks/useFetch';
import { useAuth } from '../../../contexts/AuthContext';
import { apiRequest, getWebSocketUrl, resolveImageUrl } from '../../../services/api';

interface ProposalInfo {
  id: string;
  serviceId: string;
  providerId: string;
  proposedPrice: number;
  status: string;
  counterPrice?: number;
  counterDescription?: string;
  serviceStatus?: string;
}

interface ChatMessage {
  id: string;
  proposalId: string;
  senderId: string;
  content: string;
  isFromProvider: boolean;
  sentAt: string;
}

export default function ProviderChat() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();
  const { id, serviceId: queryServiceId } = useLocalSearchParams<{ id: string; serviceId?: string }>();
  const { user } = useAuth();
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(true);
  const [chatError, setChatError] = useState<string | null>(null);
  const [liveProposal, setLiveProposal] = useState<ProposalInfo | null>(null);
  const [liveServiceStatus, setLiveServiceStatus] = useState<string | null>(null);
  const scrollViewRef = useRef<ComponentRef<typeof ScrollView>>(null);

  // 1. Tenta buscar diretamente a proposta (apenas quando id não é explicitamente igual ao serviceId)
  const shouldFetchDirectProposal = Boolean(id && (!queryServiceId || queryServiceId !== id));
  const {
    data: directProposal,
    error: proposalError,
    loading: loadingDirectProposal,
    refetch: refetchDirectProposal
  } = useFetch<ProposalInfo>(shouldFetchDirectProposal ? `/api/Proposals/${id}` : null);

  // 2. Se queryServiceId foi fornecido ou se a busca direta de proposta terminou sem encontrar proposta:
  const candidateServiceId =
    queryServiceId || (!loadingDirectProposal && (proposalError || !directProposal) ? (id as string) : undefined);
  const { data: serviceProposal, refetch: refetchServiceProposal } = useFetch<ProposalInfo>(
    candidateServiceId ? `/api/Proposals/chat-by-service/${candidateServiceId}` : null
  );

  const proposal = liveProposal || directProposal || serviceProposal;
  const activeProposalId = proposal?.id || (!queryServiceId || queryServiceId !== id ? (id as string) : undefined);

  // 3. Busca o status do serviço somente quando effectiveServiceId é conhecido
  const effectiveServiceId =
    queryServiceId ||
    proposal?.serviceId ||
    (proposal as any)?.ServiceId ||
    (!loadingDirectProposal && !directProposal ? candidateServiceId : undefined);
  const { data: service, refetch: refetchService } = useFetch<any>(
    effectiveServiceId ? `/api/Services/${effectiveServiceId}` : null
  );

  useFocusEffect(
    useCallback(() => {
      if (shouldFetchDirectProposal) refetchDirectProposal();
      if (candidateServiceId) refetchServiceProposal();
      if (effectiveServiceId) refetchService();
    }, [shouldFetchDirectProposal, refetchDirectProposal, candidateServiceId, refetchServiceProposal, effectiveServiceId, refetchService])
  );

  const rawProposalStatus = (liveProposal?.status || directProposal?.status || serviceProposal?.status || '').toLowerCase();
  const isRejected = rawProposalStatus === 'rejected';

  const currentStatus = (
    liveServiceStatus ||
    service?.status ||
    service?.serviceStatus ||
    proposal?.serviceStatus ||
    (proposal as any)?.ServiceStatus ||
    ''
  ).toLowerCase();
  const isCompleted = !isRejected && currentStatus === 'completed';
  const isCancelled = !isRejected && currentStatus === 'cancelled';
  const isWaitingPayment = !isRejected && (currentStatus === 'waiting-payment' || currentStatus === 'waitingpayment');
  const isInProgress = !isRejected && (currentStatus === 'in-progress' || currentStatus === 'inprogress');
  const isOnTheWay = !isRejected && (currentStatus === 'on-the-way' || currentStatus === 'ontheway');
  const isAccepted = !isCompleted && !isCancelled && !isRejected && (
    rawProposalStatus === 'accepted' ||
    ((currentStatus === 'accepted' || isInProgress || isOnTheWay || isWaitingPayment) && rawProposalStatus !== 'rejected')
  );
  const isFinished = isCompleted || isCancelled || isRejected;

  const getHeaderStatusText = () => {
    if (isRejected) return 'Proposta recusada • Chat encerrado';
    if (isCompleted) return 'Serviço concluído • Chat encerrado';
    if (isCancelled) return 'Serviço cancelado • Chat encerrado';
    if (isWaitingPayment) return 'Aguardando pagamento';
    if (isInProgress) return 'Chamado em execução';
    if (isOnTheWay) return 'A caminho do local';
    if (isAccepted) return 'Chamado aceito';
    return `Seu Lance: R$ ${proposal?.proposedPrice ? proposal.proposedPrice.toFixed(2).replace('.', ',') : '...'}`;
  };

  // 4. Carga inicial de mensagens (aguarda resolução inicial de proposta para evitar chamadas com ID trocado)
  useEffect(() => {
    if (shouldFetchDirectProposal && loadingDirectProposal) return;
    if (!activeProposalId && !effectiveServiceId) return;
    let isCurrent = true;

    const loadInitialMessages = async () => {
      try {
        let res: { data: any[] | null; error: string | null } = { data: null, error: null };

        // 1. Tenta buscar pelo serviço se temos effectiveServiceId
        if (effectiveServiceId) {
          res = await apiRequest<any[]>(`/api/Chat/services/${effectiveServiceId}`);
        }

        // 2. Se não retornou mensagens pelo serviço e temos activeProposalId, tenta por proposta
        if ((!res.data || res.data.length === 0) && activeProposalId) {
          const propRes = await apiRequest<any[]>(`/api/Chat/proposals/${activeProposalId}`);
          if (propRes.data && propRes.data.length > 0) {
            res = propRes;
          } else {
            const legacyRes = await apiRequest<any[]>(`/api/Proposals/${activeProposalId}/chat`);
            if (legacyRes.data) {
              res = legacyRes;
            } else if (!res.data) {
              res = legacyRes;
            }
          }
        }

        if (isCurrent) {
          if (res.data) {
            const mapped: ChatMessage[] = res.data.map((raw: any, index: number) => ({
              id: raw.id || raw.Id || `init_${index}_${Date.now()}`,
              proposalId: raw.proposalId || raw.ProposalId || '',
              senderId: raw.senderId || raw.SenderId || '',
              content: raw.content || raw.Content || '',
              isFromProvider: raw.isFromProvider ?? raw.IsFromProvider ?? false,
              sentAt: raw.sentAt || raw.SentAt || new Date().toISOString()
            })).filter(m => m.content && m.content.trim().length > 0);
            setMessages(mapped);
            setChatError(null);
          } else if (res.error) {
            if (service || effectiveServiceId || proposal) {
              setChatError(null);
            } else {
              setChatError(res.error);
            }
          }
        }
      } catch (err: any) {
        if (isCurrent) {
          setChatError(err?.message || 'Erro ao carregar mensagens.');
        }
      } finally {
        if (isCurrent) {
          setChatLoading(false);
        }
      }
    };

    loadInitialMessages();
    return () => {
      isCurrent = false;
    };
  }, [activeProposalId, effectiveServiceId, shouldFetchDirectProposal, loadingDirectProposal]);

  // 5. Conexão WebSocket em tempo real + Polling de redundância (desativados se o chat já foi encerrado)
  useEffect(() => {
    if ((!activeProposalId && !effectiveServiceId) || (shouldFetchDirectProposal && loadingDirectProposal) || isFinished) {
      return;
    }

    let ws: WebSocket | null = null;
    let isDestroyed = false;
    let reconnectTimeout: any = null;

    const pollInterval = setInterval(async () => {
      if (isDestroyed) return;
      try {
        let res: { data: any[] | null } = { data: null };
        if (effectiveServiceId) {
          res = await apiRequest<any[]>(`/api/Chat/services/${effectiveServiceId}`);
        }
        if ((!res.data || res.data.length === 0) && (proposal?.id || activeProposalId)) {
          const targetId = proposal?.id || activeProposalId;
          res = await apiRequest<any[]>(`/api/Chat/proposals/${targetId}`);
          if (!res.data) {
            res = await apiRequest<any[]>(`/api/Proposals/${targetId}/chat`);
          }
        }

        if (!isDestroyed && res.data && Array.isArray(res.data)) {
          const mapped: ChatMessage[] = res.data.map((raw: any, index: number) => ({
            id: raw.id || raw.Id || `poll_${index}_${raw.sentAt || raw.SentAt}`,
            proposalId: raw.proposalId || raw.ProposalId || '',
            senderId: raw.senderId || raw.SenderId || '',
            content: raw.content || raw.Content || '',
            isFromProvider: raw.isFromProvider ?? raw.IsFromProvider ?? false,
            sentAt: raw.sentAt || raw.SentAt || new Date().toISOString()
          })).filter(m => m.content && m.content.trim().length > 0);

          setMessages((prev) => {
            if (mapped.length > prev.length) {
              return mapped;
            }
            return prev;
          });
        }
      } catch {}
      if (effectiveServiceId) {
        refetchService();
      }
    }, 4000);

    const connectWs = async () => {
      if (isDestroyed) return;
      try {
        const queryParams: string[] = [];
        if (proposal?.id) queryParams.push(`proposalId=${proposal.id}`);
        else if (activeProposalId) queryParams.push(`proposalId=${activeProposalId}`);
        if (effectiveServiceId) queryParams.push(`serviceId=${effectiveServiceId}`);

        const wsUrl = await getWebSocketUrl(`/ws/chat?${queryParams.join('&')}`);
        if (isDestroyed) return;

        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('[WebSocket Provider Chat] Conectado com sucesso');
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.eventType === 'new_message' && data.payload) {
              const raw = data.payload;
              const newMsg: ChatMessage = {
                id: raw.id || raw.Id || `ws_${Date.now()}_${Math.random()}`,
                proposalId: raw.proposalId || raw.ProposalId || '',
                senderId: raw.senderId || raw.SenderId || '',
                content: raw.content || raw.Content || '',
                isFromProvider: raw.isFromProvider ?? raw.IsFromProvider ?? false,
                sentAt: raw.sentAt || raw.SentAt || new Date().toISOString()
              };
              if (!newMsg.content || !newMsg.content.trim()) return;
              setMessages((prev) => {
                if (prev.some((m) => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });
            } else if (data.eventType === 'proposal_updated' && data.payload) {
              setLiveProposal(data.payload as ProposalInfo);
            } else if ((data.eventType === 'service_status_changed' || data.eventType === 'status_changed') && data.payload?.status) {
              setLiveServiceStatus(data.payload.status);
              refetchService();
            }
          } catch (e) {
            console.log('[WebSocket Provider Chat] erro ao processar mensagem', e);
          }
        };

        ws.onclose = () => {
          if (!isDestroyed) {
            reconnectTimeout = setTimeout(connectWs, 3000);
          }
        };

        ws.onerror = (e) => {
          console.log('[WebSocket Provider Chat] erro', e);
        };
      } catch (err) {
        if (!isDestroyed) {
          reconnectTimeout = setTimeout(connectWs, 3000);
        }
      }
    };

    connectWs();

    return () => {
      isDestroyed = true;
      clearInterval(pollInterval);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        ws.close();
      }
    };
  }, [activeProposalId, effectiveServiceId, shouldFetchDirectProposal, loadingDirectProposal, isFinished]);

  useEffect(() => {
    if (messages && messages.length > 0) {
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if ((!activeProposalId && !effectiveServiceId) || !user || !messageText.trim() || sending || isFinished) return;

    const textToSend = messageText.trim();
    setMessageText('');
    setSending(true);

    try {
      let res = await apiRequest<any>(`/api/Chat/messages`, {
        method: 'POST',
        body: JSON.stringify({
          senderId: user.id,
          content: textToSend,
          isFromProvider: true,
          proposalId: proposal?.id || activeProposalId || null,
          serviceId: effectiveServiceId || null
        })
      });

      if (res.error && activeProposalId && activeProposalId !== effectiveServiceId) {
        res = await apiRequest<any>(`/api/Proposals/${activeProposalId}/chat`, {
          method: 'POST',
          body: JSON.stringify({
            senderId: user.id,
            content: textToSend,
            isFromProvider: true
          })
        });
      }

      if (res.error) {
        const lowerErr = res.error.toLowerCase();
        if (lowerErr.includes('recusada') || (res as any).code === 'PROPOSAL_REJECTED') {
          setLiveProposal((prev) =>
            prev
              ? { ...prev, status: 'Rejected' }
              : ({ id: activeProposalId || '', status: 'Rejected', proposedPrice: 0, providerId: '', serviceId: effectiveServiceId || '' } as ProposalInfo)
          );
        } else if (lowerErr.includes('finalizado') || lowerErr.includes('encerrado') || (res as any).code === 'SERVICE_FINISHED') {
          setLiveServiceStatus('completed');
        }
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert(res.error);
        } else {
          Alert.alert('Aviso', res.error);
        }
        setMessageText(textToSend);
      } else if (res.data) {
        const raw: any = res.data;
        const sentMsg: ChatMessage = {
          id: raw.id || raw.Id || `sent_${Date.now()}_${Math.random()}`,
          proposalId: raw.proposalId || raw.ProposalId || '',
          senderId: raw.senderId || raw.SenderId || '',
          content: raw.content || raw.Content || textToSend,
          isFromProvider: raw.isFromProvider ?? raw.IsFromProvider ?? true,
          sentAt: raw.sentAt || raw.SentAt || new Date().toISOString()
        };
        setMessages((prev) => {
          if (prev.some((m) => m.id === sentMsg.id)) return prev;
          return [...prev, sentMsg];
        });
      }
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível enviar a mensagem.');
      setMessageText(textToSend);
    } finally {
      setSending(false);
    }
  };

  const handleAcceptCounter = async () => {
    if (!activeProposalId || !user) return;

    const execute = async () => {
      setActionLoading(true);
      try {
        const res = await apiRequest<ProposalInfo>(`/api/Proposals/${activeProposalId}/accept-counter`, {
          method: 'POST',
          body: JSON.stringify({ providerUserId: user.id })
        });
        if (res.error) {
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.alert(`Erro: ${res.error}`);
          } else {
            Alert.alert('Erro', res.error);
          }
        } else {
          if (res.data) setLiveProposal(res.data);
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.alert('Contra-proposta aceita! O chamado agora está em "Trabalhos Aceitos".');
          } else {
            Alert.alert('Sucesso!', 'Contra-proposta aceita! O chamado agora está em "Trabalhos Aceitos".');
          }
        }
      } catch (err) {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert('Não foi possível aceitar a contra-proposta.');
        } else {
          Alert.alert('Erro', 'Não foi possível aceitar a contra-proposta.');
        }
      } finally {
        setActionLoading(false);
      }
    };

    const confirmMsg = `Deseja aceitar o valor de R$ ${proposal?.counterPrice?.toFixed(2)} proposto pelo cliente? O trabalho será confirmado.`;
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(confirmMsg)) {
        await execute();
      }
    } else {
      Alert.alert(
        'Aceitar Contra-proposta',
        confirmMsg,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Aceitar', onPress: execute }
        ]
      );
    }
  };

  const handleRejectCounter = async () => {
    if (!activeProposalId || !user) return;

    const execute = async () => {
      setActionLoading(true);
      try {
        const res = await apiRequest<ProposalInfo>(`/api/Proposals/${activeProposalId}/reject-counter`, {
          method: 'POST',
          body: JSON.stringify({ providerUserId: user.id })
        });
        if (res.error) {
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.alert(`Erro: ${res.error}`);
          } else {
            Alert.alert('Erro', res.error);
          }
        } else {
          if (res.data) setLiveProposal(res.data);
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.alert('Contra-proposta recusada. A proposta retornou ao status pendente com o seu valor original.');
          } else {
            Alert.alert('Contra-proposta recusada', 'A proposta retornou ao status pendente com o seu valor original.');
          }
        }
      } catch (err) {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert('Não foi possível recusar.');
        } else {
          Alert.alert('Erro', 'Não foi possível recusar.');
        }
      } finally {
        setActionLoading(false);
      }
    };

    const confirmMsg = 'Deseja recusar a contra-proposta do cliente?';
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(confirmMsg)) {
        await execute();
      }
    } else {
      Alert.alert(
        'Recusar Contra-proposta',
        confirmMsg,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Recusar', style: 'destructive', onPress: execute }
        ]
      );
    }
  };

  const isCountered = proposal?.status === 'CounterOffered' && !isFinished;

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else if (effectiveServiceId) {
      router.replace(`/provider/accepted/${effectiveServiceId}` as any);
    } else {
      router.replace('/provider/calls' as any);
    }
  };

  const dynamicStyles = useMemo(() => {
    return StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: colors.background,
      },
      header: {
        backgroundColor: colors.card,
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      },
      headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      },
      backButton: {
        padding: 8,
        backgroundColor: colors.surface,
        borderRadius: 10,
      },
      avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
      },
      headerInfo: {
        flex: 1,
      },
      clientName: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
      },
      statusText: {
        ...WorkEzTheme.typography.sm,
        color: colors.primary,
        fontWeight: '500',
      },
      counterBanner: {
        backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7',
        borderBottomWidth: 1,
        borderBottomColor: isDark ? 'rgba(245, 158, 11, 0.3)' : '#FDE68A',
        paddingHorizontal: 16,
        paddingVertical: 12,
      },
      bannerBtn: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
      },
      bannerBtnTextWhite: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 13,
      },
      alertBanner: {
        backgroundColor: isDark ? 'rgba(37, 99, 235, 0.15)' : '#EFF6FF',
        borderBottomWidth: 1,
        borderBottomColor: isDark ? 'rgba(37, 99, 235, 0.3)' : '#BFDBFE',
        paddingHorizontal: 16,
        paddingVertical: 10,
      },
      alertRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      },
      alertIcon: {
        marginTop: 1,
      },
      alertText: {
        flex: 1,
        ...WorkEzTheme.typography.xs,
        color: isDark ? '#93C5FD' : '#1D4ED8',
        lineHeight: 18,
      },
      messagesList: {
        flex: 1,
      },
      messagesContent: {
        padding: 20,
        gap: 14,
      },
      centerContainer: {
        padding: 48,
        alignItems: 'center',
      },
      loadingText: {
        marginTop: 16,
        color: colors.textSecondary,
      },
      errorText: {
        color: colors.danger,
        textAlign: 'center',
      },
      messageRow: {
        flexDirection: 'row',
      },
      messageRowLeft: {
        justifyContent: 'flex-start',
      },
      messageRowRight: {
        justifyContent: 'flex-end',
      },
      messageBubble: {
        maxWidth: '75%',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 10,
      },
      messageBubbleMe: {
        backgroundColor: colors.primary,
      },
      messageBubbleOther: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
      },
      messageText: {
        ...WorkEzTheme.typography.sm,
      },
      messageTextMe: {
        color: '#FFFFFF',
      },
      messageTextOther: {
        color: colors.text,
      },
      messageTime: {
        ...WorkEzTheme.typography.xs,
        marginTop: 4,
      },
      messageTimeMe: {
        color: 'rgba(255, 255, 255, 0.7)',
      },
      messageTimeOther: {
        color: colors.textSecondary,
      },
      footer: {
        backgroundColor: colors.card,
        padding: 14,
        borderTopWidth: 1,
        borderTopColor: colors.border,
      },
      inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      },
      input: {
        flex: 1,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 10,
        ...WorkEzTheme.typography.base,
        color: colors.text,
      },
      sendButton: {
        width: 46,
        height: 46,
        backgroundColor: colors.primary,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
      },
      sendButtonDisabled: {
        opacity: 0.4,
      },
    });
  }, [colors, isDark]);

  return (
    <View style={dynamicStyles.container}>
      {/* Header */}
      <View style={[dynamicStyles.header, { paddingTop: insets.top > 0 ? insets.top + 8 : 14 }]}>
        <View style={dynamicStyles.headerRow}>
          <TouchableOpacity
            onPress={handleBack}
            style={dynamicStyles.backButton}
            activeOpacity={0.8}
          >
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          {service?.clientPhoto ? (
            <Image
              source={{ uri: resolveImageUrl(service.clientPhoto) || service.clientPhoto }}
              style={dynamicStyles.avatar}
              resizeMode="cover"
            />
          ) : (
            <View style={[dynamicStyles.avatar, { backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }]}>
              <User size={20} color={colors.textSecondary} />
            </View>
          )}
          <View style={dynamicStyles.headerInfo}>
            <Text style={dynamicStyles.clientName}>{service?.clientName || 'Cliente (Solicitante)'}</Text>
            <Text style={[
              dynamicStyles.statusText,
              isRejected && { color: colors.danger, fontWeight: '600' },
              isCompleted && { color: colors.secondary, fontWeight: '600' },
              isCancelled && { color: colors.danger, fontWeight: '600' },
              isInProgress && { color: colors.primary, fontWeight: '600' },
            ]}>
              {getHeaderStatusText()}
            </Text>
          </View>
        </View>
      </View>

      {/* Contra-proposta Banner no Chat */}
      {isCountered && !isRejected && (
        <View style={dynamicStyles.counterBanner}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <CornerDownRight size={18} color={isDark ? '#FCD34D' : '#D97706'} />
            <Text style={{ color: isDark ? '#FCD34D' : '#B45309', fontWeight: '700', fontSize: 14 }}>
              O cliente enviou uma contra-proposta: R$ {proposal.counterPrice?.toFixed(2).replace('.', ',')}
            </Text>
          </View>
          {proposal.counterDescription && (
            <Text style={{ color: isDark ? '#FDE68A' : '#92400E', fontSize: 13, marginBottom: 8 }}>
              "{proposal.counterDescription}"
            </Text>
          )}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={[dynamicStyles.bannerBtn, { backgroundColor: colors.secondary, flex: 1.2 }]}
              onPress={handleAcceptCounter}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={dynamicStyles.bannerBtnTextWhite}>Aceitar R$ {proposal.counterPrice?.toFixed(2)}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[dynamicStyles.bannerBtn, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2', borderWidth: 1, borderColor: isDark ? 'rgba(239, 68, 68, 0.4)' : '#FECACA' }]}
              onPress={handleRejectCounter}
              disabled={actionLoading}
            >
              <Text style={{ color: colors.danger, fontWeight: '600', fontSize: 13 }}>Recusar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Banner de status contextual */}
      {isRejected ? (
        <View style={[dynamicStyles.alertBanner, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEF2F2', borderBottomColor: isDark ? 'rgba(239, 68, 68, 0.4)' : '#FECACA' }]}>
          <View style={dynamicStyles.alertRow}>
            <AlertCircle size={16} color={colors.danger} style={dynamicStyles.alertIcon} />
            <Text style={[dynamicStyles.alertText, { color: isDark ? '#FCA5A5' : '#991B1B' }]}>
              <Text style={{ fontWeight: '700' }}>Proposta Recusada:</Text> Esta proposta foi recusada. A negociação está encerrada e o chat foi fechado para novas mensagens.
            </Text>
          </View>
        </View>
      ) : isCompleted ? (
        <View style={[dynamicStyles.alertBanner, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#ECFDF5', borderBottomColor: isDark ? 'rgba(16, 185, 129, 0.4)' : '#A7F3D0' }]}>
          <View style={dynamicStyles.alertRow}>
            <CheckCircle size={16} color={colors.secondary} style={dynamicStyles.alertIcon} />
            <Text style={[dynamicStyles.alertText, { color: isDark ? '#6EE7B7' : '#065F46' }]}>
              <Text style={{ fontWeight: '700' }}>Serviço Concluído:</Text> Este chamado foi finalizado com sucesso. O chat está encerrado para novas mensagens.
            </Text>
          </View>
        </View>
      ) : isCancelled ? (
        <View style={[dynamicStyles.alertBanner, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEF2F2', borderBottomColor: isDark ? 'rgba(239, 68, 68, 0.4)' : '#FECACA' }]}>
          <View style={dynamicStyles.alertRow}>
            <AlertCircle size={16} color={colors.danger} style={dynamicStyles.alertIcon} />
            <Text style={[dynamicStyles.alertText, { color: isDark ? '#FCA5A5' : '#991B1B' }]}>
              <Text style={{ fontWeight: '700' }}>Serviço Cancelado:</Text> Este chamado foi cancelado. O chat foi encerrado.
            </Text>
          </View>
        </View>
      ) : isAccepted ? (
        <View style={[dynamicStyles.alertBanner, { backgroundColor: isDark ? 'rgba(37, 99, 235, 0.15)' : '#EFF6FF', borderBottomColor: isDark ? 'rgba(37, 99, 235, 0.3)' : '#BFDBFE' }]}>
          <View style={dynamicStyles.alertRow}>
            <MessageCircle size={16} color={colors.primary} style={dynamicStyles.alertIcon} />
            <Text style={[dynamicStyles.alertText, { color: isDark ? '#93C5FD' : '#1E40AF' }]}>
              <Text style={{ fontWeight: '700' }}>Chat do Chamado:</Text> Converse diretamente com o cliente em tempo real até a conclusão do serviço.
            </Text>
          </View>
        </View>
      ) : (
        <View style={dynamicStyles.alertBanner}>
          <View style={dynamicStyles.alertRow}>
            <AlertCircle size={16} color={colors.primary} style={dynamicStyles.alertIcon} />
            <Text style={dynamicStyles.alertText}>
              <Text style={{ fontWeight: '600' }}>Negociação no Leilão:</Text> Negocie detalhes e valores diretamente com o cliente.
            </Text>
          </View>
        </View>
      )}

      {/* Mensagens */}
      <ScrollView
        ref={scrollViewRef}
        style={dynamicStyles.messagesList}
        contentContainerStyle={dynamicStyles.messagesContent}
      >
        {chatLoading && (!messages || messages.length === 0) ? (
          <View key="chat-loading" style={dynamicStyles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={dynamicStyles.loadingText}>Carregando mensagens...</Text>
          </View>
        ) : chatError ? (
          <View key="chat-error" style={dynamicStyles.centerContainer}>
            <Text style={dynamicStyles.errorText}>{chatError}</Text>
          </View>
        ) : (!messages || messages.length === 0) ? (
          <View key="chat-empty" style={dynamicStyles.centerContainer}>
            <Text style={{ color: isRejected ? colors.danger : colors.textSecondary, textAlign: 'center', fontSize: 14, fontWeight: isRejected ? '600' : '400' }}>
              {isRejected
                ? 'Esta proposta foi recusada. O chat está fechado para envio de mensagens.'
                : isCompleted || isCancelled
                ? 'Nenhuma mensagem registrada neste chamado encerrado.'
                : isAccepted
                ? 'Inicie a conversa! Envie uma mensagem para alinhar os detalhes da execução do chamado com o cliente.'
                : 'Inicie a conversa com o cliente para negociar ou confirmar detalhes.'}
            </Text>
          </View>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.isFromProvider;
            let timeFormatted = '';
            try {
              if (msg.sentAt) {
                const dateObj = new Date(msg.sentAt);
                if (!isNaN(dateObj.getTime())) {
                  timeFormatted = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                }
              }
            } catch {
              timeFormatted = '';
            }

            return (
              <View
                key={msg.id || `msg-${index}-${msg.sentAt}`}
                style={[
                  dynamicStyles.messageRow,
                  isMe ? dynamicStyles.messageRowRight : dynamicStyles.messageRowLeft
                ]}
              >
                <View
                  style={[
                    dynamicStyles.messageBubble,
                    isMe ? dynamicStyles.messageBubbleMe : dynamicStyles.messageBubbleOther
                  ]}
                >
                  <Text style={[
                    dynamicStyles.messageText,
                    isMe ? dynamicStyles.messageTextMe : dynamicStyles.messageTextOther
                  ]}>
                    {msg.content}
                  </Text>
                  {timeFormatted ? (
                    <Text style={[
                      dynamicStyles.messageTime,
                      isMe ? dynamicStyles.messageTimeMe : dynamicStyles.messageTimeOther
                    ]}>
                      {timeFormatted}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Footer / Input */}
      <View style={[dynamicStyles.footer, { paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : (Platform.OS === 'ios' ? 24 : 14) }]}>
        <View style={dynamicStyles.inputRow}>
          <TextInput
            value={messageText}
            onChangeText={setMessageText}
            placeholder={
              isRejected
                ? 'Chat fechado (proposta recusada).'
                : isCompleted
                ? 'Chat encerrado após a conclusão do serviço.'
                : isCancelled
                ? 'Chat encerrado.'
                : 'Digite sua mensagem ao cliente...'
            }
            editable={!isFinished}
            style={[dynamicStyles.input, isFinished && { backgroundColor: colors.surface, color: colors.textSecondary }]}
            placeholderTextColor={colors.textSecondary}
            onSubmitEditing={handleSendMessage}
          />
          <TouchableOpacity
            style={[dynamicStyles.sendButton, (!messageText.trim() || sending || isFinished) && dynamicStyles.sendButtonDisabled]}
            disabled={!messageText.trim() || sending || isFinished}
            onPress={handleSendMessage}
          >
            {sending ? <ActivityIndicator size="small" color="#FFF" /> : <Send size={20} color="#FFF" />}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
