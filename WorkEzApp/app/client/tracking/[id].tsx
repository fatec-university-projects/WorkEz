import { useState, useCallback, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle, Circle, MessageCircle, Star, User } from 'lucide-react-native';
import { Button } from '../../../components/Button';
import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { WorkEzTheme } from '../../../constants/theme';
import { useFetch } from '../../../hooks/useFetch';
import { apiRequest } from '../../../services/api';

interface Professional {
  id: string;
  name: string;
  photo: string;
  rating: number;
}

interface ServiceData {
  id: string;
  category: string;
  address: string;
  startTime: string;
  status: 'open' | 'accepted' | 'on-the-way' | 'in-progress' | 'waiting-payment' | 'completed' | 'cancelled';
  professional: Professional | null;
}

export default function ServiceTracking() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [cancelling, setCancelling] = useState(false);

  const { data: service, loading, error, refetch } = useFetch<ServiceData>(
    id ? `/api/Services/${id}` : null
  );

  useEffect(() => {
    if (!id) return;
    const interval = setInterval(() => {
      refetch();
    }, 5000);
    return () => clearInterval(interval);
  }, [id, refetch]);

  const getSteps = (status: string | undefined) => {
    const statuses = ['open', 'accepted', 'on-the-way', 'in-progress', 'waiting-payment', 'completed'];
    const normalizedStatus = status === 'ontheway' ? 'on-the-way' :
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
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={WorkEzTheme.colors.primary} />
            <Text style={styles.loadingText}>Carregando status do serviço...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <>
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
                    onPress={() => router.push(`/client/chat/${service.professional?.id}`)}
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
});
