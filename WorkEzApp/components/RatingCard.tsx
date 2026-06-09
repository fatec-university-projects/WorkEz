import { Star } from 'lucide-react-native';
import { View, Text, Image, StyleSheet } from 'react-native';
import { WorkEzTheme } from '../constants/theme';

interface RatingCardProps {
  clientName: string;
  clientPhoto: string;
  rating: number;
  comment: string;
  date: string;
  tags?: string[];
}

export function RatingCard({
  clientName,
  clientPhoto,
  rating,
  comment,
  date,
  tags = [],
}: RatingCardProps) {
  return (
    <View style={styles.cardContainer}>
      <View style={styles.contentRow}>
        <Image
          source={{ uri: clientPhoto }}
          style={styles.avatar}
        />

        <View style={styles.infoContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.clientName}>{clientName}</Text>
            <Text style={styles.dateText}>{date}</Text>
          </View>

          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={16}
                color={star <= rating ? WorkEzTheme.colors.warning : WorkEzTheme.colors.border}
                fill={star <= rating ? WorkEzTheme.colors.warning : 'transparent'}
              />
            ))}
          </View>

          <Text style={styles.commentText}>{comment}</Text>

          {tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {tags.map((tag, index) => (
                <View key={index} style={styles.tagBadge}>
                  <Text style={styles.tagText}>
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
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
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: WorkEzTheme.borderRadius.full,
    resizeMode: 'cover',
  },
  infoContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  clientName: {
    ...WorkEzTheme.typography.base,
    fontWeight: WorkEzTheme.typography.fontWeight.medium,
    color: WorkEzTheme.colors.text,
  },
  dateText: {
    ...WorkEzTheme.typography.xs,
    color: WorkEzTheme.colors.textSecondary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  commentText: {
    ...WorkEzTheme.typography.sm,
    color: WorkEzTheme.colors.textSecondary,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagBadge: {
    backgroundColor: 'rgba(38, 255, 245, 0.1)', // Primary with opacity
    borderRadius: WorkEzTheme.borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    ...WorkEzTheme.typography.xs,
    color: WorkEzTheme.colors.primary,
  },
});
