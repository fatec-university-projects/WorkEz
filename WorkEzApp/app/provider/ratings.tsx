import { useRouter } from 'expo-router';
import { ArrowLeft, Star } from 'lucide-react-native';
import { RatingCard } from '../../components/RatingCard';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { WorkEzTheme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useFetch } from '../../hooks/useFetch';

interface Rating {
  id: string;
  clientName: string;
  clientPhoto: string;
  rating: number;
  comment: string;
  date: string;
  tags: string[];
}

interface RatingsData {
  average: number;
  total: number;
  ratings: Rating[];
}

export default function ReceivedRatings() {
  const router = useRouter();
  const { user } = useAuth();

  const { data: ratingsData, loading, error } = useFetch<RatingsData>(
    user ? `/api/ServiceProviders/${user.id}/ratings` : null
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.8}
          >
            <ArrowLeft size={24} color={WorkEzTheme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Avaliações</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={WorkEzTheme.colors.primary} />
            <Text style={styles.loadingText}>Carregando avaliações...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <>
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Star size={32} color="#FBBF24" fill="#FBBF24" />
                <Text style={styles.summaryAverage}>{ratingsData?.average?.toFixed(1) || '0.0'}</Text>
              </View>
              <Text style={styles.summaryTotal}>{ratingsData?.total || 0} avaliações</Text>
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
                  <Text style={styles.emptyText}>Você ainda não possui avaliações.</Text>
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
    backgroundColor: WorkEzTheme.colors.backgroundAlt,
  },
  header: {
    backgroundColor: WorkEzTheme.colors.backgroundCard,
    paddingHorizontal: WorkEzTheme.spacing.lg,
    paddingVertical: WorkEzTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: WorkEzTheme.colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: WorkEzTheme.spacing.sm,
    backgroundColor: WorkEzTheme.colors.backgroundAlt,
    borderRadius: WorkEzTheme.borderRadius.lg,
  },
  headerTitle: {
    ...WorkEzTheme.typography.xl,
    fontWeight: WorkEzTheme.typography.fontWeight.semibold,
    color: WorkEzTheme.colors.text,
  },
  content: {
    padding: WorkEzTheme.spacing.lg,
  },
  summaryCard: {
    backgroundColor: WorkEzTheme.colors.backgroundCard,
    borderRadius: WorkEzTheme.borderRadius['2xl'],
    padding: WorkEzTheme.spacing.xl,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: WorkEzTheme.colors.border,
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
    color: WorkEzTheme.colors.text,
  },
  summaryTotal: {
    ...WorkEzTheme.typography.base,
    color: WorkEzTheme.colors.textSecondary,
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
    color: WorkEzTheme.colors.textSecondary,
  },
  errorText: {
    color: WorkEzTheme.colors.danger,
    textAlign: 'center',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    ...WorkEzTheme.typography.base,
    color: WorkEzTheme.colors.textSecondary,
    fontStyle: 'italic',
  },
});
