import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle, Circle, MessageCircle, Star } from 'lucide-react-native';
import { Button } from '../../../components/Button';
import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { WorkEzTheme } from '../../../constants/theme';
import { useFetch } from '../../../hooks/useFetch';

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
  status: 'accepted' | 'on-the-way' | 'in-progress' | 'waiting-payment' | 'completed';
  professional: Professional;
}

export default function ServiceTracking() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const { data: service, loading, error } = useFetch<ServiceData>(
    id ? `/api/Services/${id}` : null
  );

  const getSteps = (status: string | undefined) => {
    const statuses = ['accepted', 'on-the-way', 'in-progress', 'waiting-payment', 'completed'];
    const currentIndex = status ? statuses.indexOf(status) : -1;

    return [
      { label: 'Chamado aceito', completed: currentIndex >= 0 },
      { label: 'Profissional a caminho', completed: currentIndex >= 1 },
      { label: 'Serviço em andamento', completed: currentIndex >= 2 },
      { label: 'Aguardando pagamento', completed: currentIndex >= 3 },
      { label: 'Concluído', completed: currentIndex >= 4 },
    ];
  };

  const steps = getSteps(service?.status);

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
                      {index === 2 && step.completed && service?.status === 'in-progress' && (
                        <Text style={styles.stepSubtext}>
                          Serviço iniciado recentemente
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Profissional</Text>
              <View style={styles.proRow}>
                <Image
                  source={{ uri: service?.professional?.photo || "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop" }}
                  style={styles.proAvatar}
                />
                <View style={styles.proInfo}>
                  <Text style={styles.proName}>{service?.professional?.name || 'Profissional'}</Text>
                  <Text style={styles.proDetails}>
                    {service?.category || 'Serviço'} • <Star size={16} color={WorkEzTheme.colors.warning} /> {service?.professional?.rating || 'N/A'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.messageButton}
                  onPress={() => router.push(`/client/chat/${service?.professional?.id || 1}`)}
                >
                  <MessageCircle size={20} color={WorkEzTheme.colors.primary} />
                </TouchableOpacity>
              </View>
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

            <Button
              variant="secondary"
              fullWidth
              onPress={() => router.push(`/cancel/${id}`)}
            >
              Cancelar serviço
            </Button>
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
    borderRadius: WorkEzTheme.borderRadius.2xl,
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
