import { useState, useRef, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Send, AlertCircle, User, Check, X, CornerDownRight, CheckCircle, MessageCircle } from 'lucide-react-native';
import { View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { WorkEzTheme } from '../../../constants/theme';
import { useFetch } from '../../../hooks/useFetch';
import { useAuth } from '../../../contexts/AuthContext';
import { apiRequest, getWebSocketUrl } from '../../../services/api';

interface ProposalInfo {
  id: string;
  serviceId: string;
  providerId: string;
  proposedPrice: number;
  status: string;
  counterPrice?: number;
  counterDescription?: string;
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
  const { id, serviceId: queryServiceId } = useLocalSearchParams<{ id: string; serviceId?: string }>();
  const { user } = useAuth();
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(true);
  const [chatError, setChatError] = useState<string | null>(null);
  const [liveProposal, setLiveProposal] = useState<ProposalInfo | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // 1. Tenta buscar diretamente a proposta
  const { data: directProposal, error: proposalError } = useFetch<ProposalInfo>(
    id ? `/api/Proposals/${id}` : null
  );

  // 2. Se id for serviceId ou queryServiceId fornecido:
  const candidateServiceId = queryServiceId || (proposalError || !directProposal ? (id as string) : undefined);
  const { data: serviceProposal } = useFetch<ProposalInfo>(
    candidateServiceId ? `/api/Proposals/chat-by-service/${candidateServiceId}` : null
  );

  const proposal = liveProposal || directProposal || serviceProposal;
  const activeProposalId = proposal?.id || (id as string);

  // 3. Busca o status do serviço
  const effectiveServiceId = queryServiceId || proposal?.serviceId;
  const { data: service } = useFetch<any>(
    effectiveServiceId ? `/api/Services/${effectiveServiceId}` : null
  );

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
          if (res.data) setMessages(res.data);
          if (res.error) setChatError(res.error);
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

  // 5. Conexão WebSocket em tempo real para mensagens e contra-propostas
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
          isFromProvider: true
        })
      });

      if (res.error) {
        Alert.alert('Erro ao enviar', res.error);
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

  const handleAcceptCounter = async () => {
    if (!activeProposalId || !user) return;
    Alert.alert(
      'Aceitar Contra-proposta',
      `Deseja aceitar o valor de R$ ${proposal?.counterPrice?.toFixed(2)} proposto pelo cliente? O trabalho será confirmado.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aceitar',
          onPress: async () => {
            setActionLoading(true);
            try {
              const res = await apiRequest<ProposalInfo>(`/api/Proposals/${activeProposalId}/accept-counter`, {
                method: 'POST',
                body: JSON.stringify({ providerUserId: user.id })
              });
              if (res.error) {
                Alert.alert('Erro', res.error);
              } else {
                if (res.data) setLiveProposal(res.data);
                Alert.alert('Sucesso!', 'Contra-proposta aceita! O chamado agora está em "Trabalhos Aceitos".');
              }
            } catch (err) {
              Alert.alert('Erro', 'Não foi possível aceitar a contra-proposta.');
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleRejectCounter = async () => {
    if (!activeProposalId || !user) return;
    Alert.alert(
      'Recusar Contra-proposta',
      'Deseja recusar a contra-proposta do cliente?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Recusar',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              const res = await apiRequest<ProposalInfo>(`/api/Proposals/${activeProposalId}/reject-counter`, {
                method: 'POST',
                body: JSON.stringify({ providerUserId: user.id })
              });
              if (res.error) {
                Alert.alert('Erro', res.error);
              } else {
                if (res.data) setLiveProposal(res.data);
                Alert.alert('Contra-proposta recusada', 'A proposta retornou ao status pendente com o seu valor original.');
              }
            } catch (err) {
              Alert.alert('Erro', 'Não foi possível recusar.');
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const isCountered = proposal?.status === 'CounterOffered';

  return (
    <View style={styles.container}>
      {/* Header */}
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
            <Text style={styles.clientName}>{service?.clientName || 'Cliente (Solicitante)'}</Text>
            <Text style={styles.statusText}>
              {isAccepted
                ? 'Chamado em execução'
                : `Seu Lance: R$ ${proposal?.proposedPrice ? proposal.proposedPrice.toFixed(2).replace('.', ',') : '...'}`}
            </Text>
          </View>
        </View>
      </View>

      {/* Contra-proposta Banner no Chat */}
      {isCountered && (
        <View style={styles.counterBanner}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <CornerDownRight size={18} color="#D97706" />
            <Text style={{ color: '#B45309', fontWeight: '700', fontSize: 14 }}>
              O cliente enviou uma contra-proposta: R$ {proposal.counterPrice?.toFixed(2).replace('.', ',')}
            </Text>
          </View>
          {proposal.counterDescription && (
            <Text style={{ color: '#92400E', fontSize: 13, marginBottom: 8 }}>
              "{proposal.counterDescription}"
            </Text>
          )}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={[styles.bannerBtn, { backgroundColor: '#16A34A', flex: 1.2 }]}
              onPress={handleAcceptCounter}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.bannerBtnTextWhite}>Aceitar R$ {proposal.counterPrice?.toFixed(2)}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.bannerBtn, { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FECACA' }]}
              onPress={handleRejectCounter}
              disabled={actionLoading}
            >
              <Text style={{ color: '#DC2626', fontWeight: '600', fontSize: 13 }}>Recusar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

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
              <Text style={{ fontWeight: '700' }}>Chat do Chamado:</Text> Converse diretamente com o cliente em tempo real até a conclusão do serviço.
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.alertBanner}>
          <View style={styles.alertRow}>
            <AlertCircle size={16} color="#2563EB" style={styles.alertIcon} />
            <Text style={styles.alertText}>
              <Text style={{ fontWeight: '600' }}>Negociação no Leilão:</Text> Negocie detalhes e valores diretamente com o cliente.
            </Text>
          </View>
        </View>
      )}

      {/* Mensagens */}
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
                ? 'Inicie a conversa! Envie uma mensagem para alinhar os detalhes da execução do chamado com o cliente.'
                : 'Inicie a conversa com o cliente para negociar ou confirmar detalhes.'}
            </Text>
          </View>
        ) : (
          messages.map((msg) => {
            const isMe = msg.isFromProvider;
            const timeFormatted = new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return (
              <View
                key={msg.id}
                style={[
                  styles.messageRow,
                  isMe ? styles.messageRowRight : styles.messageRowLeft
                ]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    isMe ? styles.messageBubbleMe : styles.messageBubbleOther
                  ]}
                >
                  <Text style={[
                    styles.messageText,
                    isMe ? styles.messageTextMe : styles.messageTextOther
                  ]}>
                    {msg.content}
                  </Text>
                  <Text style={[
                    styles.messageTime,
                    isMe ? styles.messageTimeMe : styles.messageTimeOther
                  ]}>
                    {timeFormatted}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Footer / Input */}
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
                : 'Digite sua mensagem ao cliente...'
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
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 8,
    backgroundColor: '#F1F5F9',
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
    ...WorkEzTheme.typography.base,
    fontWeight: WorkEzTheme.typography.fontWeight.semibold,
    color: '#0F172A',
  },
  statusText: {
    ...WorkEzTheme.typography.sm,
    color: '#2563EB',
    fontWeight: '500',
  },
  counterBanner: {
    backgroundColor: '#FEF3C7',
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
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
    backgroundColor: '#EFF6FF',
    borderBottomWidth: 1,
    borderBottomColor: '#BFDBFE',
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
    color: '#1D4ED8',
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
    color: '#64748B',
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
    paddingVertical: 10,
  },
  messageBubbleMe: {
    backgroundColor: '#2563EB',
  },
  messageBubbleOther: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  messageText: {
    ...WorkEzTheme.typography.sm,
  },
  messageTextMe: {
    color: '#FFFFFF',
  },
  messageTextOther: {
    color: '#0F172A',
  },
  messageTime: {
    ...WorkEzTheme.typography.xs,
    marginTop: 4,
  },
  messageTimeMe: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  messageTimeOther: {
    color: '#94A3B8',
  },
  footer: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    ...WorkEzTheme.typography.base,
    color: '#0F172A',
  },
  sendButton: {
    width: 46,
    height: 46,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
