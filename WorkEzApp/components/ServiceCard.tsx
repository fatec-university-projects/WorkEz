import { Clock, MapPin, Navigation } from 'lucide-react-native';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { WorkEzTheme } from '../constants/theme';

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
  onClick
}: ServiceCardProps) {
  const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
    'pending': { color: '#EA580C', bg: 'rgba(234, 88, 12, 0.1)', label: 'Pendente' },
    'open': { color: '#0284C7', bg: 'rgba(2, 132, 199, 0.1)', label: 'Aberto' },
    'under-negotiation': { color: '#7C3AED', bg: 'rgba(124, 58, 237, 0.12)', label: 'Em Leilão' },
    'accepted': { color: '#16A34A', bg: 'rgba(22, 163, 74, 0.12)', label: 'Aceito' },
    'confirmed': { color: '#16A34A', bg: 'rgba(22, 163, 74, 0.12)', label: 'Aceito' },
    'on-the-way': { color: '#2563EB', bg: 'rgba(37, 99, 235, 0.12)', label: 'A caminho' },
    'in-progress': { color: '#0284C7', bg: 'rgba(2, 132, 199, 0.12)', label: 'Em andamento' },
    'waiting-payment': { color: '#D97706', bg: 'rgba(217, 119, 6, 0.12)', label: 'Aguardando pagamento' },
    'completed': { color: '#0F766E', bg: 'rgba(15, 118, 110, 0.12)', label: 'Concluído' },
    'cancelled': { color: WorkEzTheme.colors.textSecondary, bg: 'rgba(148, 163, 184, 0.1)', label: 'Cancelado' },
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
      style={styles.cardContainer}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <Text style={styles.categoryTitle}>{category}</Text>
          <Text style={styles.descriptionText} numberOfLines={2}>{description}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
          <Text style={[styles.statusText, { color: config.color }]}>
            {config.label}
          </Text>
        </View>
      </View>

      {distanceKm !== undefined && distanceKm !== null && (
        <View style={styles.distanceBadge}>
          <Navigation size={13} color="#2563EB" />
          <Text style={styles.distanceBadgeText}>
            A {distanceKm.toFixed(1)} km de você{estimatedDurationMinutes ? ` • ~${estimatedDurationMinutes} min de trajeto` : ''}
          </Text>
        </View>
      )}

      <View style={styles.footerRow}>
        <View style={styles.footerItem}>
          <Clock size={16} color={WorkEzTheme.colors.textSecondary} />
          <Text style={styles.footerText}>
            {(() => {
              if (!date) return '';
              const trimmed = String(date).trim();
              if (/^\d{2}-\d{2}-\d{4}/.test(trimmed)) {
                return trimmed.replace(/-/g, '/');
              }
              if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
                const parts = trimmed.split('T')[0].split('-');
                return `${parts[2]}/${parts[1]}/${parts[0]}`;
              }
              return trimmed;
            })()}
          </Text>
        </View>
        {professional && (
          <View style={styles.footerItem}>
            <MapPin size={16} color={WorkEzTheme.colors.textSecondary} />
            <Text style={styles.footerText}>{professional}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: WorkEzTheme.colors.backgroundCard,
    borderRadius: WorkEzTheme.borderRadius.xl,
    padding: WorkEzTheme.spacing.md,
    borderWidth: 1,
    borderColor: WorkEzTheme.colors.border,
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
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  distanceBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1D4ED8',
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
    color: WorkEzTheme.colors.text,
  },
  descriptionText: {
    ...WorkEzTheme.typography.sm,
    color: WorkEzTheme.colors.textSecondary,
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
    color: WorkEzTheme.colors.textSecondary,
  },
});
