import { useState, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { ServiceCard } from '../../components/ServiceCard';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert, Platform } from 'react-native';
import { WorkEzTheme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useFetch } from '../../hooks/useFetch';
import { apiRequest } from '../../services/api';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Gavel, MessageCircle, Clock, CornerDownRight, Check, X as XIcon } from 'lucide-react-native';

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
}

export default function ProviderCalls() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'opportunities' | 'proposals' | 'accepted'>('opportunities');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Fetch opportunities (open calls matching category)
  const { data: opportunities, loading: loadingOps, error: errorOps, refetch: refetchOps } = useFetch<Call[]>(
    user ? `/api/Services/opportunities-by-user/${user.id}` : null
  );

  // Fetch proposals made by this provider
  const { data: myProposals, loading: loadingProps, error: errorProps, refetch: refetchProps } = useFetch<ProposalItem[]>(
    user ? `/api/Proposals/by-provider-user/${user.id}` : null
  );

  // Fetch accepted calls using the static user session ID
  const { data: acceptedCalls, loading: loadingAcc, error: errorAcc, refetch: refetchAcc } = useFetch<Call[]>(
    user ? `/api/Services/by-provider-user/${user.id}` : null
  );

  // Refetch when the screen gets focus
  useFocusEffect(
    useCallback(() => {
      refetchOps();
      refetchProps();
      refetchAcc();
    }, [refetchOps, refetchProps, refetchAcc])
  );

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
      } catch (err) {
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
      } catch (err) {
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

  // Evita qualquer duplicação entre as abas:
  // Se o prestador já fez uma proposta (em 'myProposals') ou se o chamado já foi aceito (em 'acceptedCalls'),
  // ele NUNCA deve aparecer em 'Novos'!
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

  return (
    <View style={styles.container}>
      <ScreenHeader title="Chamados & Propostas" />

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <View style={styles.tabsRow}>
          <TouchableOpacity
            onPress={() => setActiveTab('opportunities')}
            style={styles.tabButton}
          >
            <Text style={[styles.tabText, activeTab === 'opportunities' && styles.tabTextActive]}>
              Novos
            </Text>
            {activeTab === 'opportunities' && <View style={styles.activeIndicator} />}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('proposals')}
            style={styles.tabButton}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={[styles.tabText, activeTab === 'proposals' && styles.tabTextActive]}>
                Minhas Propostas
              </Text>
              {myProposals && myProposals.some(p => p.status === 'CounterOffered') && (
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#D97706' }} />
              )}
            </View>
            {activeTab === 'proposals' && <View style={styles.activeIndicator} />}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('accepted')}
            style={styles.tabButton}
          >
            <Text style={[styles.tabText, activeTab === 'accepted' && styles.tabTextActive]}>
              Aceitos
            </Text>
            {activeTab === 'accepted' && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <View style={{ padding: 48, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={WorkEzTheme.colors.primary} />
            <Text style={{ marginTop: 16, color: WorkEzTheme.colors.textSecondary }}>Carregando dados...</Text>
          </View>
        ) : error ? (
          <View style={{ padding: 48, alignItems: 'center' }}>
            <Text style={{ color: WorkEzTheme.colors.danger }}>{error}</Text>
          </View>
        ) : activeTab === 'proposals' ? (
          <View style={styles.content}>
            {(() => {
              const activeProposals = myProposals?.filter(p => p.status !== 'Accepted') || [];
              return activeProposals.length > 0 ? (
                activeProposals.map((proposal) => {
                  const isCountered = proposal.status === 'CounterOffered';
                  const isPending = proposal.status === 'Pending';
                  const isNegotiating = proposal.status === 'NegotiationOpen';
                  const isAccepted = proposal.status === 'Accepted';
                  const isRejected = proposal.status === 'Rejected';
                  const isLoading = actionLoadingId === proposal.id;

                  return (
                    <View key={proposal.id} style={styles.proposalCard}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Gavel size={18} color="#2563EB" />
                          <Text style={{ fontWeight: '700', fontSize: 16, color: '#0F172A' }}>
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

                      {/* Detalhamento de Mão de Obra e Materiais */}
                      {proposal.materialsPrice && proposal.materialsPrice > 0 ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                          <Text style={{ fontSize: 12, color: '#64748B' }}>
                            Mão de obra: R$ {(proposal.laborPrice || (proposal.proposedPrice - proposal.materialsPrice)).toFixed(2).replace('.', ',')}
                          </Text>
                          <Text style={{ fontSize: 12, color: '#CBD5E1' }}>•</Text>
                          <Text style={{ fontSize: 12, color: '#16A34A', fontWeight: '500' }}>
                            Materiais: R$ {proposal.materialsPrice.toFixed(2).replace('.', ',')}
                          </Text>
                        </View>
                      ) : null}

                      {proposal.estimatedTime && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                          <Clock size={13} color="#64748B" />
                          <Text style={{ fontSize: 12, color: '#64748B' }}>
                            Estimativa: {formatEstimatedTime(proposal.estimatedTime)}
                          </Text>
                        </View>
                      )}

                      {proposal.description && (
                        <Text style={{ fontSize: 13, color: '#475569', marginBottom: 8 }}>
                          "{proposal.description}"
                        </Text>
                      )}

                      {/* Destaque de Contra-proposta */}
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

                      {/* Botão de Chat para negociação */}
                      <View style={{ marginTop: 10, flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                          style={[styles.btnAction, styles.btnChat, { flex: 1 }]}
                          onPress={() => router.push(`/provider/chat/${proposal.id}` as any)}
                        >
                          <MessageCircle size={16} color="#2563EB" />
                          <Text style={{ color: '#2563EB', fontWeight: '600', fontSize: 13 }}>
                            Conversar / Barganhar no Chat
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={{ padding: 48, alignItems: 'center' }}>
                  <Gavel size={36} color="#94A3B8" />
                  <Text style={{ color: WorkEzTheme.colors.textSecondary, marginTop: 12, fontSize: 15 }}>
                    Nenhuma proposta ativa em negociação.
                  </Text>
                  <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 4, textAlign: 'center' }}>
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
                <Text style={{ color: WorkEzTheme.colors.textSecondary }}>
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
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: WorkEzTheme.colors.backgroundCard,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: WorkEzTheme.colors.border,
  },
  headerTitle: {
    ...WorkEzTheme.typography.xl,
    fontWeight: WorkEzTheme.typography.fontWeight.bold,
    color: WorkEzTheme.colors.text,
  },
  tabsContainer: {
    backgroundColor: WorkEzTheme.colors.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: WorkEzTheme.colors.border,
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
    color: WorkEzTheme.colors.textSecondary,
  },
  tabTextActive: {
    color: '#2563EB',
    fontWeight: WorkEzTheme.typography.fontWeight.semibold,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#2563EB',
  },
  content: {
    padding: 24,
    gap: 12,
  },
  proposalCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
