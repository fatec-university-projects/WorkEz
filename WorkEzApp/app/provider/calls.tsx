import { useState, useCallback, useEffect } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { ServiceCard } from '../../components/ServiceCard';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert, Platform } from 'react-native';
import { WorkEzTheme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useAppTheme } from '../../contexts/ThemeContext';
import { useFetch } from '../../hooks/useFetch';
import { apiRequest } from '../../services/api';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Gavel, MessageCircle, Clock, CornerDownRight } from 'lucide-react-native';

const formatEstimatedTime = (time: string | undefined | null) => {
  if (!time) return '';
  const trimmed = time.trim();
  if (!trimmed) return '';
  if (/^\d+([.,]\d+)?$/.test(trimmed)) {
    return `${trimmed} hora(s)`;
  }
  return trimmed;
};

interface Call {
  id: string;
  category: string;
  description: string;
  status: 'pending' | 'open' | 'accepted' | 'on-the-way' | 'ontheway' | 'in-progress' | 'inprogress' | 'waiting-payment' | 'waitingpayment' | 'completed' | 'cancelled';
  date: string;
  clientName: string;
  distanceKm?: number;
  estimatedDurationMinutes?: number;
}

interface ProposalItem {
  id: string;
  serviceId: string;
  proposedPrice: number;
  laborPrice?: number;
  materialsPrice?: number;
  description?: string;
  estimatedTime?: string;
  status: string;
  createdAt: string;
  counterPrice?: number;
  counterDescription?: string;
  counterOfferedAt?: string;
  serviceStatus?: string;
}

export default function ProviderCalls() {
  const router = useRouter();
  const { user } = useAuth();
  const { isDark, colors } = useAppTheme();
  const [activeTab, setActiveTab] = useState<'opportunities' | 'proposals' | 'accepted'>('opportunities');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const { data: opportunities, loading: loadingOps, error: errorOps, refetch: refetchOps } = useFetch<Call[]>(
    user ? `/api/Services/opportunities-by-user/${user.id}` : null
  );

  const { data: myProposals, loading: loadingProps, error: errorProps, refetch: refetchProps } = useFetch<ProposalItem[]>(
    user ? `/api/Proposals/by-provider-user/${user.id}` : null
  );

  const { data: acceptedCalls, loading: loadingAcc, error: errorAcc, refetch: refetchAcc } = useFetch<Call[]>(
    user ? `/api/Services/by-provider-user/${user.id}` : null
  );

  useFocusEffect(
    useCallback(() => {
      refetchOps();
      refetchProps();
      refetchAcc();
    }, [refetchOps, refetchProps, refetchAcc])
  );

  useEffect(() => {
    const timer = setInterval(() => {
      refetchOps();
      refetchProps();
      refetchAcc();
    }, 5000);
    return () => clearInterval(timer);
  }, [refetchOps, refetchProps, refetchAcc]);

  const handleAcceptCounter = async (proposalId: string) => {
    if (!user) return;

    const execute = async () => {
      setActionLoadingId(proposalId);
      try {
        const res = await apiRequest(`/api/Proposals/${proposalId}/accept-counter`, {
          method: 'POST',
          body: JSON.stringify({ providerUserId: user.id })
        });
        if (res.error) {
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.alert(`Erro ao aceitar: ${res.error}`);
          } else {
            Alert.alert('Erro ao aceitar', res.error);
          }
        } else {
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.alert('Contra-proposta aceita com sucesso! O chamado agora está em "Aceitos".');
          } else {
            Alert.alert('Sucesso!', 'Contra-proposta aceita! O chamado agora está em "Aceitos".');
          }
          refetchProps();
          refetchAcc();
          setActiveTab('accepted');
        }
      } catch {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert('Erro ao conectar ao servidor.');
        } else {
          Alert.alert('Erro', 'Não foi possível conectar ao servidor.');
        }
      } finally {
        setActionLoadingId(null);
      }
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Deseja aceitar o valor proposto pelo cliente? O chamado será confirmado com este valor.')) {
        await execute();
      }
    } else {
      Alert.alert(
        'Aceitar Contra-proposta',
        'Deseja aceitar o valor proposto pelo cliente? O chamado será confirmado com este valor.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Aceitar', onPress: execute }
        ]
      );
    }
  };

  const handleRejectCounter = async (proposalId: string) => {
    if (!user) return;

    const execute = async () => {
      setActionLoadingId(proposalId);
      try {
        const res = await apiRequest(`/api/Proposals/${proposalId}/reject-counter`, {
          method: 'POST',
          body: JSON.stringify({ providerUserId: user.id })
        });
        if (res.error) {
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.alert(`Erro ao recusar: ${res.error}`);
          } else {
            Alert.alert('Erro ao recusar', res.error);
          }
        } else {
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.alert('Contra-proposta recusada. A proposta retornou ao status pendente com o seu valor original.');
          } else {
            Alert.alert('Contra-proposta recusada', 'A proposta retornou ao status pendente com o seu valor original.');
          }
          refetchProps();
        }
      } catch {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert('Erro ao conectar ao servidor.');
        } else {
          Alert.alert('Erro', 'Não foi possível conectar ao servidor.');
        }
      } finally {
        setActionLoadingId(null);
      }
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Deseja recusar a contra-proposta? O cliente poderá manter o seu lance original ou negociar via chat.')) {
        await execute();
      }
    } else {
      Alert.alert(
        'Recusar Contra-proposta',
        'Deseja recusar a contra-proposta? O cliente poderá manter o seu lance original ou negociar via chat.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Recusar', style: 'destructive', onPress: execute }
        ]
      );
    }
  };

  const handledServiceIds = new Set([
    ...(myProposals || []).map(p => p.serviceId),
    ...(acceptedCalls || []).map(c => c.id)
  ]);

  const freshOpportunities = (opportunities || []).filter(
    opp => !handledServiceIds.has(opp.id)
  );

  const calls = activeTab === 'opportunities' ? freshOpportunities : acceptedCalls;
  const loading = activeTab === 'opportunities' ? loadingOps : activeTab === 'proposals' ? loadingProps : loadingAcc;
  const error = activeTab === 'opportunities' ? errorOps : activeTab === 'proposals' ? errorProps : errorAcc;
  const hasData = activeTab === 'opportunities' ? !!opportunities : activeTab === 'proposals' ? !!myProposals : !!acceptedCalls;
  const isInitialLoading = loading && !hasData;
  const activeColor = isDark ? '#60A5FA' : '#2563EB';

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundAlt }]}>
      <ScreenHeader title="Chamados & Propostas" />

      {/* Tabs */}
      <View
        style={[
          styles.tabsContainer,
          { backgroundColor: colors.backgroundCard, borderBottomColor: colors.border },
        ]}
      >
        <View style={styles.tabsRow}>
          <TouchableOpacity
            onPress={() => setActiveTab('opportunities')}
            style={styles.tabButton}
          >
            <Text
              style={[
                styles.tabText,
                { color: colors.textSecondary },
                activeTab === 'opportunities' && [styles.tabTextActive, { color: activeColor }],
              ]}
            >
              Novos
            </Text>
            {activeTab === 'opportunities' && <View style={[styles.activeIndicator, { backgroundColor: activeColor }]} />}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('proposals')}
            style={styles.tabButton}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text
                style={[
                  styles.tabText,
                  { color: colors.textSecondary },
                  activeTab === 'proposals' && [styles.tabTextActive, { color: activeColor }],
                ]}
              >
                Minhas Propostas
              </Text>
              {myProposals && myProposals.some(p => p.status === 'CounterOffered') && (
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#D97706' }} />
              )}
            </View>
            {activeTab === 'proposals' && <View style={[styles.activeIndicator, { backgroundColor: activeColor }]} />}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('accepted')}
            style={styles.tabButton}
          >
            <Text
              style={[
                styles.tabText,
                { color: colors.textSecondary },
                activeTab === 'accepted' && [styles.tabTextActive, { color: activeColor }],
              ]}
            >
              Aceitos
            </Text>
            {activeTab === 'accepted' && <View style={[styles.activeIndicator, { backgroundColor: activeColor }]} />}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {isInitialLoading ? (
          <View style={{ padding: 48, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ marginTop: 16, color: colors.textSecondary }}>Carregando dados...</Text>
          </View>
        ) : error ? (
          <View style={{ padding: 48, alignItems: 'center' }}>
            <Text style={{ color: colors.danger }}>{error}</Text>
          </View>
        ) : activeTab === 'proposals' ? (
          <View style={styles.content}>
            {(() => {
              const activeProposals = myProposals?.filter(p => p.status !== 'Accepted') || [];
              return activeProposals.length > 0 ? (
                activeProposals.map((proposal) => {
                  const serviceSt = (proposal.serviceStatus || (proposal as any)?.ServiceStatus || '').toLowerCase();
                  const isServiceClosed = serviceSt === 'completed' || serviceSt === 'cancelled';
                  const isRejected = proposal.status === 'Rejected' || isServiceClosed;
                  const isCountered = proposal.status === 'CounterOffered' && !isRejected;
                  const isNegotiating = proposal.status === 'NegotiationOpen' && !isRejected;
                  const isAccepted = proposal.status === 'Accepted';
                  const isLoading = actionLoadingId === proposal.id;

                  return (
                    <View
                      key={proposal.id}
                      style={[
                        styles.proposalCard,
                        { backgroundColor: colors.backgroundCard, borderColor: colors.border },
                      ]}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Gavel size={18} color={activeColor} />
                          <Text style={{ fontWeight: '700', fontSize: 16, color: colors.text }}>
                            R$ {proposal.proposedPrice?.toFixed(2).replace('.', ',')}
                          </Text>
                        </View>
                        <View style={[
                          styles.statusPill,
                          isCountered ? styles.statusPillWarning :
                          isAccepted ? styles.statusPillSuccess :
                          isRejected ? styles.statusPillDanger :
                          styles.statusPillDefault
                        ]}>
                          <Text style={[
                            styles.statusPillText,
                            isCountered ? { color: '#B45309' } :
                            isAccepted ? { color: '#15803D' } :
                            isRejected ? { color: '#B91C1C' } :
                            { color: '#2563EB' }
                          ]}>
                            {isCountered ? 'Contra-proposta Recebida' :
                             isNegotiating ? 'Em Negociação' :
                             isAccepted ? 'Aceita' :
                             isRejected ? 'Recusada' :
                             'Aguardando Cliente'}
                          </Text>
                        </View>
                      </View>

                      {proposal.materialsPrice && proposal.materialsPrice > 0 ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                          <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                            Mão de obra: R$ {(proposal.laborPrice || (proposal.proposedPrice - proposal.materialsPrice)).toFixed(2).replace('.', ',')}
                          </Text>
                          <Text style={{ fontSize: 12, color: colors.border }}>•</Text>
                          <Text style={{ fontSize: 12, color: colors.success, fontWeight: '500' }}>
                            Materiais: R$ {proposal.materialsPrice.toFixed(2).replace('.', ',')}
                          </Text>
                        </View>
                      ) : null}

                      {proposal.estimatedTime && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                          <Clock size={13} color={colors.textSecondary} />
                          <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                            Estimativa: {formatEstimatedTime(proposal.estimatedTime)}
                          </Text>
                        </View>
                      )}

                      {proposal.description && (
                        <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 8 }}>
                          "{proposal.description}"
                        </Text>
                      )}

                      {isCountered && (
                        <View style={styles.counterBannerProvider}>
                          <CornerDownRight size={18} color="#D97706" style={{ marginTop: 2 }} />
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: '#B45309', fontWeight: '700', fontSize: 14 }}>
                              Cliente contra-propôs: R$ {proposal.counterPrice?.toFixed(2).replace('.', ',')}
                            </Text>
                            {proposal.counterDescription && (
                              <Text style={{ color: '#92400E', fontSize: 12, marginTop: 2 }}>
                                Mensagem: "{proposal.counterDescription}"
                              </Text>
                            )}
                            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                              <TouchableOpacity
                                style={[styles.btnAction, { backgroundColor: '#16A34A', flex: 1.2 }]}
                                onPress={() => handleAcceptCounter(proposal.id)}
                                disabled={isLoading}
                              >
                                {isLoading ? (
                                  <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                  <Text style={styles.btnActionTextWhite}>Aceitar R$ {proposal.counterPrice?.toFixed(2)}</Text>
                                )}
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={[styles.btnAction, { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FECACA' }]}
                                onPress={() => handleRejectCounter(proposal.id)}
                                disabled={isLoading}
                              >
                                <Text style={{ color: '#DC2626', fontWeight: '600', fontSize: 13 }}>Recusar</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      )}

                      <View style={{ marginTop: 10, flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                          style={[
                            styles.btnAction,
                            styles.btnChat,
                            { flex: 1 },
                            isDark && { backgroundColor: 'rgba(37, 99, 235, 0.16)', borderColor: 'rgba(96, 165, 250, 0.35)' },
                            isRejected && { backgroundColor: colors.backgroundAlt, borderColor: colors.border }
                          ]}
                          onPress={() =>
                            router.push({
                              pathname: '/provider/chat/[id]',
                              params: { id: proposal.id, serviceId: proposal.serviceId }
                            } as any)
                          }
                        >
                          <MessageCircle size={16} color={isRejected ? colors.textSecondary : activeColor} />
                          <Text style={{ color: isRejected ? colors.textSecondary : activeColor, fontWeight: '600', fontSize: 13 }}>
                            {isRejected ? 'Ver Histórico do Chat (Encerrado)' : 'Conversar / Barganhar no Chat'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={{ padding: 48, alignItems: 'center' }}>
                  <Gavel size={36} color={colors.textMuted} />
                  <Text style={{ color: colors.textSecondary, marginTop: 12, fontSize: 15 }}>
                    Nenhuma proposta ativa em negociação.
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4, textAlign: 'center' }}>
                    Veja os chamados em "Novos" para enviar orçamentos ou acompanhe em "Aceitos".
                  </Text>
                </View>
              );
            })()}
          </View>
        ) : (
          <View style={styles.content}>
            {calls?.map((call) => (
              <ServiceCard
                key={call.id}
                category={call.category}
                description={call.description}
                status={call.status}
                date={call.date}
                professional={call.clientName}
                distanceKm={call.distanceKm}
                estimatedDurationMinutes={call.estimatedDurationMinutes}
                onClick={() => {
                  if (activeTab === 'opportunities') {
                    router.push(`/provider/new-call/${call.id}` as any);
                  } else {
                    if (call.status === 'on-the-way' || call.status === 'in-progress' || call.status === 'inprogress' || call.status === 'ontheway') {
                      router.push(`/provider/in-progress/${call.id}` as any);
                    } else if (call.status === 'waiting-payment' || call.status === 'waitingpayment') {
                      router.push(`/provider/waiting-payment/${call.id}` as any);
                    } else {
                      router.push(`/provider/accepted/${call.id}` as any);
                    }
                  }
                }}
              />
            ))}

            {(!calls || calls.length === 0) && (
              <View style={{ padding: 48, alignItems: 'center' }}>
                <Text style={{ color: colors.textSecondary }}>
                  {activeTab === 'opportunities'
                    ? 'Nenhum chamado no momento.'
                    : 'Nenhum chamado aceito.'}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  tabsContainer: {
    borderBottomWidth: 1,
    paddingHorizontal: 24,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 24,
  },
  tabButton: {
    paddingBottom: 12,
    paddingTop: 8,
    position: 'relative',
  },
  tabText: {
    ...WorkEzTheme.typography.base,
  },
  tabTextActive: {
    fontWeight: WorkEzTheme.typography.fontWeight.semibold,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  content: {
    padding: 24,
    gap: 12,
  },
  proposalCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillDefault: {
    backgroundColor: '#EFF6FF',
  },
  statusPillWarning: {
    backgroundColor: '#FEF3C7',
  },
  statusPillSuccess: {
    backgroundColor: '#DCFCE7',
  },
  statusPillDanger: {
    backgroundColor: '#FEE2E2',
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  counterBannerProvider: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
  },
  btnAction: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  btnActionTextWhite: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  btnChat: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
});
