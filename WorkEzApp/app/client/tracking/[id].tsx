import { useState, useCallback, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle, Circle, MessageCircle, Star, User, Gavel, Clock, CornerDownRight, X as XIcon, Check } from 'lucide-react-native';
import { Button } from '../../../components/Button';
import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { WorkEzTheme } from '../../../constants/theme';
import { useFetch } from '../../../hooks/useFetch';
import { apiRequest, getWebSocketUrl } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';

interface Professional {
  id: string;
  name: string;
  photo: string;
  rating: number;
}

interface ProposalData {
  id: string;
  serviceId: string;
  providerId: string;
  providerName: string;
  proposedPrice: number;
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
  address: string;
  startTime: string;
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
  professional: Professional | null;
}

export default function ServiceTracking() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [cancelling, setCancelling] = useState(false);

  // Counter proposal modal state
  const [counterModalVisible, setCounterModalVisible] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<ProposalData | null>(null);
  const [counterPriceInput, setCounterPriceInput] = useState('');
  const [counterDescInput, setCounterDescInput] = useState('');
  const [submittingCounter, setSubmittingCounter] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const { data: initialService, loading, error } = useFetch<ServiceData>(
    id ? `/api/Services/${id}` : null
  );

  const { data: initialProposals } = useFetch<ProposalData[]>(
    id ? `/api/Proposals/by-service/${id}` : null
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

    function connect() {
      try {
        const wsUrl = getWebSocketUrl(`/ws/tracking?serviceId=${id}`);
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('[Tracking WS] Conectado em tempo real ao chamado:', id);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('[Tracking WS] Atualização recebida:', data.eventType);
            if (isMounted) {
              // Atualiza dados silenciosamente sem recarregar a tela
              silentFetchProposals();
              silentFetchService();
            }
          } catch (e) {
            console.warn('[Tracking WS] Erro ao processar mensagem do socket:', e);
          }
        };

        ws.onerror = () => {
          // Erro silencioso — não atrapalha a experiência do usuário
        };

        ws.onclose = () => {
          if (isMounted) {
            reconnectTimeout = setTimeout(connect, 5000);
          }
        };
      } catch (e) {
        console.warn('[Tracking WS] Erro ao conectar socket:', e);
      }
    }

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, [id, silentFetchProposals, silentFetchService]);

  const getSteps = (status: string | undefined) => {
    const statuses = ['open', 'accepted', 'on-the-way', 'in-progress', 'waiting-payment', 'completed'];
    const normalizedStatus = status === 'undernegotiation' ? 'accepted' :
                             status === 'ontheway' ? 'on-the-way' :
                             status === 'inprogress' ? 'in-progress' :
                             status === 'waitingpayment' ? 'waiting-payment' :
                             status;
    const currentIndex = normalizedStatus ? statuses.indexOf(normalizedStatus) : 0;

    return [
      { label: 'Aguardando aceitação', completed: currentIndex >= 0 },
      { label: 'Chamado aceito', completed: currentIndex >= 1 },
      { label: 'Profissional a caminho', completed: currentIndex >= 2 },
      { label: 'Serviço em andamento', completed: currentIndex >= 3 },
      { label: 'Aguardando pagamento', completed: currentIndex >= 4 },
      { label: 'Concluído', completed: currentIndex >= 5 },
    ];
  };

  const steps = getSteps(service?.status);

  const handleCancelService = async () => {
    const isDisplaced = service?.status === 'on-the-way' || service?.status === 'ontheway';
    const alertMessage = isDisplaced
      ? 'Tem certeza que deseja cancelar este serviço? Como o profissional já está a caminho, será cobrada uma taxa de deslocamento.'
      : 'Tem certeza que deseja cancelar este serviço?';

    Alert.alert(
      'Cancelar chamado',
      alertMessage,
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Sim, cancelar',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              const res = await apiRequest(`/api/Services/${id}/status?status=false`, {
                method: 'PATCH'
              });
              if (res.error) {
                Alert.alert('Erro', res.error);
              } else {
                Alert.alert('Sucesso', 'Serviço cancelado com sucesso!', [
                  { text: 'OK', onPress: () => router.back() }
                ]);
              }
            } catch (err) {
              console.error(err);
              Alert.alert('Erro', 'Não foi possível conectar ao servidor.');
            } finally {
              setCancelling(false);
            }
          }
        }
      ]
    );
  };

  const handleAcceptProposal = async (proposalId: string) => {
    if (!user) return;
    Alert.alert(
      'Aceitar Proposta',
      'Deseja aceitar esta proposta? Ao aceitar, o agendamento será confirmado e as outras propostas serão recusadas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setActionLoadingId(proposalId);
            try {
              const res = await apiRequest('/api/Proposals/accept', {
                method: 'POST',
                body: JSON.stringify({ customerUserId: user.id, proposalId })
              });
              if (res.error) {
                Alert.alert('Erro ao aceitar proposta', res.error);
              } else {
                Alert.alert('Sucesso!', 'Proposta aceita! O agendamento foi confirmado.');
                silentFetchService();
                silentFetchProposals();
              }
            } catch (err) {
              Alert.alert('Erro', 'Não foi possível aceitar a proposta.');
            } finally {
              setActionLoadingId(null);
            }
          }
        }
      ]
    );
  };

  const handleRejectProposal = async (proposalId: string) => {
    if (!user) return;
    Alert.alert(
      'Recusar Proposta',
      'Tem certeza que deseja recusar esta proposta?',
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Sim, recusar',
          style: 'destructive',
          onPress: async () => {
            setActionLoadingId(proposalId);
            try {
              const res = await apiRequest('/api/Proposals/reject', {
                method: 'POST',
                body: JSON.stringify({ customerUserId: user.id, proposalId })
              });
              if (res.error) {
                Alert.alert('Erro ao recusar', res.error);
              } else {
                silentFetchProposals();
              }
            } catch (err) {
              Alert.alert('Erro', 'Não foi possível recusar a proposta.');
            } finally {
              setActionLoadingId(null);
            }
          }
        }
      ]
    );
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
        Alert.alert('Erro ao enviar contra-proposta', res.error);
      } else {
        Alert.alert('Contra-proposta Enviada', 'O prestador foi notificado e responderá à sua oferta.');
        setCounterModalVisible(false);
        silentFetchProposals();
      }
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível enviar a contra-proposta.');
    } finally {
      setSubmittingCounter(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.iconButton}
            activeOpacity={0.8}
          >
            <ArrowLeft size={24} color={WorkEzTheme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            Acompanhar serviço
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading && !service ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={WorkEzTheme.colors.primary} />
            <Text style={styles.loadingText}>Carregando status do serviço...</Text>
          </View>
        ) : error && !service ? (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <>
            {/* ── SEÇÃO DE LEILÃO DE PROPOSTAS (Apenas visível para o solicitante) ── */}
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Gavel size={20} color="#2563EB" />
                  <Text style={[styles.cardTitle, { marginBottom: 0, lineHeight: 24, textAlignVertical: 'center', includeFontPadding: false }]}>
                    Leilão de Propostas
                  </Text>
                </View>
                <View style={styles.counterBadge}>
                  <Text style={styles.counterBadgeText}>
                    {proposals?.length || 0} {proposals?.length === 1 ? 'oferta' : 'ofertas'}
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 13, color: '#64748B', marginBottom: 14 }}>
                Estas propostas são confidenciais e visíveis apenas para você. Aceite a melhor oferta, faça uma contra-proposta ou barganhe via chat.
              </Text>

              {(!proposals || proposals.length === 0) ? (
                <View style={{ paddingVertical: 18, alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
                  <Clock size={28} color="#94A3B8" />
                  <Text style={{ marginTop: 8, color: '#475569', fontWeight: '500', fontSize: 14 }}>
                    Aguardando propostas de prestadores...
                  </Text>
                  <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 2, textAlign: 'center', paddingHorizontal: 16 }}>
                    Assim que prestadores enviarem seus valores, você verá os lances aqui em tempo real.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 12 }}>
                  {proposals.map((proposal) => {
                    const isPending = proposal.status === 'Pending';
                    const isNegotiating = proposal.status === 'NegotiationOpen';
                    const isCountered = proposal.status === 'CounterOffered';
                    const isAccepted = proposal.status === 'Accepted';
                    const isRejected = proposal.status === 'Rejected';
                    const isLoading = actionLoadingId === proposal.id;

                    return (
                      <View key={proposal.id} style={styles.proposalItemCard}>
                        {/* Header da proposta */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <View style={styles.providerAvatarSmall}>
                              <User size={18} color="#475569" />
                            </View>
                            <View>
                              <Text style={{ fontWeight: '600', color: '#0F172A', fontSize: 15 }}>
                                {proposal.providerName}
                              </Text>
                              {proposal.estimatedTime && (
                                <Text style={{ fontSize: 12, color: '#64748B' }}>
                                  Estimativa: {proposal.estimatedTime}
                                </Text>
                              )}
                            </View>
                          </View>

                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ fontSize: 18, fontWeight: '700', color: '#16A34A' }}>
                              R$ {proposal.proposedPrice?.toFixed(2).replace('.', ',')}
                            </Text>
                            <Text style={{ fontSize: 11, color: '#94A3B8' }}>
                              lance do prestador
                            </Text>
                          </View>
                        </View>

                        {/* Descrição do prestador */}
                        {proposal.description && (
                          <View style={{ marginTop: 8, padding: 8, backgroundColor: '#F8FAFC', borderRadius: 8 }}>
                            <Text style={{ fontSize: 13, color: '#334155' }}>
                              "{proposal.description}"
                            </Text>
                          </View>
                        )}

                        {/* Status / Contra-proposta informativa */}
                        {isCountered && (
                          <View style={styles.counterBanner}>
                            <CornerDownRight size={16} color="#D97706" style={{ marginTop: 2 }} />
                            <View style={{ flex: 1 }}>
                              <Text style={{ color: '#B45309', fontWeight: '600', fontSize: 13 }}>
                                Sua contra-proposta: R$ {proposal.counterPrice?.toFixed(2).replace('.', ',')}
                              </Text>
                              {proposal.counterDescription && (
                                <Text style={{ color: '#92400E', fontSize: 12, marginTop: 2 }}>
                                  "{proposal.counterDescription}"
                                </Text>
                              )}
                              <Text style={{ color: '#B45309', fontSize: 11, marginTop: 2, fontStyle: 'italic' }}>
                                Aguardando resposta do prestador...
                              </Text>
                            </View>
                          </View>
                        )}

                        {isNegotiating && (
                          <View style={{ marginTop: 8, padding: 8, backgroundColor: '#EFF6FF', borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <MessageCircle size={15} color="#2563EB" />
                            <Text style={{ fontSize: 12, color: '#1D4ED8', fontWeight: '500' }}>
                              Negociação em andamento via chat
                            </Text>
                          </View>
                        )}

                        {isAccepted && (
                          <View style={{ marginTop: 8, padding: 8, backgroundColor: '#DCFCE7', borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Check size={15} color="#16A34A" />
                            <Text style={{ fontSize: 12, color: '#15803D', fontWeight: '600' }}>
                              Proposta aceita! Agendamento gerado.
                            </Text>
                          </View>
                        )}

                        {isRejected && (
                          <View style={{ marginTop: 8, padding: 8, backgroundColor: '#FEE2E2', borderRadius: 8 }}>
                            <Text style={{ fontSize: 12, color: '#991B1B' }}>
                              Proposta recusada.
                            </Text>
                          </View>
                        )}

                        {/* Botões de Ação */}
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
                                  <Text style={styles.actionBtnTextWhite}>Aceitar (R$ {proposal.proposedPrice?.toFixed(2)})</Text>
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
                                style={[styles.actionBtn, styles.chatBtn, { flex: 1 }]}
                                onPress={() => router.push(`/client/chat/${proposal.id}` as any)}
                              >
                                <MessageCircle size={15} color="#2563EB" />
                                <Text style={{ color: '#2563EB', fontWeight: '600', fontSize: 13 }}>
                                  Barganhar no Chat
                                </Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={[styles.actionBtn, styles.rejectBtn]}
                                onPress={() => handleRejectProposal(proposal.id)}
                                disabled={isLoading}
                              >
                                <Text style={{ color: '#EF4444', fontWeight: '600', fontSize: 13 }}>Recusar</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        )}

                        {isCountered && (
                          <View style={{ marginTop: 10, flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity
                              style={[styles.actionBtn, styles.chatBtn, { flex: 1 }]}
                              onPress={() => router.push(`/client/chat/${proposal.id}` as any)}
                            >
                              <MessageCircle size={15} color="#2563EB" />
                              <Text style={{ color: '#2563EB', fontWeight: '600', fontSize: 13 }}>
                                Conversar no Chat
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.actionBtn, styles.rejectBtn]}
                              onPress={() => handleRejectProposal(proposal.id)}
                              disabled={isLoading}
                            >
                              <Text style={{ color: '#EF4444', fontWeight: '600', fontSize: 13 }}>Desistir / Recusar</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

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
                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A' }}>
                      Fazer Contra-proposta
                    </Text>
                    <TouchableOpacity onPress={() => setCounterModalVisible(false)}>
                      <XIcon size={20} color="#64748B" />
                    </TouchableOpacity>
                  </View>

                  <Text style={{ fontSize: 13, color: '#475569', marginBottom: 12 }}>
                    Valor original proposto por <Text style={{ fontWeight: '600' }}>{selectedProposal?.providerName}</Text>: <Text style={{ color: '#16A34A', fontWeight: '700' }}>R$ {selectedProposal?.proposedPrice?.toFixed(2).replace('.', ',')}</Text>
                  </Text>

                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#1E293B', marginBottom: 4 }}>
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

                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#1E293B', marginTop: 12, marginBottom: 4 }}>
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

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Status do serviço</Text>

              {service?.status === 'cancelled' ? (
                <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                  <Text style={{ color: WorkEzTheme.colors.danger, fontWeight: '600', fontSize: 16 }}>
                    Este serviço foi Cancelado.
                  </Text>
                </View>
              ) : (
                <>
                  <View style={{ padding: 12, backgroundColor: '#EFF6FF', borderRadius: 12, borderWidth: 1, borderColor: '#BFDBFE', marginBottom: 16, alignItems: 'center' }}>
                    <Text style={{ color: '#1D4ED8', fontWeight: '600', fontSize: 15, textAlign: 'center' }}>
                      {service?.status === 'open' && 'Aguardando profissionais aceitarem seu chamado...'}
                      {(service?.status === 'accepted' || service?.status === 'undernegotiation') && 'Profissional aceitou seu chamado!'}
                      {(service?.status === 'on-the-way' || service?.status === 'ontheway') && 'O profissional está a caminho do seu local!'}
                      {(service?.status === 'in-progress' || service?.status === 'inprogress') && 'Serviço em andamento...'}
                      {(service?.status === 'waiting-payment' || service?.status === 'waitingpayment') && 'Serviço concluído! Aguardando seu pagamento.'}
                      {service?.status === 'completed' && 'Serviço concluído com sucesso!'}
                    </Text>
                  </View>

                  <View style={styles.stepsContainer}>
                  {steps.map((step, index) => (
                    <View key={index} style={styles.stepRow}>
                      <View style={styles.stepIconColumn}>
                        {step.completed ? (
                          <View style={styles.completedIconWrapper}>
                            <CheckCircle size={16} color="#FFF" />
                          </View>
                        ) : (
                          <Circle size={24} color={WorkEzTheme.colors.border} />
                        )}
                        {index < steps.length - 1 && (
                          <View
                            style={[
                              styles.stepLine,
                              step.completed ? styles.stepLineCompleted : styles.stepLinePending
                            ]}
                          />
                        )}
                      </View>
                      <View style={styles.stepTextContent}>
                        <Text
                          style={[
                            styles.stepLabel,
                            step.completed ? styles.stepLabelCompleted : styles.stepLabelPending
                          ]}
                        >
                          {step.label}
                        </Text>
                        {index === 1 && (service?.status === 'accepted' || service?.status === 'undernegotiation') && (
                          <Text style={[styles.stepSubtext, { color: '#10B981' }]}>
                            Cancelamento gratuito disponível
                          </Text>
                        )}
                        {index === 2 && (service?.status === 'on-the-way' || service?.status === 'ontheway') && (
                          <Text style={[styles.stepSubtext, { color: '#F59E0B' }]}>
                            Cancelamento sujeito a taxa de deslocamento
                          </Text>
                        )}
                        {index === 3 && (service?.status === 'in-progress' || service?.status === 'inprogress') && (
                          <Text style={[styles.stepSubtext, { color: '#EF4444' }]}>
                            Cancelamento indisponível
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Profissional</Text>
              {service?.professional ? (
                <View style={styles.proRow}>
                  {service.professional.photo ? (
                    <Image
                      source={{ uri: service.professional.photo }}
                      style={styles.proAvatar}
                    />
                  ) : (
                    <View style={[styles.proAvatar, styles.proAvatarPlaceholder]}>
                      <User size={24} color={WorkEzTheme.colors.textSecondary} />
                    </View>
                  )}
                  <View style={styles.proInfo}>
                    <Text style={styles.proName}>{service.professional.name}</Text>
                    <Text style={styles.proDetails}>
                      {service.category || 'Serviço'} • <Star size={16} color={WorkEzTheme.colors.warning} /> {service.professional.rating?.toFixed(1) || 'N/A'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.messageButton}
                    onPress={() => {
                      const acceptedProposal = proposals?.find(
                        p => p.status?.toLowerCase() === 'accepted'
                      );
                      const targetId = acceptedProposal ? acceptedProposal.id : (id as string);
                      router.push({
                        pathname: '/client/chat/[id]',
                        params: { id: targetId, serviceId: id as string }
                      } as any);
                    }}
                  >
                    <MessageCircle size={20} color={WorkEzTheme.colors.primary} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ paddingVertical: 8 }}>
                  <Text style={{ color: WorkEzTheme.colors.textSecondary, fontSize: 15 }}>
                    {service?.status === 'cancelled' 
                      ? 'Serviço cancelado.' 
                      : 'Aguardando aceitação de um profissional...'}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Detalhes do serviço</Text>
              <View style={styles.detailsContainer}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Categoria</Text>
                  <Text style={styles.detailValue}>{service?.category || '-'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Endereço</Text>
                  <Text style={styles.detailValue}>{service?.address || '-'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Horário de início</Text>
                  <Text style={styles.detailValue}>{service?.startTime || '-'}</Text>
                </View>
              </View>
            </View>

            {service?.status === 'waiting-payment' && (
              <Button
                fullWidth
                onPress={() => router.push(`/client/payment/${id}` as any)}
                style={{ marginBottom: 12 }}
              >
                Efetuar pagamento
              </Button>
            )}

            {service && (service.status === 'open' || service.status === 'accepted' || service.status === 'on-the-way' || service.status === 'ontheway') && (
              <Button
                variant="secondary"
                fullWidth
                onPress={handleCancelService}
                disabled={cancelling}
              >
                {cancelling ? <ActivityIndicator color="#FFF" /> : 'Cancelar chamado'}
              </Button>
            )}
          </>
        )}
      </ScrollView>
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
  iconButton: {
    padding: WorkEzTheme.spacing.sm,
    backgroundColor: WorkEzTheme.colors.backgroundAlt,
    borderRadius: WorkEzTheme.borderRadius.lg,
  },
  headerTitle: {
    ...WorkEzTheme.typography.xl,
    fontWeight: WorkEzTheme.typography.fontWeight.semibold,
    color: WorkEzTheme.colors.text,
  },
  content: {
    padding: WorkEzTheme.spacing.lg,
    gap: WorkEzTheme.spacing.lg,
  },
  card: {
    backgroundColor: WorkEzTheme.colors.backgroundCard,
    borderRadius: WorkEzTheme.borderRadius["2xl"],
    padding: WorkEzTheme.spacing.lg,
    borderWidth: 1,
    borderColor: WorkEzTheme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: {
    ...WorkEzTheme.typography.base,
    fontWeight: WorkEzTheme.typography.fontWeight.semibold,
    color: WorkEzTheme.colors.text,
    marginBottom: WorkEzTheme.spacing.md,
  },
  stepsContainer: {
    gap: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepIconColumn: {
    alignItems: 'center',
    width: 24,
  },
  completedIconWrapper: {
    width: 24,
    height: 24,
    backgroundColor: WorkEzTheme.colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLine: {
    width: 2,
    height: 32,
    marginTop: 4,
    marginBottom: -12,
  },
  stepLineCompleted: {
    backgroundColor: WorkEzTheme.colors.primary,
  },
  stepLinePending: {
    backgroundColor: WorkEzTheme.colors.border,
  },
  stepTextContent: {
    flex: 1,
    paddingTop: 2,
  },
  stepLabel: {
    ...WorkEzTheme.typography.base,
    fontWeight: WorkEzTheme.typography.fontWeight.medium,
  },
  stepLabelCompleted: {
    color: WorkEzTheme.colors.text,
  },
  stepLabelPending: {
    color: WorkEzTheme.colors.textSecondary,
  },
  stepSubtext: {
    ...WorkEzTheme.typography.sm,
    color: WorkEzTheme.colors.textSecondary,
    marginTop: 4,
  },
  proRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  proAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    resizeMode: 'cover',
  },
  proAvatarPlaceholder: {
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proInfo: {
    flex: 1,
  },
  proName: {
    ...WorkEzTheme.typography.base,
    fontWeight: WorkEzTheme.typography.fontWeight.medium,
    color: WorkEzTheme.colors.text,
  },
  proDetails: {
    ...WorkEzTheme.typography.sm,
    color: WorkEzTheme.colors.textSecondary,
    marginTop: 2,
  },
  messageButton: {
    padding: WorkEzTheme.spacing.md,
    backgroundColor: 'rgba(38, 255, 245, 0.1)',
    borderRadius: WorkEzTheme.borderRadius.lg,
  },
  detailsContainer: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    ...WorkEzTheme.typography.sm,
    color: WorkEzTheme.colors.textSecondary,
  },
  detailValue: {
    ...WorkEzTheme.typography.sm,
    fontWeight: WorkEzTheme.typography.fontWeight.medium,
    color: WorkEzTheme.colors.text,
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
  counterBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  counterBadgeText: {
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '700',
  },
  proposalItemCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  providerAvatarSmall: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBanner: {
    marginTop: 8,
    padding: 10,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  acceptBtn: {
    backgroundColor: '#16A34A',
    flex: 1.3,
  },
  counterBtn: {
    backgroundColor: '#2563EB',
    flex: 1,
  },
  chatBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  rejectBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 16,
  },
  actionBtnTextWhite: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  modalBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
