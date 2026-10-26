import { useMemo, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Star } from 'lucide-react-native';
import { RatingCard } from '../../components/RatingCard';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { WorkEzTheme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../utils/date';
import { useAppTheme } from '../../contexts/ThemeContext';
import { useFetch } from '../../hooks/useFetch';
import { ScreenHeader } from '../../components/ScreenHeader';

interface Rating {
  id: string;
  clientName: string;
  clientPhoto?: string;
  rating: number;
  comment: string;
  date: string;
  tags?: string[];
}

interface RatingsData {
  average: number;
  total: number;
  ratings: Rating[];
}

export default function ReceivedRatings() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useAppTheme();

  const { data: rawReviews, loading, error, refetch } = useFetch<any[]>(
    user ? `/api/Reviews/by-user/${user.id}` : null
  );

  useFocusEffect(
    useCallback(() => {
      if (user) {
        refetch();
      }
    }, [user, refetch])
  );

  const ratingsData: RatingsData | null = useMemo(() => {
    if (!rawReviews) return null;

    const total = rawReviews.length;
    const sum = rawReviews.reduce((acc, curr) => acc + (curr.rating || 0), 0);
    const average = total > 0 ? sum / total : 0;

    const ratings: Rating[] = rawReviews.map((rev, index) => {
      const formattedDate = rev.createdAt ? formatDate(rev.createdAt) : 'Recentemente';

      return {
        id: rev.id || String(index),
        clientName: rev.clientName || 'Cliente',
        clientPhoto: rev.clientPhoto || undefined,
        rating: rev.rating || 0,
        comment: rev.comment || '',
        date: formattedDate,
        tags: rev.tags || []
      };
    });

    return {
      average,
      total,
      ratings
    };
  }, [rawReviews]);

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundAlt }]}>
      <ScreenHeader title="Avaliações" showBack />

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Carregando avaliações...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          </View>
        ) : (
          <>
            <View style={[styles.summaryCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
              <View style={styles.summaryRow}>
                <Star size={32} color="#FBBF24" fill="#FBBF24" />
                <Text style={[styles.summaryAverage, { color: colors.text }]}>{ratingsData?.average?.toFixed(1) || '0.0'}</Text>
              </View>
              <Text style={[styles.summaryTotal, { color: colors.textSecondary }]}>{ratingsData?.total || 0} avaliações</Text>
            </View>

            <View style={styles.list}>
              {ratingsData?.ratings?.map((item) => (
                <RatingCard
                  key={item.id}
                  clientName={item.clientName}
                  clientPhoto={item.clientPhoto}
                  rating={item.rating}
                  comment={item.comment}
                  date={item.date}
                  tags={item.tags}
                />
              ))}

              {(!ratingsData?.ratings || ratingsData.ratings.length === 0) && (
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Você ainda não possui avaliações.</Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: WorkEzTheme.spacing.lg,
  },
  summaryCard: {
    borderRadius: WorkEzTheme.borderRadius['2xl'],
    padding: WorkEzTheme.spacing.xl,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  summaryAverage: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  summaryTotal: {
    ...WorkEzTheme.typography.base,
  },
  list: {
    gap: 12,
  },
  centerContainer: {
    padding: 48,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
  },
  errorText: {
    textAlign: 'center',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    ...WorkEzTheme.typography.base,
    fontStyle: 'italic',
  },
});
