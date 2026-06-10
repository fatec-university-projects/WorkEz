import { useRouter } from 'expo-router';
import { ProfessionalCard } from '../../components/ProfessionalCard';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { WorkEzTheme } from '../../constants/theme';
import { useFetch } from '../../hooks/useFetch';
import { useAuth } from '../../contexts/AuthContext';

interface FavoriteProfessional {
  id: string;
  name: string;
  photo: string;
  rating: number;
  servicesCompleted: number;
  specialties: string[];
  verified: boolean;
}

export default function Favorites() {
  const router = useRouter();
  const { user } = useAuth();

  const { data: favorites, loading, error, refetch } = useFetch<FavoriteProfessional[]>(
    user ? `/api/Customers/${user.id}/favorites` : null
  );

  const toggleFavorite = async (id: string) => {
    // Aqui no futuro chamaremos um endpoint como DELETE /api/Customers/{userId}/favorites/{id}
    // E depois refetch()
    await refetch();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Favoritos</Text>
        <Text style={styles.headerSubtitle}>Seus profissionais salvos</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={WorkEzTheme.colors.primary} />
            <Text style={styles.loadingText}>Carregando favoritos...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {favorites?.map((professional) => (
              <ProfessionalCard
                key={professional.id}
                name={professional.name}
                photo={professional.photo}
                rating={professional.rating}
                servicesCompleted={professional.servicesCompleted}
                specialties={professional.specialties}
                verified={professional.verified}
                isFavorite={true}
                onToggleFavorite={() => toggleFavorite(professional.id)}
                onPress={() => router.push(`/client/professional/${professional.id}`)}
              />
            ))}

            {(!favorites || favorites.length === 0) && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>Nenhum favorito ainda</Text>
                <Text style={styles.emptyText}>Salve profissionais que você gostou para chamá-los novamente</Text>
              </View>
            )}
          </View>
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
  headerTitle: {
    ...WorkEzTheme.typography['2xl'],
    fontWeight: WorkEzTheme.typography.fontWeight.bold,
    color: WorkEzTheme.colors.text,
  },
  headerSubtitle: {
    ...WorkEzTheme.typography.sm,
    color: WorkEzTheme.colors.textSecondary,
    marginTop: 4,
  },
  scrollContent: {
    flexGrow: 1,
  },
  list: {
    padding: WorkEzTheme.spacing.lg,
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
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyTitle: {
    ...WorkEzTheme.typography.lg,
    color: WorkEzTheme.colors.text,
    marginBottom: 8,
  },
  emptyText: {
    color: WorkEzTheme.colors.textSecondary,
    textAlign: 'center',
  },
});
