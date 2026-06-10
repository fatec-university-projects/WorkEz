import { Star, MapPin, Heart, Check } from 'lucide-react-native';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { WorkEzTheme } from '../constants/theme';

interface ProfessionalCardProps {
  name: string;
  photo: string;
  rating: number;
  servicesCompleted: number;
  distance?: string;
  specialties: string[];
  verified?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onPress?: () => void;
}

export function ProfessionalCard({
  name,
  photo,
  rating,
  servicesCompleted,
  distance,
  specialties,
  verified = false,
  isFavorite = false,
  onToggleFavorite,
  onPress,
}: ProfessionalCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={styles.cardContainer}
    >
      <View style={styles.contentRow}>
        <View style={styles.photoContainer}>
          <Image
            source={{ uri: photo }} // Assuming photo is a URL, changed from photo directly, though it depends if it's require()
            style={styles.photo}
          />
          {verified ? (
            <View style={styles.badgeContainer}>
              <Check size={12} color={WorkEzTheme.colors.text} />
            </View>
          ) : null}
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.headerRow}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.nameText} numberOfLines={1}>{name}</Text>
              <View style={styles.ratingRow}>
                <View style={styles.ratingWrapper}>
                  <Star size={16} color={WorkEzTheme.colors.warning} fill={WorkEzTheme.colors.warning} />
                  <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
                </View>
                <Text style={styles.servicesText}>
                  {servicesCompleted} serviços
                </Text>
              </View>
            </View>

            {onToggleFavorite ? (
              <TouchableOpacity
                onPress={onToggleFavorite}
                style={styles.favoriteButton}
              >
                <Heart
                  size={20}
                  color={isFavorite ? WorkEzTheme.colors.danger : WorkEzTheme.colors.textSecondary}
                  fill={isFavorite ? WorkEzTheme.colors.danger : 'transparent'}
                />
              </TouchableOpacity>
            ) : null}
          </View>

          {distance ? (
            <View style={styles.distanceRow}>
              <MapPin size={16} color={WorkEzTheme.colors.textSecondary} />
              <Text style={styles.distanceText}>{distance}</Text>
            </View>
          ) : null}

          <View style={styles.specialtiesContainer}>
            {specialties.slice(0, 2).map((specialty, index) => (
              <View key={index} style={styles.specialtyBadge}>
                <Text style={styles.specialtyText}>
                  {specialty}
                </Text>
              </View>
            ))}
          </View>
        </View>
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
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: WorkEzTheme.spacing.md,
  },
  photoContainer: {
    position: 'relative',
  },
  photo: {
    width: 64,
    height: 64,
    borderRadius: WorkEzTheme.borderRadius.full,
    resizeMode: 'cover',
  },
  badgeContainer: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: WorkEzTheme.colors.primary,
    borderRadius: WorkEzTheme.borderRadius.full,
    padding: 4,
    borderWidth: 2,
    borderColor: WorkEzTheme.colors.backgroundCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    flex: 1,
    minWidth: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerTextContainer: {
    flex: 1,
  },
  nameText: {
    ...WorkEzTheme.typography.base,
    fontWeight: WorkEzTheme.typography.fontWeight.semibold,
    color: WorkEzTheme.colors.text,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: WorkEzTheme.spacing.sm,
    marginTop: 4,
  },
  ratingWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    ...WorkEzTheme.typography.sm,
    fontWeight: WorkEzTheme.typography.fontWeight.medium,
    color: WorkEzTheme.colors.text,
  },
  servicesText: {
    ...WorkEzTheme.typography.sm,
    color: WorkEzTheme.colors.textSecondary,
  },
  favoriteButton: {
    padding: WorkEzTheme.spacing.sm,
    borderRadius: WorkEzTheme.borderRadius.md,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: WorkEzTheme.spacing.sm,
  },
  distanceText: {
    ...WorkEzTheme.typography.sm,
    color: WorkEzTheme.colors.textSecondary,
  },
  specialtiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: WorkEzTheme.spacing.sm,
    marginTop: 12,
  },
  specialtyBadge: {
    backgroundColor: WorkEzTheme.colors.backgroundAlt,
    borderRadius: WorkEzTheme.borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  specialtyText: {
    ...WorkEzTheme.typography.xs,
    color: WorkEzTheme.colors.textSecondary,
  },
});
