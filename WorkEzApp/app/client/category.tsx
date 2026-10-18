import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Wrench,
  Brush,
  Zap,
  Paintbrush,
  Hammer,
  Settings,
  Droplet,
  Sparkles,
  Wind,
  Key,
  Trees,
  Cpu,
  ShieldCheck,
} from 'lucide-react-native';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { WorkEzTheme } from '../../constants/theme';
import { useFetch } from '../../hooks/useFetch';
import { ScreenHeader } from '../../components/ScreenHeader';

interface Category {
  id: string;
  name: string;
  description?: string;
}

function getCategoryConfig(name: string) {
  const norm = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (norm.includes('jard') || norm.includes('grama') || norm.includes('poda') || norm.includes('paisag')) {
    return { icon: Trees, bgColor: '#ECFDF5', borderColor: '#A7F3D0', iconColor: '#059669' };
  }
  if (norm.includes('encan') || norm.includes('hidraul') || norm.includes('vazam') || norm.includes('cano') || norm.includes('torneira')) {
    return { icon: Droplet, bgColor: '#EFF6FF', borderColor: '#BFDBFE', iconColor: '#2563EB' };
  }
  if (norm.includes('eletri') || norm.includes('luz') || norm.includes('fiac') || norm.includes('disjunt') || norm.includes('tomada')) {
    return { icon: Zap, bgColor: '#FEFCE8', borderColor: '#FEF08A', iconColor: '#CA8A04' };
  }
  if (norm.includes('diar') || norm.includes('limp') || norm.includes('faxin') || norm.includes('passad')) {
    return { icon: Sparkles, bgColor: '#FAF5FF', borderColor: '#E9D5FF', iconColor: '#9333EA' };
  }
  if (norm.includes('pint') || norm.includes('parede') || norm.includes('verniz')) {
    return { icon: Paintbrush, bgColor: '#F0FDF4', borderColor: '#BBF7D0', iconColor: '#16A34A' };
  }
  if (norm.includes('mont') || norm.includes('marcen') || norm.includes('move')) {
    return { icon: Hammer, bgColor: '#FFF7ED', borderColor: '#FED7AA', iconColor: '#EA580C' };
  }
  if (norm.includes('pedreir') || norm.includes('alvenar') || norm.includes('obra') || norm.includes('reforma') || norm.includes('constru')) {
    return { icon: Hammer, bgColor: '#F1F5F9', borderColor: '#CBD5E1', iconColor: '#475569' };
  }
  if (norm.includes('serralh') || norm.includes('solda') || norm.includes('portao') || norm.includes('grade')) {
    return { icon: Settings, bgColor: '#F0F9FF', borderColor: '#BAE6FD', iconColor: '#0284C7' };
  }
  if (norm.includes('dedetiz') || norm.includes('praga') || norm.includes('inset')) {
    return { icon: ShieldCheck, bgColor: '#ECFDF5', borderColor: '#A7F3D0', iconColor: '#0D9488' };
  }
  if (norm.includes('ar-cond') || norm.includes('ar cond') || norm.includes('clima') || norm.includes('refrig') || norm.includes('split') || norm.includes('ventilador')) {
    return { icon: Wind, bgColor: '#F0F9FF', borderColor: '#BAE6FD', iconColor: '#0284C7' };
  }
  if (norm.includes('chave') || norm.includes('tranc') || norm.includes('fechad')) {
    return { icon: Key, bgColor: '#FFFBEB', borderColor: '#FDE68A', iconColor: '#D97706' };
  }
  if (norm.includes('tec') || norm.includes('comput') || norm.includes('celul') || norm.includes('eletron')) {
    return { icon: Cpu, bgColor: '#F8FAFC', borderColor: '#CBD5E1', iconColor: '#475569' };
  }
  return { icon: Wrench, bgColor: '#F8FAFC', borderColor: '#E2E8F0', iconColor: '#2563EB' };
}

export default function SelectCategory() {
  const router = useRouter();

  const { data: categories, loading, error } = useFetch<Category[]>('/api/Categories');

  return (
    <View style={styles.container}>
      <ScreenHeader title="Selecione o serviço" showBack />

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
            const uiConfig = getCategoryConfig(category.name);
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
