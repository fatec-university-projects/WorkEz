import { useRouter } from 'expo-router';
import { ArrowLeft, Wrench, Brush, Zap, Paintbrush, Hammer, Settings } from 'lucide-react-native';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { WorkEzTheme } from '../../constants/theme';
import { useFetch } from '../../hooks/useFetch';

interface Category {
  id: string;
  name: string;
  description?: string;
}

const CATEGORY_UI_MAP: Record<string, any> = {
  'Encanador': { icon: Wrench, bgColor: '#EFF6FF', borderColor: '#BFDBFE', iconColor: '#3B82F6' },
  'Eletricista': { icon: Zap, bgColor: '#FEFCE8', borderColor: '#FEF08A', iconColor: '#EAB308' },
  'Diarista': { icon: Brush, bgColor: '#FAF5FF', borderColor: '#E9D5FF', iconColor: '#A855F7' },
  'Pintor': { icon: Paintbrush, bgColor: '#F0FDF4', borderColor: '#BBF7D0', iconColor: '#22C55E' },
  'Montador': { icon: Hammer, bgColor: '#FFF7ED', borderColor: '#FED7AA', iconColor: '#F97316' },
  'Técnico geral': { icon: Settings, bgColor: '#FEF2F2', borderColor: '#FECACA', iconColor: '#EF4444' },
};

export default function SelectCategory() {
  const router = useRouter();

  const { data: categories, loading, error } = useFetch<Category[]>('/api/Categories');

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
          <Text style={styles.headerTitle}>
            Selecione o serviço
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={WorkEzTheme.colors.primary} />
            <Text style={styles.loadingText}>Carregando categorias...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          categories?.map((category) => {
            const uiConfig = CATEGORY_UI_MAP[category.name] || { icon: Settings, bgColor: '#F1F5F9', borderColor: '#E2E8F0', iconColor: '#64748B' };
            const Icon = uiConfig.icon;
            return (
              <TouchableOpacity
                key={category.id}
                onPress={() => router.push({ pathname: '/client/describe', params: { category: category.name, categoryId: category.id } } as any)}
                style={[
                  styles.categoryCard,
                  { backgroundColor: uiConfig.bgColor, borderColor: uiConfig.borderColor }
                ]}
                activeOpacity={0.8}
              >
                <View style={styles.cardRow}>
                  <View style={styles.iconWrapper}>
                    <Icon size={32} color={uiConfig.iconColor} />
                  </View>
                  <View style={styles.textWrapper}>
                    <Text style={styles.categoryName}>
                      {category.name}
                    </Text>
                    <Text style={styles.categoryDesc}>
                      {category.description || 'Descrição indisponível'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
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
    gap: 12,
  },
  categoryCard: {
    width: '100%',
    borderWidth: 2,
    borderRadius: WorkEzTheme.borderRadius['2xl'],
    padding: WorkEzTheme.spacing.md,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: WorkEzTheme.borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrapper: {
    flex: 1,
  },
  categoryName: {
    ...WorkEzTheme.typography.lg,
    fontWeight: WorkEzTheme.typography.fontWeight.semibold,
    color: WorkEzTheme.colors.text,
  },
  categoryDesc: {
    ...WorkEzTheme.typography.sm,
    color: WorkEzTheme.colors.textSecondary,
    marginTop: 2,
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
});
