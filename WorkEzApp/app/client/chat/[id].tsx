import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { ArrowLeft, Send, AlertCircle, User, CheckCircle, MessageCircle, ChevronRight } from 'lucide-react-native';
import { View, Text, TouchableOpacity, Image, TextInput, ScrollView, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WorkEzTheme } from '../../../constants/theme';
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
  const { id, serviceId: queryServiceId } = useLocalSearchParams<{ id: string; serviceId?: string }>();
  const { user } = useAuth();
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(true);
  const [chatError, setChatError] = useState<string | null>(null);
  const [liveProposal, setLiveProposal] = useState<ProposalInfo | null>(null);
  const [liveServiceStatus, setLiveServiceStatus] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // 1. Tenta buscar a proposta diretamente pelo id
  const { data: directProposal, error: proposalError, refetch: refetchDirectProposal } = useFetch<ProposalInfo>(
    id ? `/api/Proposals/${id}` : null
  );

  // 2. Se id for serviceId ou se queryServiceId foi fornecido, busca a proposta ativa do serviço
  const candidateServiceId = queryServiceId || (proposalError || !directProposal ? (id as string) : undefined);
  const { data: serviceProposal, refetch: refetchServiceProposal } = useFetch<ProposalInfo>(
    candidateServiceId ? `/api/Proposals/chat-by-service/${candidateServiceId}` : null
  );

  const proposal = liveProposal || directProposal || serviceProposal;
  const activeProposalId = proposal?.id || (id as string);

  // 3. Busca os dados do serviço para acompanhar o ciclo de vida
  const effectiveServiceId = queryServiceId || proposal?.serviceId || (proposal as any)?.ServiceId;
  const { data: service, refetch: refetchService } = useFetch<any>(
    effectiveServiceId ? `/api/Services/${effectiveServiceId}` : null
  );

  useFocusEffect(
    useCallback(() => {
      refetchDirectProposal();
      if (candidateServiceId) refetchServiceProposal();
      if (effectiveServiceId) refetchService();
    }, [refetchDirectProposal, candidateServiceId, refetchServiceProposal, effectiveServiceId, refetchService])
  );

  const rawProposalStatus = (liveProposal?.status || directProposal?.status || serviceProposal?.status || '').toLowerCase();
  const isRejected = rawProposalStatus === 'rejected';

  // Status do serviço e término
  const currentStatus = (liveServiceStatus || service?.status || service?.serviceStatus || '').toLowerCase();
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
    if (isCompleted) return 'Serviço concluído';
    if (isCancelled) return 'Serviço cancelado';
    if (isWaitingPayment) return 'Aguardando pagamento';
    if (isInProgress) return 'Chamado em andamento';
    if (isOnTheWay) return 'Profissional a caminho';
    if (isAccepted) return 'Chamado aceito';
    return `Lance: R$ ${proposal?.proposedPrice ? proposal.proposedPrice.toFixed(2).replace('.', ',') : '...'}${proposal?.counterPrice ? ` • Contra-oferta: R$ ${proposal.counterPrice.toFixed(2).replace('.', ',')}` : ''}`;
  };

  // 4. Carga inicial de mensagens (sem loop de polling)
  useEffect(() => {
    if (!activeProposalId) return;
    let isCurrent = true;

    const loadInitialMessages = async () => {
      try {
        const res = await apiRequest<any[]>(`/api/Proposals/${activeProposalId}/chat`);
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
          }
          if (res.error) {
            setChatError(res.error);
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
  }, [activeProposalId]);

  // 5. Conexão WebSocket em tempo real para mensagens e status de propostas
  useEffect(() => {
    if (!activeProposalId) return;

    let ws: WebSocket | null = null;
    let isDestroyed = false;
    let reconnectTimeout: any = null;

    const connectWs = async () => {
      if (isDestroyed) return;
      try {
        const wsUrl = await getWebSocketUrl(`/ws/chat?proposalId=${activeProposalId}${effectiveServiceId ? `&serviceId=${effectiveServiceId}` : ''}`);
        if (isDestroyed) return;

        ws = new WebSocket(wsUrl);

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
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        ws.close();
      }
    };
  }, [activeProposalId, effectiveServiceId]);

  useEffect(() => {
    if (messages && messages.length > 0) {
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!activeProposalId || !user || !messageText.trim() || sending || isFinished) return;

    const textToSend = messageText.trim();
    setMessageText('');
    setSending(true);

    try {
      const res = await apiRequest<ChatMessage>(`/api/Proposals/${activeProposalId}/chat`, {
        method: 'POST',
        body: JSON.stringify({
          senderId: user.id,
          content: textToSend,
          isFromProvider: false
        })
      });

      if (res.error) {
        if (res.error.toLowerCase().includes('recusada') || (res as any).code === 'PROPOSAL_REJECTED') {
          setLiveProposal((prev) =>
            prev
              ? { ...prev, status: 'Rejected' }
              : ({ id: activeProposalId, status: 'Rejected', proposedPrice: 0, providerId: '', serviceId: '' } as ProposalInfo)
          );
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

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top > 0 ? insets.top + 8 : 14 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            activeOpacity={0.8}
          >
            <ArrowLeft size={24} color={WorkEzTheme.colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerProfileClickable}
            onPress={handleOpenProviderProfile}
            activeOpacity={0.7}
            disabled={!targetProviderId}
          >
            {(() => {
              const photo = service?.professional?.photo || proposal?.providerPhoto;
              const resolved = resolveImageUrl(photo) || photo;
              return resolved ? (
                <Image source={{ uri: resolved }} style={styles.avatarImg} resizeMode="cover" />
              ) : (
                <View style={[styles.avatar, { backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' }]}>
                  <User size={20} color={WorkEzTheme.colors.textSecondary} />
                </View>
              );
            })()}
            <View style={styles.headerInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.professionalName} numberOfLines={1}>
                  {proposal?.providerName || service?.professional?.name || 'Prestador de Serviço'}
                </Text>
                {targetProviderId ? (
                  <View style={styles.viewProfilePill}>
                    <Text style={styles.viewProfilePillText}>Ver perfil ›</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[
                styles.statusText,
                isRejected && { color: '#DC2626', fontWeight: '600' },
                isCompleted && { color: '#059669', fontWeight: '600' },
                isCancelled && { color: '#DC2626', fontWeight: '600' },
                isInProgress && { color: '#2563EB', fontWeight: '600' },
              ]}>
                {getHeaderStatusText()}
              </Text>
            </View>
            {targetProviderId ? (
              <ChevronRight size={18} color="#94A3B8" />
            ) : null}
          </TouchableOpacity>
        </View>
      </View>

      {/* Banner de status contextual */}
      {isRejected ? (
        <View style={[styles.alertBanner, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
          <View style={styles.alertRow}>
            <AlertCircle size={16} color="#DC2626" style={styles.alertIcon} />
            <Text style={[styles.alertText, { color: '#991B1B' }]}>
              <Text style={{ fontWeight: '700' }}>Proposta Recusada:</Text> Esta proposta foi recusada. A negociação está encerrada e o chat foi fechado para novas mensagens.
            </Text>
          </View>
        </View>
      ) : isCompleted ? (
        <View style={[styles.alertBanner, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
          <View style={styles.alertRow}>
            <CheckCircle size={16} color="#059669" style={styles.alertIcon} />
            <Text style={[styles.alertText, { color: '#065F46' }]}>
              <Text style={{ fontWeight: '700' }}>Serviço Concluído:</Text> Este chamado foi finalizado com sucesso. O chat está encerrado para novas mensagens.
            </Text>
          </View>
        </View>
      ) : isCancelled ? (
        <View style={[styles.alertBanner, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
          <View style={styles.alertRow}>
            <AlertCircle size={16} color="#DC2626" style={styles.alertIcon} />
            <Text style={[styles.alertText, { color: '#991B1B' }]}>
              <Text style={{ fontWeight: '700' }}>Serviço Cancelado:</Text> Este chamado foi cancelado. O chat foi encerrado.
            </Text>
          </View>
        </View>
      ) : isAccepted ? (
        <View style={[styles.alertBanner, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
          <View style={styles.alertRow}>
            <MessageCircle size={16} color="#2563EB" style={styles.alertIcon} />
            <Text style={[styles.alertText, { color: '#1E40AF' }]}>
              <Text style={{ fontWeight: '700' }}>Chat do Chamado:</Text> Converse diretamente com o prestador em tempo real até a conclusão do trabalho.
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.alertBanner}>
          <View style={styles.alertRow}>
            <AlertCircle size={16} color="#2563EB" style={styles.alertIcon} />
            <Text style={styles.alertText}>
              <Text style={{ fontWeight: '600' }}>Chat de Negociação / Leilão:</Text> Converse diretamente com o prestador para ajustar valores ou tirar dúvidas.
            </Text>
          </View>
        </View>
      )}

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
      >
        {chatLoading && (!messages || messages.length === 0) ? (
          <View key="chat-loading" style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#0F766E" />
            <Text style={styles.loadingText}>Carregando mensagens...</Text>
          </View>
        ) : chatError ? (
          <View key="chat-error" style={styles.centerContainer}>
            <Text style={styles.errorText}>{chatError}</Text>
          </View>
        ) : (!messages || messages.length === 0) ? (
          <View key="chat-empty" style={styles.centerContainer}>
            <Text style={{ color: isRejected ? '#991B1B' : '#94A3B8', textAlign: 'center', fontSize: 14, fontWeight: isRejected ? '600' : '400' }}>
              {isRejected
                ? 'Esta proposta foi recusada. O chat está fechado para envio de mensagens.'
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
                  styles.messageRow,
                  isClient ? styles.messageRowRight : styles.messageRowLeft
                ]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    isClient ? styles.messageBubbleClient : styles.messageBubblePro
                  ]}
                >
                  <Text style={[
                    styles.messageText,
                    isClient ? styles.messageTextClient : styles.messageTextPro
                  ]}>
                    {msg.content}
                  </Text>
                  {timeFormatted ? (
                    <Text style={[
                      styles.messageTime,
                      isClient ? styles.messageTimeClient : styles.messageTimePro
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

      <View style={[styles.footer, { paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : (Platform.OS === 'ios' ? 24 : 14) }]}>
        <View style={styles.inputRow}>
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
            style={[styles.input, isFinished && { backgroundColor: '#F1F5F9', color: '#94A3B8' }]}
            placeholderTextColor="#94A3B8"
            onSubmitEditing={handleSendMessage}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!messageText.trim() || sending || isFinished) && styles.sendButtonDisabled]}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WorkEzTheme.colors.backgroundAlt,
  },
  header: {
    backgroundColor: WorkEzTheme.colors.backgroundCard,
    paddingHorizontal: WorkEzTheme.spacing.lg,
    paddingVertical: WorkEzTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: WorkEzTheme.colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: WorkEzTheme.spacing.sm,
    backgroundColor: WorkEzTheme.colors.backgroundAlt,
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
    resizeMode: 'cover',
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
    color: WorkEzTheme.colors.text,
  },
  viewProfilePill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  viewProfilePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563EB',
  },
  statusText: {
    ...WorkEzTheme.typography.sm,
    color: '#0F766E', // Verde/teal escuro com contraste excelente sobre fundo branco
    fontWeight: '600',
  },
  alertBanner: {
    backgroundColor: '#EFF6FF',
    borderBottomWidth: 1,
    borderTopWidth: 1,
    borderColor: '#BFDBFE',
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
    color: '#1D4ED8',
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
    color: WorkEzTheme.colors.textSecondary,
  },
  errorText: {
    color: WorkEzTheme.colors.danger,
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
    backgroundColor: '#2563EB',
  },
  messageBubblePro: {
    backgroundColor: WorkEzTheme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: WorkEzTheme.colors.border,
  },
  messageText: {
    ...WorkEzTheme.typography.sm,
  },
  messageTextClient: {
    color: '#FFFFFF',
  },
  messageTextPro: {
    color: WorkEzTheme.colors.text,
  },
  messageTime: {
    ...WorkEzTheme.typography.xs,
    marginTop: 4,
  },
  messageTimeClient: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  messageTimePro: {
    color: WorkEzTheme.colors.textSecondary,
  },
  footer: {
    backgroundColor: WorkEzTheme.colors.backgroundCard,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: WorkEzTheme.colors.border,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: WorkEzTheme.colors.backgroundAlt,
    borderWidth: 1,
    borderColor: WorkEzTheme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...WorkEzTheme.typography.base,
    color: WorkEzTheme.colors.text,
  },
  sendButton: {
    width: 48,
    height: 48,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
