import { Star, User } from 'lucide-react-native';
import { View, Text, Image, StyleSheet } from 'react-native';
import { WorkEzTheme } from '../constants/theme';
import { useAppTheme } from '../contexts/ThemeContext';
import { resolveImageUrl } from '../services/api';
import { formatDate } from '../utils/date';

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
  const { isDark, colors } = useAppTheme();
  let displayTags = tags && tags.length > 0 ? [...tags] : [];
  let displayComment = (comment || '').trim();

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

  displayComment = displayComment.replace(/^["'“”«»]+|["'“”«»]+$/g, '').trim();

  if (
    displayComment === 'Serviço avaliado pelo cliente.' ||
    displayComment === 'Nenhum comentário deixado.' ||
    displayComment.toLowerCase() === 'sem comentário' ||
    displayComment.toLowerCase() === 'sem comentario'
  ) {
    displayComment = '';
  }

  const hasExtraContent = Boolean(displayComment || displayTags.length > 0);

  return (
    <View
      style={[
        styles.cardContainer,
        {
          backgroundColor: colors.backgroundCard,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.contentRow}>
        {clientPhoto ? (
          <Image
            source={{ uri: resolveImageUrl(clientPhoto) || clientPhoto }}
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatar, { backgroundColor: colors.backgroundAlt, alignItems: 'center', justifyContent: 'center' }]}>
            <User size={24} color={colors.textSecondary} />
          </View>
        )}

        <View style={styles.infoContainer}>
          <View style={styles.headerRow}>
            <Text style={[styles.clientName, { color: colors.text }]}>{clientName}</Text>
            <Text style={[styles.dateText, { color: colors.textSecondary }]}>{formatDate(date)}</Text>
          </View>

          <View style={[styles.ratingRow, !hasExtraContent && { marginBottom: 0 }]}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={16}
                color={star <= rating ? colors.warning : colors.border}
                fill={star <= rating ? colors.warning : 'transparent'}
              />
            ))}
          </View>

          {displayTags.length > 0 && (
            <View style={styles.tagsContainer}>
              {displayTags.map((tag, index) => (
                <View
                  key={index}
                  style={[
                    styles.tagBadge,
                    isDark && { backgroundColor: 'rgba(37, 99, 235, 0.16)', borderColor: 'rgba(96, 165, 250, 0.35)' },
                  ]}
                >
                  <Text style={[styles.tagText, isDark && { color: '#93C5FD' }]}>
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {displayComment ? (
            <Text style={[styles.commentText, { color: colors.textSecondary }]}>{displayComment}</Text>
          ) : null}
        </View>
      </View>
    </View>
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
    flex: 1,
    marginRight: 8,
  },
  dateText: {
    ...WorkEzTheme.typography.xs,
    flexShrink: 0,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  commentText: {
    ...WorkEzTheme.typography.sm,
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
