import { useState } from 'react';
import { useRouter } from 'expo-router';
import { DollarSign, Star, Briefcase, TrendingUp } from 'lucide-react-native';
import { View, Text, TouchableOpacity, Pressable, StyleSheet, ScrollView } from 'react-native';
import { WorkEzTheme } from '../../constants/theme';

export default function ProviderHome() {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(true);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.headerBackground}>
        <Text style={styles.greetingText}>
          Olá, Carlos! 👋
        </Text>

        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Você está</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setIsOnline(!isOnline)}
              style={[
                styles.toggleContainer,
                isOnline ? styles.toggleContainerActive : styles.toggleContainerInactive
              ]}
            >
              <View
                style={[
                  styles.toggleThumb,
                  isOnline ? styles.toggleThumbActive : styles.toggleThumbInactive
                ]}
              />
            </TouchableOpacity>
          </View>
          <Text style={[styles.statusText, !isOnline && styles.statusTextOffline]}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
          <Text style={styles.statusDescription}>
            {isOnline ? 'Pronto para receber chamados' : 'Você não receberá chamados'}
          </Text>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <View style={styles.statIconRow}>
            <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(38, 255, 245, 0.1)' }]}>
              <DollarSign size={16} color={WorkEzTheme.colors.primary} />
            </View>
          </View>
          <Text style={styles.statValue}>R$ 3.450</Text>
          <Text style={styles.statLabel}>Ganhos do mês</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIconRow}>
            <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(37, 99, 235, 0.1)' }]}>
              <DollarSign size={16} color="#2563EB" />
            </View>
          </View>
          <Text style={styles.statValue}>R$ 850</Text>
          <Text style={styles.statLabel}>Saldo disponível</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIconRow}>
            <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(251, 191, 36, 0.1)' }]}>
              <Star size={16} color={WorkEzTheme.colors.warning} />
            </View>
          </View>
          <Text style={styles.statValue}>4.9</Text>
          <Text style={styles.statLabel}>Nota média</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIconRow}>
            <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(38, 255, 245, 0.1)' }]}>
              <Briefcase size={16} color={WorkEzTheme.colors.primary} />
            </View>
          </View>
          <Text style={styles.statValue}>248</Text>
          <Text style={styles.statLabel}>Serviços concluídos</Text>
        </View>
      </View>

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>
          Resumo da semana
        </Text>

        <View style={styles.summaryCard}>
          <View style={styles.summaryHeaderRow}>
            <View style={[styles.summaryIconWrapper, { backgroundColor: 'rgba(38, 255, 245, 0.1)' }]}>
              <TrendingUp size={20} color={WorkEzTheme.colors.primary} />
            </View>
            <View style={styles.summaryHeaderText}>
              <Text style={styles.summaryTitle}>Ótimo desempenho!</Text>
              <Text style={styles.summarySubtitle}>Você cresceu 15% esta semana</Text>
            </View>
          </View>

          <View style={styles.summaryList}>
            <View style={styles.summaryListItem}>
              <Text style={styles.summaryListLabel}>Serviços concluídos</Text>
              <Text style={styles.summaryListValue}>12</Text>
            </View>
            <View style={styles.summaryListItem}>
              <Text style={styles.summaryListLabel}>Taxa de aceitação</Text>
              <Text style={styles.summaryListValue}>92%</Text>
            </View>
            <View style={styles.summaryListItem}>
              <Text style={styles.summaryListLabel}>Avaliação média</Text>
              <View style={styles.summaryRatingRow}>
                <Text style={styles.summaryListValue}>4.9</Text>
                <Star size={16} color={WorkEzTheme.colors.warning} fill={WorkEzTheme.colors.warning} />
              </View>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.sectionContainerBottom}>
        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>Dica profissional 💡</Text>
          <Text style={styles.tipDescription}>
            Profissionais que mantêm fotos atualizadas no portfólio recebem 40% mais chamados.
          </Text>
          <Pressable
            onPress={() => router.push('/provider/portfolio')}
            style={styles.tipButton}
          >
            <Text style={styles.tipButtonText}>Atualizar portfólio</Text>
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
    backgroundColor: '#2563EB', // For full effect you'd use expo-linear-gradient but standard RN doesn't support css gradients.
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  greetingText: {
    ...WorkEzTheme.typography.xl,
    fontWeight: WorkEzTheme.typography.fontWeight.bold,
    color: '#FFFFFF',
    marginBottom: 24,
  },
  statusCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusLabel: {
    color: 'rgba(255, 255, 255, 0.9)',
    ...WorkEzTheme.typography.sm,
  },
  toggleContainer: {
    width: 64,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    padding: 4,
  },
  toggleContainerActive: {
    backgroundColor: '#FFFFFF',
  },
  toggleContainerInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  toggleThumbActive: {
    backgroundColor: WorkEzTheme.colors.primary,
    alignSelf: 'flex-end',
  },
  toggleThumbInactive: {
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statusTextOffline: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  statusDescription: {
    color: 'rgba(255, 255, 255, 0.8)',
    ...WorkEzTheme.typography.sm,
    marginTop: 4,
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
    ...WorkEzTheme.typography.xl,
    fontWeight: WorkEzTheme.typography.fontWeight.bold,
    color: WorkEzTheme.colors.text,
  },
  statLabel: {
    ...WorkEzTheme.typography.sm,
    color: WorkEzTheme.colors.textSecondary,
  },
  sectionContainer: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  sectionTitle: {
    ...WorkEzTheme.typography.lg,
    fontWeight: WorkEzTheme.typography.fontWeight.semibold,
    color: WorkEzTheme.colors.text,
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: WorkEzTheme.colors.backgroundCard,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: WorkEzTheme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  summaryIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryHeaderText: {
    flex: 1,
  },
  summaryTitle: {
    fontWeight: WorkEzTheme.typography.fontWeight.semibold,
    color: WorkEzTheme.colors.text,
  },
  summarySubtitle: {
    ...WorkEzTheme.typography.sm,
    color: WorkEzTheme.colors.textSecondary,
  },
  summaryList: {
    gap: 8,
  },
  summaryListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryListLabel: {
    ...WorkEzTheme.typography.sm,
    color: WorkEzTheme.colors.textSecondary,
  },
  summaryListValue: {
    ...WorkEzTheme.typography.sm,
    fontWeight: WorkEzTheme.typography.fontWeight.medium,
    color: WorkEzTheme.colors.text,
  },
  summaryRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
