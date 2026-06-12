import { useMemo, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { DollarSign, Star, Briefcase } from 'lucide-react-native';
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { WorkEzTheme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useFetch } from '../../hooks/useFetch';

export default function ProviderHome() {
  const router = useRouter();
  const { user } = useAuth();

  const { data: rawProvider, refetch: refetchProvider } = useFetch<any>(
    user ? `/api/ServiceProviders/by-user/${user.id}` : null
  );

  const { data: services, loading, error, refetch: refetchServices } = useFetch<any[]>(
    user ? `/api/Services/by-provider-user/${user.id}` : null
  );

  useFocusEffect(
    useCallback(() => {
      if (user) {
        refetchProvider();
        refetchServices();
      }
    }, [user, refetchProvider, refetchServices])
  );

  const stats = useMemo(() => {
    if (!services) {
      return {
        monthlyEarnings: 0,
        availableBalance: 0,
        averageRating: rawProvider?.averageRating ?? 5.0,
        completedCount: 0
      };
    }

    const completed = services.filter(s => s.status === 'completed');
    const waitingPayment = services.filter(s => s.status === 'waiting-payment');

    // Saldo disponível: saldo obtido a partir dos serviços pagos (completed)
    const availableBalance = completed.reduce((sum, s) => sum + (s.price || 0), 0);

    // Ganhos do mês: soma de todos os trabalhos (concluídos e aguardando pagamento)
    const monthlyEarnings = services
      .filter(s => s.status === 'completed' || s.status === 'waiting-payment')
      .reduce((sum, s) => sum + (s.price || 0), 0);

    // Serviços concluídos: quantidade de serviços concluídos ou em aguardando pagamento
    const completedCount = completed.length + waitingPayment.length;

    return {
      monthlyEarnings,
      availableBalance,
      averageRating: rawProvider?.averageRating ?? 5.0,
      completedCount
    };
  }, [services, rawProvider]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.headerBackground}>
        <Text style={styles.greetingText}>
          Olá, {user?.name?.split(' ')[0] || 'Prestador'}! 👋
        </Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <View style={styles.statIconRow}>
            <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(38, 255, 245, 0.1)' }]}>
              <DollarSign size={16} color={WorkEzTheme.colors.primary} />
            </View>
          </View>
          {loading ? (
            <ActivityIndicator size="small" color={WorkEzTheme.colors.primary} style={{ alignSelf: 'flex-start', marginVertical: 4 }} />
          ) : (
            <Text style={styles.statValue}>
              R$ {stats.monthlyEarnings.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          )}
          <Text style={styles.statLabel}>Ganhos do mês</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIconRow}>
            <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(37, 99, 235, 0.1)' }]}>
              <DollarSign size={16} color="#2563EB" />
            </View>
          </View>
          {loading ? (
            <ActivityIndicator size="small" color="#2563EB" style={{ alignSelf: 'flex-start', marginVertical: 4 }} />
          ) : (
            <Text style={styles.statValue}>
              R$ {stats.availableBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          )}
          <Text style={styles.statLabel}>Saldo disponível</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIconRow}>
            <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(251, 191, 36, 0.1)' }]}>
              <Star size={16} color={WorkEzTheme.colors.warning} />
            </View>
          </View>
          {loading ? (
            <ActivityIndicator size="small" color={WorkEzTheme.colors.warning} style={{ alignSelf: 'flex-start', marginVertical: 4 }} />
          ) : (
            <Text style={styles.statValue}>
              {stats.averageRating.toFixed(1)}
            </Text>
          )}
          <Text style={styles.statLabel}>Nota média</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIconRow}>
            <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(38, 255, 245, 0.1)' }]}>
              <Briefcase size={16} color={WorkEzTheme.colors.primary} />
            </View>
          </View>
          {loading ? (
            <ActivityIndicator size="small" color={WorkEzTheme.colors.primary} style={{ alignSelf: 'flex-start', marginVertical: 4 }} />
          ) : (
            <Text style={styles.statValue}>
              {stats.completedCount}
            </Text>
          )}
          <Text style={styles.statLabel}>Serviços concluídos</Text>
        </View>
      </View>

      <View style={styles.sectionContainerBottom}>
        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>Dica profissional 💡</Text>
          <Text style={styles.tipDescription}>
            Profissionais que mantêm seus dados e especialidades atualizados recebem 40% mais chamados.
          </Text>
          <Pressable
            onPress={() => router.push('/provider/settings')}
            style={styles.tipButton}
          >
            <Text style={styles.tipButtonText}>Atualizar perfil</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: WorkEzTheme.spacing.xl,
  },
  headerBackground: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  greetingText: {
    ...WorkEzTheme.typography.xl,
    fontWeight: WorkEzTheme.typography.fontWeight.bold,
    color: '#FFFFFF',
    marginBottom: 0,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    marginTop: 24,
    gap: 12,
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: WorkEzTheme.colors.backgroundCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: WorkEzTheme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    width: '48%',
  },
  statIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    ...WorkEzTheme.typography.lg,
    fontWeight: WorkEzTheme.typography.fontWeight.bold,
    color: WorkEzTheme.colors.text,
    marginVertical: 2,
  },
  statLabel: {
    ...WorkEzTheme.typography.sm,
    color: WorkEzTheme.colors.textSecondary,
  },
  sectionContainerBottom: {
    paddingHorizontal: 24,
    marginTop: 24,
    marginBottom: 32,
  },
  tipCard: {
    backgroundColor: '#2563EB',
    borderRadius: 16,
    padding: 20,
  },
  tipTitle: {
    fontWeight: WorkEzTheme.typography.fontWeight.semibold,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  tipDescription: {
    ...WorkEzTheme.typography.sm,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
  },
  tipButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  tipButtonText: {
    ...WorkEzTheme.typography.sm,
    fontWeight: WorkEzTheme.typography.fontWeight.medium,
    color: '#FFFFFF',
  },
});
