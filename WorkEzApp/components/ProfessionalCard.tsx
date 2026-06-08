import { Star, MapPin, Heart, Check } from 'lucide-react-native';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { AntigravityTheme } from '../constants/theme';

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
          {verified && (
            <View style={styles.badgeContainer}>
              <Check size={12} color={AntigravityTheme.colors.text} />
            </View>
          )}
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.headerRow}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.nameText} numberOfLines={1}>{name}</Text>
              <View style={styles.ratingRow}>
                <View style={styles.ratingWrapper}>
                  <Star size={16} color={AntigravityTheme.colors.warning} fill={AntigravityTheme.colors.warning} />
                  <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
                </View>
                <Text style={styles.servicesText}>
                  {servicesCompleted} serviços
                </Text>
              </View>
            </View>

            {onToggleFavorite && (
              <TouchableOpacity
                onPress={onToggleFavorite}
                style={styles.favoriteButton}
              >
                <Heart
                  size={20}
                  color={isFavorite ? AntigravityTheme.colors.danger : AntigravityTheme.colors.textSecondary}
                  fill={isFavorite ? AntigravityTheme.colors.danger : 'transparent'}
                />
              </TouchableOpacity>
            )}
          </View>

          {distance && (
            <View style={styles.distanceRow}>
              <MapPin size={16} color={AntigravityTheme.colors.textSecondary} />
              <Text style={styles.distanceText}>{distance}</Text>
            </View>
          )}

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
    backgroundColor: AntigravityTheme.colors.backgroundCard,
    borderRadius: AntigravityTheme.borderRadius.xl,
    padding: AntigravityTheme.spacing.md,
    borderWidth: 1,
    borderColor: AntigravityTheme.colors.border,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: AntigravityTheme.spacing.md,
  },
  photoContainer: {
    position: 'relative',
  },
  photo: {
    width: 64,
    height: 64,
    borderRadius: AntigravityTheme.borderRadius.full,
    resizeMode: 'cover',
  },
  badgeContainer: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: AntigravityTheme.colors.primary,
    borderRadius: AntigravityTheme.borderRadius.full,
    padding: 4,
    borderWidth: 2,
    borderColor: AntigravityTheme.colors.backgroundCard,
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
    ...AntigravityTheme.typography.base,
    fontWeight: AntigravityTheme.typography.fontWeight.semibold,
    color: AntigravityTheme.colors.text,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AntigravityTheme.spacing.sm,
    marginTop: 4,
  },
  ratingWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    ...AntigravityTheme.typography.sm,
    fontWeight: AntigravityTheme.typography.fontWeight.medium,
    color: AntigravityTheme.colors.text,
  },
  servicesText: {
    ...AntigravityTheme.typography.sm,
    color: AntigravityTheme.colors.textSecondary,
  },
  favoriteButton: {
    padding: AntigravityTheme.spacing.sm,
    borderRadius: AntigravityTheme.borderRadius.md,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: AntigravityTheme.spacing.sm,
  },
  distanceText: {
    ...AntigravityTheme.typography.sm,
    color: AntigravityTheme.colors.textSecondary,
  },
  specialtiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AntigravityTheme.spacing.sm,
    marginTop: 12,
  },
  specialtyBadge: {
    backgroundColor: AntigravityTheme.colors.backgroundAlt,
    borderRadius: AntigravityTheme.borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  specialtyText: {
    ...AntigravityTheme.typography.xs,
    color: AntigravityTheme.colors.textSecondary,
  },
});
