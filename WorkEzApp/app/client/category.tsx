import { useRouter } from 'expo-router';
import {
  Wrench,
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
import { DEFAULT_CATEGORIES } from '../../constants/defaultCategories';
import { useFetch } from '../../hooks/useFetch';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useAppTheme } from '../../contexts/ThemeContext';

interface Category {
  id: string;
  name: string;
  description?: string;
}

function getCategoryConfig(name: string, isDark: boolean) {
  const norm = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (norm.includes('jard') || norm.includes('grama') || norm.includes('poda') || norm.includes('paisag')) {
    return {
      icon: Trees,
      bgColor: isDark ? 'rgba(5, 150, 105, 0.16)' : '#ECFDF5',
      borderColor: isDark ? 'rgba(52, 211, 153, 0.3)' : '#A7F3D0',
      iconColor: isDark ? '#34D399' : '#059669',
    };
  }
  if (norm.includes('encan') || norm.includes('hidraul') || norm.includes('vazam') || norm.includes('cano') || norm.includes('torneira')) {
    return {
      icon: Droplet,
      bgColor: isDark ? 'rgba(37, 99, 235, 0.16)' : '#EFF6FF',
      borderColor: isDark ? 'rgba(96, 165, 250, 0.3)' : '#BFDBFE',
      iconColor: isDark ? '#60A5FA' : '#2563EB',
    };
  }
  if (norm.includes('eletri') || norm.includes('luz') || norm.includes('fiac') || norm.includes('disjunt') || norm.includes('tomada')) {
    return {
      icon: Zap,
      bgColor: isDark ? 'rgba(202, 138, 4, 0.16)' : '#FEFCE8',
      borderColor: isDark ? 'rgba(250, 204, 21, 0.3)' : '#FEF08A',
      iconColor: isDark ? '#FACC15' : '#CA8A04',
    };
  }
  if (norm.includes('diar') || norm.includes('limp') || norm.includes('faxin') || norm.includes('passad')) {
    return {
      icon: Sparkles,
      bgColor: isDark ? 'rgba(147, 51, 234, 0.16)' : '#FAF5FF',
      borderColor: isDark ? 'rgba(192, 132, 252, 0.3)' : '#E9D5FF',
      iconColor: isDark ? '#C084FC' : '#9333EA',
    };
  }
  if (norm.includes('pint') || norm.includes('parede') || norm.includes('verniz')) {
    return {
      icon: Paintbrush,
      bgColor: isDark ? 'rgba(22, 163, 74, 0.16)' : '#F0FDF4',
      borderColor: isDark ? 'rgba(74, 222, 128, 0.3)' : '#BBF7D0',
      iconColor: isDark ? '#4ADE80' : '#16A34A',
    };
  }
  if (norm.includes('mont') || norm.includes('marcen') || norm.includes('move')) {
    return {
      icon: Hammer,
      bgColor: isDark ? 'rgba(234, 88, 12, 0.16)' : '#FFF7ED',
      borderColor: isDark ? 'rgba(251, 146, 60, 0.3)' : '#FED7AA',
      iconColor: isDark ? '#FB923C' : '#EA580C',
    };
  }
  if (norm.includes('pedreir') || norm.includes('alvenar') || norm.includes('obra') || norm.includes('reforma') || norm.includes('constru')) {
    return {
      icon: Hammer,
      bgColor: isDark ? 'rgba(148, 163, 184, 0.15)' : '#F1F5F9',
      borderColor: isDark ? 'rgba(148, 163, 184, 0.28)' : '#CBD5E1',
      iconColor: isDark ? '#CBD5E1' : '#475569',
    };
  }
  if (norm.includes('serralh') || norm.includes('solda') || norm.includes('portao') || norm.includes('grade')) {
    return {
      icon: Settings,
      bgColor: isDark ? 'rgba(2, 132, 199, 0.16)' : '#F0F9FF',
      borderColor: isDark ? 'rgba(56, 189, 248, 0.3)' : '#BAE6FD',
      iconColor: isDark ? '#38BDF8' : '#0284C7',
    };
  }
  if (norm.includes('dedetiz') || norm.includes('praga') || norm.includes('inset')) {
    return {
      icon: ShieldCheck,
      bgColor: isDark ? 'rgba(13, 148, 136, 0.16)' : '#ECFDF5',
      borderColor: isDark ? 'rgba(45, 212, 191, 0.3)' : '#A7F3D0',
      iconColor: isDark ? '#2DD4BF' : '#0D9488',
    };
  }
  if (norm.includes('ar-cond') || norm.includes('ar cond') || norm.includes('clima') || norm.includes('refrig') || norm.includes('split') || norm.includes('ventilador')) {
    return {
      icon: Wind,
      bgColor: isDark ? 'rgba(2, 132, 199, 0.16)' : '#F0F9FF',
      borderColor: isDark ? 'rgba(56, 189, 248, 0.3)' : '#BAE6FD',
      iconColor: isDark ? '#38BDF8' : '#0284C7',
    };
  }
  if (norm.includes('chave') || norm.includes('tranc') || norm.includes('fechad')) {
    return {
      icon: Key,
      bgColor: isDark ? 'rgba(217, 119, 6, 0.16)' : '#FFFBEB',
      borderColor: isDark ? 'rgba(251, 191, 36, 0.3)' : '#FDE68A',
      iconColor: isDark ? '#FBBF24' : '#D97706',
    };
  }
  if (norm.includes('tec') || norm.includes('comput') || norm.includes('celul') || norm.includes('eletron')) {
    return {
      icon: Cpu,
      bgColor: isDark ? 'rgba(148, 163, 184, 0.15)' : '#F8FAFC',
      borderColor: isDark ? 'rgba(148, 163, 184, 0.28)' : '#CBD5E1',
      iconColor: isDark ? '#CBD5E1' : '#475569',
    };
  }
  return {
    icon: Wrench,
    bgColor: isDark ? 'rgba(37, 99, 235, 0.16)' : '#F8FAFC',
    borderColor: isDark ? 'rgba(96, 165, 250, 0.3)' : '#E2E8F0',
    iconColor: isDark ? '#60A5FA' : '#2563EB',
  };
}

export default function SelectCategory() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();

  const { data: categories, loading, error } = useFetch<Category[]>('/api/Categories');

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundAlt }]}>
      <ScreenHeader title="Selecione o serviço" showBack />

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Carregando categorias...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          </View>
        ) : (
          (categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES).map((category) => {
            const uiConfig = getCategoryConfig(category.name, isDark);
            const Icon = uiConfig.icon;
            return (
              <TouchableOpacity
                key={category.id}
                onPress={() =>
                  router.push({
                    pathname: '/client/describe',
                    params: { category: category.name, categoryId: category.id },
                  } as any)
                }
                style={[
                  styles.categoryCard,
                  { backgroundColor: uiConfig.bgColor, borderColor: uiConfig.borderColor },
                ]}
                activeOpacity={0.8}
              >
                <View style={styles.cardRow}>
                  <View style={styles.iconWrapper}>
                    <Icon size={32} color={uiConfig.iconColor} />
                  </View>
                  <View style={styles.textWrapper}>
                    <Text style={[styles.categoryName, { color: colors.text }]}>{category.name}</Text>
                    <Text style={[styles.categoryDesc, { color: colors.textSecondary }]}>
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
  },
  categoryDesc: {
    ...WorkEzTheme.typography.sm,
    marginTop: 2,
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
});
