import { useMemo, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { DollarSign, Star, Briefcase, TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import {
  View, Text, Pressable, StyleSheet, ScrollView,
  ActivityIndicator, TouchableOpacity
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { WorkEzTheme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useFetch } from '../../hooks/useFetch';

interface WeeklySummary {
  completedServices: number;
  acceptanceRate: number;
  averageRating: number;
  growthRate: number;
  performanceTitle: string;
  performanceSubtitle: string;
  trendType?: 'positive' | 'negative' | 'neutral' | 'stable';
}

export default function ProviderHome() {
  const router = useRouter();
  const { user } = useAuth();

  const { data: rawProvider, refetch: refetchProvider } = useFetch<any>(
    user ? `/api/ServiceProviders/by-user/${user.id}` : null
  );

  const { data: services, loading, refetch: refetchServices } = useFetch<any[]>(
    user ? `/api/Services/by-provider-user/${user.id}` : null
  );

  const { data: weeklySummary, refetch: refetchWeeklySummary } = useFetch<WeeklySummary>(
    user ? `/api/ServiceProviders/by-user/${user.id}/weekly-summary` : null
  );

  useFocusEffect(
    useCallback(() => {
      if (user) {
        refetchProvider();
        refetchServices();
        refetchWeeklySummary();
      }
    }, [user, refetchProvider, refetchServices, refetchWeeklySummary])
  );

  const stats = useMemo(() => {
    if (!services) {
      return {
        monthlyEarnings: 0,
        availableBalance: 0,
        averageRating: rawProvider?.averageRating ?? 5.0,
        completedCount: 0,
        weekCompleted: 0,
        acceptanceRate: 0,
      };
    }

    const completed = services.filter(s => s.status === 'completed');
    const waitingPayment = services.filter(s => s.status === 'waiting-payment');

    const availableBalance = completed.reduce((sum, s) => sum + (s.price || 0), 0);
    const monthlyEarnings = services
      .filter(s => s.status === 'completed' || s.status === 'waiting-payment')
      .reduce((sum, s) => sum + (s.price || 0), 0);
    const completedCount = completed.length + waitingPayment.length;

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekCompleted = completed.filter(s => {
      const d = s.completedAt ? new Date(s.completedAt) : null;
      return d && d >= oneWeekAgo;
    }).length;

    const total = services.length;
    const accepted = services.filter(s => s.status !== 'cancelled').length;
    const acceptanceRate = total > 0 ? Math.round((accepted / total) * 100) : 0;

    return {
      monthlyEarnings,
      availableBalance,
      averageRating: rawProvider?.averageRating ?? 5.0,
      completedCount,
      weekCompleted,
      acceptanceRate,
    };
  }, [services, rawProvider]);

  const trendConfig = useMemo(() => {
    const trend = weeklySummary?.trendType ?? (stats.weekCompleted > 0 ? 'positive' : 'neutral');
    switch (trend) {
      case 'positive':
        return {
          icon: <TrendingUp size={18} color="#06B6D4" />,
          bgColor: 'rgba(6, 182, 212, 0.12)',
          defaultTitle: 'Ótimo desempenho!',
          defaultSub: 'Você cresceu esta semana',
        };
      case 'negative':
        return {
          icon: <TrendingDown size={18} color="#EF4444" />,
          bgColor: 'rgba(239, 68, 68, 0.12)',
          defaultTitle: 'Desempenho em queda',
          defaultSub: 'Abaixo da semana anterior',
        };
      case 'stable':
        return {
          icon: <Minus size={18} color="#2563EB" />,
          bgColor: 'rgba(37, 99, 235, 0.12)',
          defaultTitle: 'Desempenho constante!',
          defaultSub: 'Você manteve o ritmo da semana passada',
        };
      case 'neutral':
      default:
        return {
          icon: <Minus size={18} color="#64748B" />,
          bgColor: 'rgba(100, 116, 139, 0.12)',
          defaultTitle: 'Sem atividades recentes',
          defaultSub: 'Aceite chamados para começar a crescer',
        };
    }
  }, [weeklySummary, stats.weekCompleted]);

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

      {/* ── Header Gradient ── */}
      <LinearGradient
        colors={['#06B6D4', '#2563EB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.greetingText}>
          Olá, {user?.name?.split(' ')[0] || 'Prestador'}! 👋
        </Text>
      </LinearGradient>

      {/* ── Stats Grid ── */}
      <View style={styles.statsGrid}>

        <View style={styles.statCard}>
          <View style={[styles.iconBadge, { backgroundColor: 'rgba(6, 182, 212, 0.12)' }]}>
            <DollarSign size={16} color="#06B6D4" />
          </View>
          {loading ? (
            <ActivityIndicator size="small" color="#06B6D4" style={styles.loader} />
          ) : (
            <Text style={styles.statValue}>R$ {formatCurrency(stats.monthlyEarnings)}</Text>
          )}
          <Text style={styles.statLabel}>Ganhos do mês</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.iconBadge, { backgroundColor: 'rgba(37, 99, 235, 0.12)' }]}>
            <DollarSign size={16} color="#2563EB" />
          </View>
          {loading ? (
            <ActivityIndicator size="small" color="#2563EB" style={styles.loader} />
          ) : (
            <Text style={styles.statValue}>R$ {formatCurrency(stats.availableBalance)}</Text>
          )}
          <Text style={styles.statLabel}>Saldo disponível</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.iconBadge, { backgroundColor: 'rgba(251, 191, 36, 0.12)' }]}>
            <Star size={16} color="#F59E0B" />
          </View>
          {loading ? (
            <ActivityIndicator size="small" color="#F59E0B" style={styles.loader} />
          ) : (
            <Text style={styles.statValue}>{stats.averageRating.toFixed(1)}</Text>
          )}
          <Text style={styles.statLabel}>Nota média</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.iconBadge, { backgroundColor: 'rgba(6, 182, 212, 0.12)' }]}>
            <Briefcase size={16} color="#06B6D4" />
          </View>
          {loading ? (
            <ActivityIndicator size="small" color="#06B6D4" style={styles.loader} />
          ) : (
            <Text style={styles.statValue}>{stats.completedCount}</Text>
          )}
          <Text style={styles.statLabel}>Serviços concluídos</Text>
        </View>

      </View>

      {/* ── Resumo da Semana ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Resumo da semana</Text>

        <View style={styles.summaryCard}>
          {/* Performance Banner */}
          <View style={styles.performanceBanner}>
            <View style={[styles.iconBadge, { backgroundColor: trendConfig.bgColor }]}>
              {trendConfig.icon}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.performanceTitle}>
                {weeklySummary?.performanceTitle ?? trendConfig.defaultTitle}
              </Text>
              <Text style={styles.performanceSub}>
                {weeklySummary?.performanceSubtitle ?? trendConfig.defaultSub}
              </Text>
            </View>
          </View>

          {/* Stats Rows */}
          <View style={styles.statsRows}>
            <View style={styles.statsRow}>
              <Text style={styles.rowLabel}>Serviços concluídos</Text>
              <Text style={styles.rowValue}>
                {weeklySummary?.completedServices ?? stats.weekCompleted}
              </Text>
            </View>
            <View style={styles.statsRow}>
              <Text style={styles.rowLabel}>Taxa de aceitação</Text>
              <Text style={[styles.rowValue, { color: '#2563EB' }]}>
                {weeklySummary?.acceptanceRate ?? stats.acceptanceRate}%
              </Text>
            </View>
            <View style={styles.statsRow}>
              <Text style={styles.rowLabel}>Avaliação média</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={styles.rowValue}>
                  {(weeklySummary?.averageRating ?? stats.averageRating).toFixed(1)}
                </Text>
                <Text style={{ color: '#F59E0B' }}>⭐</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* ── Dica Profissional ── */}
      <View style={styles.tipSection}>
        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>Dica profissional 💡</Text>
          <Text style={styles.tipDescription}>
            Profissionais que mantêm fotos atualizadas no portfólio recebem 40% mais chamados.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/provider/portfolio')}
            style={styles.tipButton}
            activeOpacity={0.85}
          >
            <Text style={styles.tipButtonText}>Atualizar portfólio</Text>
          </TouchableOpacity>
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
    paddingBottom: 32,
  },

  /* Header */
  header: {
    paddingHorizontal: 24,
    paddingTop: 52,
    paddingBottom: 32,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  greetingText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 0,
  },

  /* Stats Grid */
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 12,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    width: '47%',
    gap: 6,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loader: {
    alignSelf: 'flex-start',
    marginVertical: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },

  /* Section */
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    overflow: 'hidden',
  },
  performanceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  performanceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  performanceSub: {
    fontSize: 12,
    color: '#06B6D4',
    fontWeight: '500',
    marginTop: 1,
  },
  statsRows: {
    padding: 16,
    gap: 14,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  rowValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },

  /* Tip Card */
  tipSection: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  tipCard: {
    backgroundColor: '#2563EB',
    borderRadius: 16,
    padding: 20,
    gap: 8,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tipDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.88)',
    lineHeight: 20,
  },
  tipButton: {
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  tipButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

