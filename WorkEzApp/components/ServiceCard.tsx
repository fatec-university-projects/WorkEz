import { Clock, MapPin } from 'lucide-react-native';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AntigravityTheme } from '../constants/theme';

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
    'completed': { color: AntigravityTheme.colors.primary, bg: 'rgba(38, 255, 245, 0.1)', label: 'Concluído' },
    'cancelled': { color: AntigravityTheme.colors.textSecondary, bg: 'rgba(148, 163, 184, 0.1)', label: 'Cancelado' },
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
          <Clock size={16} color={AntigravityTheme.colors.textSecondary} />
          <Text style={styles.footerText}>{date}</Text>
        </View>
        {professional && (
          <View style={styles.footerItem}>
            <MapPin size={16} color={AntigravityTheme.colors.textSecondary} />
            <Text style={styles.footerText}>{professional}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: AntigravityTheme.colors.backgroundCard,
    borderRadius: AntigravityTheme.borderRadius.xl,
    padding: AntigravityTheme.spacing.md,
    borderWidth: 1,
    borderColor: AntigravityTheme.colors.border,
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
    ...AntigravityTheme.typography.base,
    fontWeight: AntigravityTheme.typography.fontWeight.semibold,
    color: AntigravityTheme.colors.text,
  },
  descriptionText: {
    ...AntigravityTheme.typography.sm,
    color: AntigravityTheme.colors.textSecondary,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: AntigravityTheme.borderRadius.full,
    marginLeft: AntigravityTheme.spacing.sm,
  },
  statusText: {
    ...AntigravityTheme.typography.xs,
    fontWeight: AntigravityTheme.typography.fontWeight.medium,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AntigravityTheme.spacing.md,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    ...AntigravityTheme.typography.sm,
    color: AntigravityTheme.colors.textSecondary,
  },
});
