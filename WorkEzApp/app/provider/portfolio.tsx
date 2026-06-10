import { useRouter } from 'expo-router';
import { ArrowLeft, Plus } from 'lucide-react-native';
import { Button } from '../../components/Button';
import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { WorkEzTheme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useFetch } from '../../hooks/useFetch';

export default function Portfolio() {
  const router = useRouter();
  const { user } = useAuth();

  const { data: images, loading, error } = useFetch<string[]>(
    user ? `/api/ServiceProviders/${user.id}/portfolio` : null
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
          <Text style={styles.headerTitle}>Portfólio</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Button
          fullWidth
          style={styles.addButton}
          onPress={() => { /* Implementar upload */ }}
        >
          <View style={styles.btnContent}>
            <Plus size={20} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.btnText}>Adicionar trabalho</Text>
          </View>
        </Button>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={WorkEzTheme.colors.primary} />
            <Text style={styles.loadingText}>Carregando portfólio...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {images?.map((img, i) => (
              <View key={i} style={styles.imgWrapper}>
                <Image source={{ uri: img }} style={styles.image} />
              </View>
            ))}
            {(!images || images.length === 0) && (
              <Text style={styles.emptyText}>Nenhum trabalho no portfólio.</Text>
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
  addButton: {
    marginBottom: 16,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    ...WorkEzTheme.typography.base,
    color: '#FFF',
    fontWeight: WorkEzTheme.typography.fontWeight.medium,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  imgWrapper: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: WorkEzTheme.borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
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
  emptyText: {
    color: WorkEzTheme.colors.textSecondary,
    ...WorkEzTheme.typography.sm,
    fontStyle: 'italic',
    textAlign: 'center',
    width: '100%',
    marginTop: 24,
  },
});
