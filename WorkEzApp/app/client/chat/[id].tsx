import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Send, AlertCircle, User, CheckCircle, MessageCircle } from 'lucide-react-native';
import { View, Text, TouchableOpacity, Image, TextInput, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { WorkEzTheme } from '../../../constants/theme';
import { useFetch } from '../../../hooks/useFetch';
import { useAuth } from '../../../contexts/AuthContext';
import { apiRequest, getWebSocketUrl } from '../../../services/api';

interface ProposalInfo {
  id: string;
  serviceId?: string;
  providerName: string;
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
  const { id, serviceId: queryServiceId } = useLocalSearchParams<{ id: string; serviceId?: string }>();
  const { user } = useAuth();
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(true);
  const [chatError, setChatError] = useState<string | null>(null);
  const [liveProposal, setLiveProposal] = useState<ProposalInfo | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // 1. Tenta buscar a proposta diretamente pelo id
  const { data: directProposal, error: proposalError } = useFetch<ProposalInfo>(
    id ? `/api/Proposals/${id}` : null
  );

  // 2. Se id for serviceId ou se queryServiceId foi fornecido, busca a proposta ativa do serviço
  const candidateServiceId = queryServiceId || (proposalError || !directProposal ? (id as string) : undefined);
  const { data: serviceProposal } = useFetch<ProposalInfo>(
    candidateServiceId ? `/api/Proposals/chat-by-service/${candidateServiceId}` : null
  );

  const proposal = liveProposal || directProposal || serviceProposal;
  const activeProposalId = proposal?.id || (id as string);

  // 3. Busca os dados do serviço para acompanhar o ciclo de vida
  const effectiveServiceId = queryServiceId || proposal?.serviceId;
  const { data: service } = useFetch<any>(
    effectiveServiceId ? `/api/Services/${effectiveServiceId}` : null
  );

  // Status do serviço e término
  const isCompleted = service?.status === 'completed';
  const isCancelled = service?.status === 'cancelled';
  const isAccepted = service?.status === 'accepted' ||
                     service?.status === 'on-the-way' ||
                     service?.status === 'ontheway' ||
                     service?.status === 'in-progress' ||
                     service?.status === 'inprogress' ||
                     service?.status === 'waiting-payment' ||
                     service?.status === 'waitingpayment' ||
                     proposal?.status?.toLowerCase() === 'accepted';
  const isFinished = isCompleted || isCancelled;

  // 4. Carga inicial de mensagens (sem loop de polling)
  useEffect(() => {
    if (!activeProposalId) return;
    let isCurrent = true;

    const loadInitialMessages = async () => {
      try {
        const res = await apiRequest<ChatMessage[]>(`/api/Proposals/${activeProposalId}/chat`);
        if (isCurrent) {
          if (res.data) {
            setMessages(res.data);
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

    const connectWs = () => {
      if (isDestroyed) return;
      const wsUrl = getWebSocketUrl(`/ws/chat?proposalId=${activeProposalId}${effectiveServiceId ? `&serviceId=${effectiveServiceId}` : ''}`);

      try {
        ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.eventType === 'new_message' && data.payload) {
              const newMsg = data.payload as ChatMessage;
              setMessages((prev) => {
                if (prev.some((m) => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });
            } else if (data.eventType === 'proposal_updated' && data.payload) {
              setLiveProposal(data.payload as ProposalInfo);
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
        Alert.alert('Aviso', res.error);
        setMessageText(textToSend);
      } else if (res.data) {
        const sentMsg = res.data;
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.8}
          >
            <ArrowLeft size={24} color={WorkEzTheme.colors.text} />
          </TouchableOpacity>
          <View style={[styles.avatar, { backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' }]}>
            <User size={20} color={WorkEzTheme.colors.textSecondary} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.professionalName}>{proposal?.providerName || service?.professional?.name || 'Prestador de Serviço'}</Text>
            <Text style={styles.statusText}>
              {isAccepted
                ? 'Chamado em andamento'
                : `Lance: R$ ${proposal?.proposedPrice ? proposal.proposedPrice.toFixed(2).replace('.', ',') : '...'}${proposal?.counterPrice ? ` • Contra-oferta: R$ ${proposal.counterPrice.toFixed(2).replace('.', ',')}` : ''}`}
            </Text>
          </View>
        </View>
      </View>

      {/* Banner de status contextual */}
      {isCompleted ? (
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
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={WorkEzTheme.colors.primary} />
            <Text style={styles.loadingText}>Carregando mensagens...</Text>
          </View>
        ) : chatError ? (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>{chatError}</Text>
          </View>
        ) : (!messages || messages.length === 0) ? (
          <View style={styles.centerContainer}>
            <Text style={{ color: '#94A3B8', textAlign: 'center', fontSize: 14 }}>
              {isAccepted
                ? 'Inicie a conversa! Envie uma mensagem para alinhar os detalhes da execução do chamado com o prestador.'
                : 'Inicie a conversa! Envie uma mensagem para negociar o valor com o prestador.'}
            </Text>
          </View>
        ) : (
          messages.map((msg) => {
            const isClient = !msg.isFromProvider;
            const timeFormatted = new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return (
              <View
                key={msg.id}
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
                  <Text style={[
                    styles.messageTime,
                    isClient ? styles.messageTimeClient : styles.messageTimePro
                  ]}>
                    {timeFormatted}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.inputRow}>
          <TextInput
            value={messageText}
            onChangeText={setMessageText}
            placeholder={
              isCompleted
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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    resizeMode: 'cover',
  },
  headerInfo: {
    flex: 1,
  },
  professionalName: {
    ...WorkEzTheme.typography.base,
    fontWeight: WorkEzTheme.typography.fontWeight.semibold,
    color: WorkEzTheme.colors.text,
  },
  statusText: {
    ...WorkEzTheme.typography.sm,
    color: WorkEzTheme.colors.primary,
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
