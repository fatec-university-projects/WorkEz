import { Clock, MapPin } from 'lucide-react-native';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { WorkEzTheme } from '../constants/theme';

interface ServiceCardProps {
  category: string;
  description: string;
  status: 'in-progress' | 'completed' | 'cancelled';
  date: string;
  professional?: string;
  onClick?: () => void;
}

export function ServiceCard({
  category,
  description,
  status,
  date,
  professional,
  onClick
}: ServiceCardProps) {
  const statusConfig = {
    'in-progress': { color: '#2563EB', bg: 'rgba(37, 99, 235, 0.1)', label: 'Em andamento' },
    'completed': { color: WorkEzTheme.colors.primary, bg: 'rgba(38, 255, 245, 0.1)', label: 'Concluído' },
    'cancelled': { color: WorkEzTheme.colors.textSecondary, bg: 'rgba(148, 163, 184, 0.1)', label: 'Cancelado' },
  };

  const config = statusConfig[status];

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

      <View style={styles.footerRow}>
        <View style={styles.footerItem}>
          <Clock size={16} color={WorkEzTheme.colors.textSecondary} />
          <Text style={styles.footerText}>{date}</Text>
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
