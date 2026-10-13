import { Star, User } from 'lucide-react-native';
import { View, Text, Image, StyleSheet } from 'react-native';
import { WorkEzTheme } from '../constants/theme';

interface RatingCardProps {
  clientName: string;
  clientPhoto?: string;
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
  let displayTags = tags && tags.length > 0 ? [...tags] : [];
  let displayComment = (comment || '').trim();

  // Extrai tags embutidas no formato [tag1, tag2] comentário
  const bracketMatch = displayComment.match(/^\[(.*?)\]\s*(.*)$/s);
  if (bracketMatch) {
    const extractedTags = bracketMatch[1]
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (displayTags.length === 0) {
      displayTags = extractedTags;
    }
    displayComment = bracketMatch[2].trim();
  }

  // Remove qualquer aspas residuais no início ou fim do comentário
  displayComment = displayComment.replace(/^["'“”«»]+|["'“”«»]+$/g, '').trim();

  return (
    <View style={styles.cardContainer}>
      <View style={styles.contentRow}>
        {clientPhoto ? (
          <Image
            source={{ uri: clientPhoto }}
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatar, { backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' }]}>
            <User size={24} color={WorkEzTheme.colors.textSecondary} />
          </View>
        )}

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

          {displayTags.length > 0 && (
            <View style={styles.tagsContainer}>
              {displayTags.map((tag, index) => (
                <View key={index} style={styles.tagBadge}>
                  <Text style={styles.tagText}>
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {displayComment ? (
            <Text style={styles.commentText}>{displayComment}</Text>
          ) : null}
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
    color: '#334155',
    lineHeight: 20,
    marginTop: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  tagBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: 12,
    color: '#1D4ED8',
    fontWeight: '600',
  },
});
