import { useState, useRef, useEffect, useCallback, useMemo, ComponentRef } from 'react';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { ArrowLeft, Send, AlertCircle, User, CheckCircle, MessageCircle, ChevronRight } from 'lucide-react-native';
import { View, Text, TouchableOpacity, Image, TextInput, ScrollView, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WorkEzTheme } from '../../../constants/theme';
import { useAppTheme } from '../../../contexts/ThemeContext';
import { useFetch } from '../../../hooks/useFetch';
import { useAuth } from '../../../contexts/AuthContext';
import { apiRequest, getWebSocketUrl, resolveImageUrl } from '../../../services/api';

interface ProposalInfo {
  id: string;
  serviceId?: string;
  providerId?: string;
  providerUserId?: string;
  providerName: string;
  providerPhoto?: string;
  proposedPrice: number;
  status: string;
  counterPrice?: number;
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

export default function ClientChat() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();
  const { id, serviceId: queryServiceId } = useLocalSearchParams<{ id: string; serviceId?: string }>();
  const { user } = useAuth();
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(true);
  const [chatError, setChatError] = useState<string | null>(null);
  const [liveProposal, setLiveProposal] = useState<ProposalInfo | null>(null);
  const [liveServiceStatus, setLiveServiceStatus] = useState<string | null>(null);
  const scrollViewRef = useRef<ComponentRef<typeof ScrollView>>(null);

  // 1. Tenta buscar a proposta diretamente pelo id (apenas quando id não é explicitamente igual ao serviceId)
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

  // 3. Busca os dados do serviço somente quando effectiveServiceId é conhecido
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

  // Status do serviço e término
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
    if (isInProgress) return 'Chamado em andamento';
    if (isOnTheWay) return 'Profissional a caminho';
    if (isAccepted) return 'Chamado aceito';
    return `Lance: R$ ${proposal?.proposedPrice ? proposal.proposedPrice.toFixed(2).replace('.', ',') : '...'}${proposal?.counterPrice ? ` • Contra-oferta: R$ ${proposal.counterPrice.toFixed(2).replace('.', ',')}` : ''}`;
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

  // 5. Conexão WebSocket em tempo real + Polling de redundância (desativados quando o chat já foi finalizado)
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
          console.log('[WebSocket Client Chat] Conectado com sucesso');
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
            console.log('[WebSocket Client Chat] erro ao processar mensagem', e);
          }
        };

        ws.onclose = () => {
          if (!isDestroyed) {
            reconnectTimeout = setTimeout(connectWs, 3000);
          }
        };

        ws.onerror = (e) => {
          console.log('[WebSocket Client Chat] erro', e);
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
          isFromProvider: false,
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
            isFromProvider: false
          })
        });
      }

      if (res.error) {
        const lowerErr = res.error.toLowerCase();
        if (lowerErr.includes('recusada') || (res as any).code === 'PROPOSAL_REJECTED') {
          setLiveProposal((prev) =>
            prev
              ? { ...prev, status: 'Rejected' }
              : ({ id: activeProposalId || '', status: 'Rejected', proposedPrice: 0, providerId: '', providerName: '', serviceId: effectiveServiceId || '' } as ProposalInfo)
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
          isFromProvider: raw.isFromProvider ?? raw.IsFromProvider ?? false,
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

  const targetProviderId =
    proposal?.providerId ||
    (proposal as any)?.ProviderId ||
    service?.professional?.id ||
    service?.providerUserId ||
    (service as any)?.providerUserId ||
    (service?.professional as any)?.userId;

  const handleOpenProviderProfile = () => {
    if (targetProviderId) {
      router.push({
        pathname: '/client/professional/[id]',
        params: { id: targetProviderId, serviceId: effectiveServiceId }
      } as any);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else if (effectiveServiceId) {
      router.replace(`/client/tracking/${effectiveServiceId}` as any);
    } else {
      router.replace('/client/services' as any);
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
        paddingHorizontal: WorkEzTheme.spacing.lg,
        paddingVertical: WorkEzTheme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      },
      headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      },
      backButton: {
        padding: WorkEzTheme.spacing.sm,
        backgroundColor: colors.surface,
        borderRadius: WorkEzTheme.borderRadius.lg,
      },
      headerProfileClickable: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      },
      avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
      },
      avatarImg: {
        width: 40,
        height: 40,
        borderRadius: 20,
      },
      headerInfo: {
        flex: 1,
      },
      professionalName: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
      },
      viewProfilePill: {
        backgroundColor: isDark ? 'rgba(37, 99, 235, 0.2)' : '#EFF6FF',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(37, 99, 235, 0.4)' : '#BFDBFE',
      },
      viewProfilePillText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.primary,
      },
      statusText: {
        ...WorkEzTheme.typography.sm,
        color: isDark ? '#5EEAD4' : '#0F766E',
        fontWeight: '600',
      },
      alertBanner: {
        backgroundColor: isDark ? 'rgba(37, 99, 235, 0.15)' : '#EFF6FF',
        borderBottomWidth: 1,
        borderTopWidth: 1,
        borderColor: isDark ? 'rgba(37, 99, 235, 0.3)' : '#BFDBFE',
        paddingHorizontal: 16,
        paddingVertical: 12,
      },
      alertRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
      },
      alertIcon: {
        marginTop: 2,
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
        padding: 24,
        gap: 16,
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
        paddingVertical: 12,
      },
      messageBubbleClient: {
        backgroundColor: colors.primary,
      },
      messageBubblePro: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
      },
      messageText: {
        ...WorkEzTheme.typography.sm,
      },
      messageTextClient: {
        color: '#FFFFFF',
      },
      messageTextPro: {
        color: colors.text,
      },
      messageTime: {
        ...WorkEzTheme.typography.xs,
        marginTop: 4,
      },
      messageTimeClient: {
        color: 'rgba(255, 255, 255, 0.7)',
      },
      messageTimePro: {
        color: colors.textSecondary,
      },
      footer: {
        backgroundColor: colors.card,
        padding: 16,
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
        paddingVertical: 12,
        ...WorkEzTheme.typography.base,
        color: colors.text,
      },
      sendButton: {
        width: 48,
        height: 48,
        backgroundColor: colors.primary,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
      },
      sendButtonDisabled: {
        opacity: 0.5,
      },
    });
  }, [colors, isDark]);

  return (
    <View style={dynamicStyles.container}>
      <View style={[dynamicStyles.header, { paddingTop: insets.top > 0 ? insets.top + 8 : 14 }]}>
        <View style={dynamicStyles.headerRow}>
          <TouchableOpacity
            onPress={handleBack}
            style={dynamicStyles.backButton}
            activeOpacity={0.8}
          >
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={dynamicStyles.headerProfileClickable}
            onPress={handleOpenProviderProfile}
            activeOpacity={0.7}
            disabled={!targetProviderId}
          >
            {(() => {
              const photo = service?.professional?.photo || proposal?.providerPhoto;
              const resolved = resolveImageUrl(photo) || photo;
              return resolved ? (
                <Image source={{ uri: resolved }} style={dynamicStyles.avatarImg} resizeMode="cover" />
              ) : (
                <View style={[dynamicStyles.avatar, { backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }]}>
                  <User size={20} color={colors.textSecondary} />
                </View>
              );
            })()}
            <View style={dynamicStyles.headerInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={dynamicStyles.professionalName} numberOfLines={1}>
                  {proposal?.providerName || service?.professional?.name || 'Prestador de Serviço'}
                </Text>
                {targetProviderId ? (
                  <View style={dynamicStyles.viewProfilePill}>
                    <Text style={dynamicStyles.viewProfilePillText}>Ver perfil ›</Text>
                  </View>
                ) : null}
              </View>
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
            {targetProviderId ? (
              <ChevronRight size={18} color={colors.textSecondary} />
            ) : null}
          </TouchableOpacity>
        </View>
      </View>

      {/* Banner de status contextual */}
      {isRejected ? (
        <View style={[dynamicStyles.alertBanner, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEF2F2', borderColor: isDark ? 'rgba(239, 68, 68, 0.4)' : '#FECACA' }]}>
          <View style={dynamicStyles.alertRow}>
            <AlertCircle size={16} color={colors.danger} style={dynamicStyles.alertIcon} />
            <Text style={[dynamicStyles.alertText, { color: isDark ? '#FCA5A5' : '#991B1B' }]}>
              <Text style={{ fontWeight: '700' }}>Proposta Recusada:</Text> Esta proposta foi recusada. A negociação está encerrada e o chat foi fechado para novas mensagens.
            </Text>
          </View>
        </View>
      ) : isCompleted ? (
        <View style={[dynamicStyles.alertBanner, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#ECFDF5', borderColor: isDark ? 'rgba(16, 185, 129, 0.4)' : '#A7F3D0' }]}>
          <View style={dynamicStyles.alertRow}>
            <CheckCircle size={16} color={colors.secondary} style={dynamicStyles.alertIcon} />
            <Text style={[dynamicStyles.alertText, { color: isDark ? '#6EE7B7' : '#065F46' }]}>
              <Text style={{ fontWeight: '700' }}>Serviço Concluído:</Text> Este chamado foi finalizado com sucesso. O chat está encerrado para novas mensagens.
            </Text>
          </View>
        </View>
      ) : isCancelled ? (
        <View style={[dynamicStyles.alertBanner, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEF2F2', borderColor: isDark ? 'rgba(239, 68, 68, 0.4)' : '#FECACA' }]}>
          <View style={dynamicStyles.alertRow}>
            <AlertCircle size={16} color={colors.danger} style={dynamicStyles.alertIcon} />
            <Text style={[dynamicStyles.alertText, { color: isDark ? '#FCA5A5' : '#991B1B' }]}>
              <Text style={{ fontWeight: '700' }}>Serviço Cancelado:</Text> Este chamado foi cancelado. O chat foi encerrado.
            </Text>
          </View>
        </View>
      ) : isAccepted ? (
        <View style={[dynamicStyles.alertBanner, { backgroundColor: isDark ? 'rgba(37, 99, 235, 0.15)' : '#EFF6FF', borderColor: isDark ? 'rgba(37, 99, 235, 0.3)' : '#BFDBFE' }]}>
          <View style={dynamicStyles.alertRow}>
            <MessageCircle size={16} color={colors.primary} style={dynamicStyles.alertIcon} />
            <Text style={[dynamicStyles.alertText, { color: isDark ? '#93C5FD' : '#1E40AF' }]}>
              <Text style={{ fontWeight: '700' }}>Chat do Chamado:</Text> Converse diretamente com o prestador em tempo real até a conclusão do trabalho.
            </Text>
          </View>
        </View>
      ) : (
        <View style={dynamicStyles.alertBanner}>
          <View style={dynamicStyles.alertRow}>
            <AlertCircle size={16} color={colors.primary} style={dynamicStyles.alertIcon} />
            <Text style={dynamicStyles.alertText}>
              <Text style={{ fontWeight: '600' }}>Chat de Negociação / Leilão:</Text> Converse diretamente com o prestador para ajustar valores ou tirar dúvidas.
            </Text>
          </View>
        </View>
      )}

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
                ? 'Inicie a conversa! Envie uma mensagem para alinhar os detalhes da execução do chamado com o prestador.'
                : 'Inicie a conversa! Envie uma mensagem para negociar o valor com o prestador.'}
            </Text>
          </View>
        ) : (
          messages.map((msg, index) => {
            const isClient = !msg.isFromProvider;
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
                  isClient ? dynamicStyles.messageRowRight : dynamicStyles.messageRowLeft
                ]}
              >
                <View
                  style={[
                    dynamicStyles.messageBubble,
                    isClient ? dynamicStyles.messageBubbleClient : dynamicStyles.messageBubblePro
                  ]}
                >
                  <Text style={[
                    dynamicStyles.messageText,
                    isClient ? dynamicStyles.messageTextClient : dynamicStyles.messageTextPro
                  ]}>
                    {msg.content}
                  </Text>
                  {timeFormatted ? (
                    <Text style={[
                      dynamicStyles.messageTime,
                      isClient ? dynamicStyles.messageTimeClient : dynamicStyles.messageTimePro
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
                : 'Digite sua mensagem...'
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
