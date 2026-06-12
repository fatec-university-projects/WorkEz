import { useState, useCallback } from 'react';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Button } from '../../../components/Button';
import { View, Text, ActivityIndicator, Alert, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MapPin, User, FileText, ArrowLeft, ShieldCheck, Play, CheckCircle } from 'lucide-react-native';
import { WorkEzTheme } from '../../../constants/theme';
import { useFetch } from '../../../hooks/useFetch';
import { apiRequest } from '../../../services/api';

export default function ServiceInProgress() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [arrived, setArrived] = useState(false);
  const [updating, setUpdating] = useState(false);

  const { data: service, loading, error, refetch } = useFetch<any>(
    id ? `/api/Services/${id}` : null
  );

  useFocusEffect(
    useCallback(() => {
      if (id) {
        refetch();
      }
    }, [id, refetch])
  );

  const handleStartService = async () => {
    if (!id) return;
    setUpdating(true);
    try {
      const res = await apiRequest<any>(`/api/Services/${id}/start`, {
        method: 'PATCH'
      });
      if (res.error) {
        Alert.alert('Erro', res.error);
      } else {
        refetch();
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Erro', 'Não foi possível se conectar ao servidor.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={WorkEzTheme.colors.primary} />
        <Text style={styles.loadingText}>Carregando informações...</Text>
      </View>
    );
  }

  if (error || !service) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error || 'Serviço não encontrado.'}</Text>
        <Button onPress={() => router.back()}>Voltar</Button>
      </View>
    );
  }

  const isCompleted = service.status === 'completed';
  const isInProgress = service.status === 'in-progress' || service.status === 'inprogress';
  const isWaitingPayment = service.status === 'waiting-payment' || service.status === 'waitingpayment';
  const isOnTheWay = service.status === 'on-the-way' || service.status === 'ontheway' || service.status === 'accepted';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.push('/provider/calls' as any)}
            style={styles.iconButton}
            activeOpacity={0.8}
          >
            <ArrowLeft size={24} color={WorkEzTheme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Execução do Serviço</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Status card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Status Atual</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>
              {isOnTheWay && (arrived ? 'Você chegou ao local' : 'Você está a caminho')}
              {isInProgress && 'Serviço em andamento'}
              {isWaitingPayment && 'Aguardando pagamento do cliente'}
              {isCompleted && 'Concluído'}
            </Text>
          </View>
        </View>

        {/* Cliente info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Cliente e Serviço</Text>
          <View style={styles.clientRow}>
            <View style={styles.avatarPlaceholder}>
              <User size={24} color={WorkEzTheme.colors.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.clientName}>{service.clientName}</Text>
              <Text style={styles.categoryName}>{service.category}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailItem}>
            <MapPin size={20} color={WorkEzTheme.colors.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.detailLabel}>Local do serviço</Text>
              <Text style={styles.detailValue}>{service.address}</Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <FileText size={20} color={WorkEzTheme.colors.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.detailLabel}>Descrição do chamado</Text>
              <Text style={styles.detailValue}>{service.description}</Text>
            </View>
          </View>
        </View>

        {/* Action card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ações</Text>
          <View style={{ gap: 12 }}>
            {isOnTheWay && (
              <>
                {!arrived ? (
                  <Button
                    fullWidth
                    onPress={() => setArrived(true)}
                  >
                    <CheckCircle className="w-5 h-5 inline mr-2" />
                    Cheguei no local
                  </Button>
                ) : (
                  <Button
                    fullWidth
                    onPress={handleStartService}
                    disabled={updating}
                  >
                    {updating ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <>
                        <Play className="w-5 h-5 inline mr-2" />
                        Iniciar serviço
                      </>
                    )}
                  </Button>
                )}
              </>
            )}

            {isInProgress && (
              <Button
                fullWidth
                onPress={() => router.push(`/provider/inform-value/${id}` as any)}
              >
                <CheckCircle className="w-5 h-5 inline mr-2" />
                Marcar como concluído
              </Button>
            )}

            {isWaitingPayment && (
              <Button
                fullWidth
                onPress={() => router.push(`/provider/waiting-payment/${id}` as any)}
              >
                Ver status do pagamento
              </Button>
            )}

            {isCompleted && (
              <Button
                fullWidth
                variant="secondary"
                onPress={() => router.push('/provider' as any)}
              >
                Voltar para o painel
              </Button>
            )}
          </View>
        </View>

        <View style={styles.guaranteeCard}>
          <ShieldCheck size={20} color="#854D0E" />
          <Text style={styles.guaranteeText}>
            Todo o atendimento é segurado pelo WorkEz. Siga as orientações de segurança.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WorkEzTheme.colors.backgroundAlt,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: WorkEzTheme.colors.backgroundAlt,
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    color: WorkEzTheme.colors.textSecondary,
  },
  errorText: {
    color: WorkEzTheme.colors.danger,
    textAlign: 'center',
    marginBottom: 16,
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
  statusBadge: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#EFF6FF',
    borderRadius: WorkEzTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
  },
  statusText: {
    color: '#1D4ED8',
    fontWeight: '600',
    fontSize: 16,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientName: {
    ...WorkEzTheme.typography.base,
    fontWeight: WorkEzTheme.typography.fontWeight.semibold,
    color: WorkEzTheme.colors.text,
  },
  categoryName: {
    ...WorkEzTheme.typography.sm,
    color: WorkEzTheme.colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: WorkEzTheme.colors.border,
    marginVertical: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  detailLabel: {
    ...WorkEzTheme.typography.xs,
    color: WorkEzTheme.colors.textSecondary,
    marginBottom: 4,
  },
  detailValue: {
    ...WorkEzTheme.typography.sm,
    color: WorkEzTheme.colors.text,
    lineHeight: 20,
  },
  guaranteeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE047',
    borderRadius: WorkEzTheme.borderRadius.xl,
    padding: WorkEzTheme.spacing.md,
  },
  guaranteeText: {
    flex: 1,
    ...WorkEzTheme.typography.sm,
    color: '#92400E',
    lineHeight: 20,
  },
});
