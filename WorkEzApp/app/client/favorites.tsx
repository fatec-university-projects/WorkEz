import { useRouter } from 'expo-router';
import { ProfessionalCard } from '../../components/ProfessionalCard';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useFetch } from '../../hooks/useFetch';
import { useAuth } from '../../contexts/AuthContext';
import { useAppTheme } from '../../contexts/ThemeContext';
import { ScreenHeader } from '../../components/ScreenHeader';

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
  const { colors } = useAppTheme();

  const { data: favorites, loading, error, refetch } = useFetch<FavoriteProfessional[]>(
    user ? `/api/Customers/${user.id}/favorites` : null
  );

  const toggleFavorite = async (id: string) => {
    await refetch();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundAlt }]}>
      <ScreenHeader title="Favoritos" subtitle="Seus profissionais salvos" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Carregando favoritos...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
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
                <Text style={[styles.emptyTitle, { color: colors.text }]}>Nenhum favorito ainda</Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Salve profissionais que você gostou para chamá-los novamente</Text>
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
  },
  scrollContent: {
    flexGrow: 1,
  },
  list: {
    padding: 24,
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
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
  },
});
