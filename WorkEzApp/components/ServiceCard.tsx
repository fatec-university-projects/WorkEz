import { Clock, MapPin, Navigation } from 'lucide-react-native';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { WorkEzTheme } from '../constants/theme';
import { useAppTheme } from '../contexts/ThemeContext';
import { formatDate } from '../utils/date';

interface ServiceCardProps {
  category: string;
  description: string;
  status: string;
  date: string;
  professional?: string;
  distanceKm?: number;
  estimatedDurationMinutes?: number;
  onClick?: () => void;
}

export function ServiceCard({
  category,
  description,
  status,
  date,
  professional,
  distanceKm,
  estimatedDurationMinutes,
  onClick,
}: ServiceCardProps) {
  const { isDark, colors } = useAppTheme();

  const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
    pending: { color: isDark ? '#FB923C' : '#EA580C', bg: 'rgba(234, 88, 12, 0.14)', label: 'Pendente' },
    open: { color: isDark ? '#38BDF8' : '#0284C7', bg: 'rgba(2, 132, 199, 0.14)', label: 'Aberto' },
    'under-negotiation': { color: isDark ? '#A78BFA' : '#7C3AED', bg: 'rgba(124, 58, 237, 0.16)', label: 'Em Leilão' },
    accepted: { color: isDark ? '#4ADE80' : '#16A34A', bg: 'rgba(22, 163, 74, 0.15)', label: 'Aceito' },
    confirmed: { color: isDark ? '#4ADE80' : '#16A34A', bg: 'rgba(22, 163, 74, 0.15)', label: 'Aceito' },
    'on-the-way': { color: isDark ? '#60A5FA' : '#2563EB', bg: 'rgba(37, 99, 235, 0.16)', label: 'A caminho' },
    'in-progress': { color: isDark ? '#38BDF8' : '#0284C7', bg: 'rgba(2, 132, 199, 0.15)', label: 'Em andamento' },
    'waiting-payment': { color: isDark ? '#FBBF24' : '#D97706', bg: 'rgba(217, 119, 6, 0.16)', label: 'Aguardando pagamento' },
    completed: { color: isDark ? '#2DD4BF' : '#0F766E', bg: 'rgba(15, 118, 110, 0.16)', label: 'Concluído' },
    cancelled: { color: colors.textSecondary, bg: 'rgba(148, 163, 184, 0.14)', label: 'Cancelado' },
  };

  const getNormalizedStatus = (rawStatus: string): string => {
    if (!rawStatus) return 'pending';
    const s = rawStatus.toLowerCase().replace(/[^a-z]/g, '');
    if (s === 'undernegotiation' || s === 'leilao' || s === 'emleilao' || s === 'negociacao') {
      return 'under-negotiation';
    }
    if (s === 'open' || s === 'aberto') {
      return 'open';
    }
    if (s === 'accepted' || s === 'aceito' || s === 'confirmed' || s === 'confirmado') {
      return 'accepted';
    }
    if (s === 'ontheway' || s === 'acaminho') {
      return 'on-the-way';
    }
    if (s === 'inprogress' || s === 'progress' || s === 'andamento' || s === 'emandamento') {
      return 'in-progress';
    }
    if (s === 'waitingpayment' || s === 'aguardandopagamento') {
      return 'waiting-payment';
    }
    if (s === 'completed' || s === 'concluido' || s === 'done' || s === 'finalizado') {
      return 'completed';
    }
    if (s === 'cancelled' || s === 'cancelado' || s === 'refused') {
      return 'cancelled';
    }
    return 'pending';
  };

  const normalizedStatus = getNormalizedStatus(status);
  const config = statusConfig[normalizedStatus] || statusConfig['pending'];

  return (
    <TouchableOpacity
      onPress={onClick}
      activeOpacity={0.8}
      style={[
        styles.cardContainer,
        {
          backgroundColor: colors.backgroundCard,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <Text style={[styles.categoryTitle, { color: colors.text }]}>{category}</Text>
          <Text style={[styles.descriptionText, { color: colors.textSecondary }]} numberOfLines={2}>
            {description}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
          <Text style={[styles.statusText, { color: config.color }]}>
            {config.label}
          </Text>
        </View>
      </View>

      {distanceKm !== undefined && distanceKm !== null && (
        <View style={styles.distanceBadge}>
          <Navigation size={13} color={isDark ? '#60A5FA' : '#2563EB'} />
          <Text style={[styles.distanceBadgeText, { color: isDark ? '#93C5FD' : '#1D4ED8' }]}>
            A {distanceKm.toFixed(1)} km de você{estimatedDurationMinutes ? ` • ~${estimatedDurationMinutes} min de trajeto` : ''}
          </Text>
        </View>
      )}

      <View style={styles.footerRow}>
        <View style={styles.footerItem}>
          <Clock size={16} color={colors.textSecondary} />
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            {formatDate(date)}
          </Text>
        </View>
        {professional && (
          <View style={styles.footerItem}>
            <MapPin size={16} color={colors.textSecondary} />
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>{professional}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: WorkEzTheme.borderRadius.xl,
    padding: WorkEzTheme.spacing.md,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  distanceBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
  },
  categoryTitle: {
    ...WorkEzTheme.typography.base,
    fontWeight: WorkEzTheme.typography.fontWeight.semibold,
  },
  descriptionText: {
    ...WorkEzTheme.typography.sm,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: WorkEzTheme.borderRadius.full,
    marginLeft: WorkEzTheme.spacing.sm,
  },
  statusText: {
    ...WorkEzTheme.typography.xs,
    fontWeight: WorkEzTheme.typography.fontWeight.medium,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: WorkEzTheme.spacing.md,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    ...WorkEzTheme.typography.sm,
  },
});
