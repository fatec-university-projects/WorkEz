import { useState, useMemo } from 'react';
import { useRouter } from 'expo-router';
import {
  Search,
  Zap,
  Shield,
  ShieldCheck,
  Star,
  Wrench,
  Paintbrush,
  Hammer,
  Droplet,
  Sparkles,
  Wind,
  Key,
  Trees,
  Cpu,
  ArrowRight,
  X,
  Clock,
  Sun,
  Moon,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFetch } from '../../hooks/useFetch';
import { useAuth } from '../../contexts/AuthContext';
import { useAppTheme } from '../../contexts/ThemeContext';

interface Category {
  id: string;
  name: string;
  description?: string;
}

interface CategoryUI {
  icon: any;
  bgColor: string;
  borderColor: string;
  iconColor: string;
  badge: string;
}

function getCategoryConfig(name: string, isDark: boolean): CategoryUI {
  const norm = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (norm.includes('jard') || norm.includes('grama') || norm.includes('poda')) {
    return {
      icon: Trees,
      bgColor: isDark ? 'rgba(5, 150, 105, 0.16)' : '#ECFDF5',
      borderColor: isDark ? 'rgba(52, 211, 153, 0.3)' : '#A7F3D0',
      iconColor: isDark ? '#34D399' : '#059669',
      badge: 'Jardinagem',
    };
  }
  if (norm.includes('encan') || norm.includes('hidraul') || norm.includes('vazam') || norm.includes('cano') || norm.includes('torneira')) {
    return {
      icon: Droplet,
      bgColor: isDark ? 'rgba(37, 99, 235, 0.16)' : '#EFF6FF',
      borderColor: isDark ? 'rgba(96, 165, 250, 0.3)' : '#BFDBFE',
      iconColor: isDark ? '#60A5FA' : '#2563EB',
      badge: 'Hidráulica',
    };
  }
  if (norm.includes('eletri') || norm.includes('luz') || norm.includes('fiac') || norm.includes('disjunt') || norm.includes('tomada')) {
    return {
      icon: Zap,
      bgColor: isDark ? 'rgba(202, 138, 4, 0.16)' : '#FEFCE8',
      borderColor: isDark ? 'rgba(250, 204, 21, 0.3)' : '#FEF08A',
      iconColor: isDark ? '#FACC15' : '#CA8A04',
      badge: 'Elétrica',
    };
  }
  if (norm.includes('diar') || norm.includes('limp') || norm.includes('faxin') || norm.includes('passad')) {
    return {
      icon: Sparkles,
      bgColor: isDark ? 'rgba(147, 51, 234, 0.16)' : '#FAF5FF',
      borderColor: isDark ? 'rgba(192, 132, 252, 0.3)' : '#E9D5FF',
      iconColor: isDark ? '#C084FC' : '#9333EA',
      badge: 'Limpeza',
    };
  }
  if (norm.includes('pint') || norm.includes('parede') || norm.includes('verniz')) {
    return {
      icon: Paintbrush,
      bgColor: isDark ? 'rgba(22, 163, 74, 0.16)' : '#F0FDF4',
      borderColor: isDark ? 'rgba(74, 222, 128, 0.3)' : '#BBF7D0',
      iconColor: isDark ? '#4ADE80' : '#16A34A',
      badge: 'Pintura',
    };
  }
  if (norm.includes('mont') || norm.includes('marcen') || norm.includes('move')) {
    return {
      icon: Hammer,
      bgColor: isDark ? 'rgba(234, 88, 12, 0.16)' : '#FFF7ED',
      borderColor: isDark ? 'rgba(251, 146, 60, 0.3)' : '#FED7AA',
      iconColor: isDark ? '#FB923C' : '#EA580C',
      badge: 'Montagem',
    };
  }
  if (norm.includes('ar-cond') || norm.includes('ar cond') || norm.includes('clima') || norm.includes('refrig') || norm.includes('split') || norm.includes('ventilador')) {
    return {
      icon: Wind,
      bgColor: isDark ? 'rgba(2, 132, 199, 0.16)' : '#F0F9FF',
      borderColor: isDark ? 'rgba(56, 189, 248, 0.3)' : '#BAE6FD',
      iconColor: isDark ? '#38BDF8' : '#0284C7',
      badge: 'Climatização',
    };
  }
  if (norm.includes('chave') || norm.includes('tranc') || norm.includes('fechad')) {
    return {
      icon: Key,
      bgColor: isDark ? 'rgba(217, 119, 6, 0.16)' : '#FFFBEB',
      borderColor: isDark ? 'rgba(251, 191, 36, 0.3)' : '#FDE68A',
      iconColor: isDark ? '#FBBF24' : '#D97706',
      badge: 'Chaveiro',
    };
  }
  if (norm.includes('pedreir') || norm.includes('alvenar') || norm.includes('obra') || norm.includes('reforma') || norm.includes('constru')) {
    return {
      icon: Hammer,
      bgColor: isDark ? 'rgba(148, 163, 184, 0.15)' : '#F1F5F9',
      borderColor: isDark ? 'rgba(148, 163, 184, 0.28)' : '#CBD5E1',
      iconColor: isDark ? '#CBD5E1' : '#475569',
      badge: 'Alvenaria',
    };
  }
  if (norm.includes('serralh') || norm.includes('solda') || norm.includes('portao') || norm.includes('grade')) {
    return {
      icon: Wrench,
      bgColor: isDark ? 'rgba(2, 132, 199, 0.16)' : '#F8FAFC',
      borderColor: isDark ? 'rgba(56, 189, 248, 0.3)' : '#E2E8F0',
      iconColor: isDark ? '#38BDF8' : '#0284C7',
      badge: 'Serralheria',
    };
  }
  if (norm.includes('dedetiz') || norm.includes('praga') || norm.includes('inset')) {
    return {
      icon: ShieldCheck,
      bgColor: isDark ? 'rgba(13, 148, 136, 0.16)' : '#ECFDF5',
      borderColor: isDark ? 'rgba(45, 212, 191, 0.3)' : '#A7F3D0',
      iconColor: isDark ? '#2DD4BF' : '#0D9488',
      badge: 'Dedetização',
    };
  }
  if (norm.includes('tec') || norm.includes('comput') || norm.includes('celul') || norm.includes('eletron')) {
    return {
      icon: Cpu,
      bgColor: isDark ? 'rgba(148, 163, 184, 0.15)' : '#F8FAFC',
      borderColor: isDark ? 'rgba(148, 163, 184, 0.28)' : '#CBD5E1',
      iconColor: isDark ? '#CBD5E1' : '#475569',
      badge: 'Aparelhos',
    };
  }
  return {
    icon: Wrench,
    bgColor: isDark ? 'rgba(37, 99, 235, 0.16)' : '#F8FAFC',
    borderColor: isDark ? 'rgba(96, 165, 250, 0.3)' : '#E2E8F0',
    iconColor: isDark ? '#60A5FA' : '#2563EB',
    badge: 'Geral',
  };
}

export default function ClientHome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isDark, colors, toggleTheme } = useAppTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: categories, loading, error } = useFetch<Category[]>('/api/Categories');

  const filteredCategories = useMemo(() => {
    if (!categories) return [];
    if (!searchQuery.trim()) return categories;
    const query = searchQuery.toLowerCase().trim();
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        (c.description && c.description.toLowerCase().includes(query))
    );
  }, [categories, searchQuery]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.backgroundAlt }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header com Gradiente e Alternador de Tema ─────────────────────────── */}
      <LinearGradient
        colors={isDark ? ['#0F172A', '#1E3A8A', '#1D4ED8'] : ['#1E3A8A', '#2563EB', '#3B82F6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerBackground, { paddingTop: insets.top > 0 ? insets.top + 16 : 48 }]}
      >
        <View style={styles.headerTopRow}>
          <View style={styles.headerUserCol}>
            <Text style={styles.greetingText}>
              Olá, {user?.name.split(' ')[0] || 'Cliente'}! 👋
            </Text>
            <Text style={styles.subtitleText}>
              Qual serviço você precisa hoje?
            </Text>
          </View>
          <TouchableOpacity
            onPress={toggleTheme}
            activeOpacity={0.8}
            style={styles.headerThemeBtn}
            accessibilityLabel={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
          >
            {isDark ? <Sun size={18} color="#FBBF24" /> : <Moon size={18} color="#FFFFFF" />}
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Search size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            placeholder="Buscar encanador, eletricista, pintor..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[
              styles.searchInput,
              {
                backgroundColor: isDark ? '#131C31' : '#FFFFFF',
                color: colors.text,
              },
            ]}
            placeholderTextColor={colors.textMuted}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
              <X size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* ── Seção de Categorias de Serviços ─────────────────────────── */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Categorias de Serviço</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Selecione a especialidade desejada para orçar
            </Text>
          </View>
          {filteredCategories.length > 0 && (
            <View
              style={[
                styles.categoryCountBadge,
                isDark && { backgroundColor: 'rgba(37, 99, 235, 0.2)', borderColor: 'rgba(96, 165, 250, 0.35)' },
              ]}
            >
              <Text style={[styles.categoryCountText, isDark && { color: '#93C5FD' }]}>
                {filteredCategories.length}
              </Text>
            </View>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Carregando serviços disponíveis...
            </Text>
          </View>
        ) : error || filteredCategories.length === 0 ? (
          <View
            style={[
              styles.emptyContainer,
              { backgroundColor: colors.backgroundCard, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Nenhuma categoria disponível</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {searchQuery
                ? `Não encontramos categorias correspondentes a "${searchQuery}".`
                : 'No momento não há categorias de serviços cadastradas.'}
            </Text>
            {searchQuery ? (
              <TouchableOpacity style={styles.clearFilterButton} onPress={() => setSearchQuery('')}>
                <Text style={styles.clearFilterButtonText}>Limpar busca</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <View style={styles.categoriesGrid}>
            {filteredCategories.map((category) => {
              const uiConfig = getCategoryConfig(category.name, isDark);
              const Icon = uiConfig.icon;
              return (
                <TouchableOpacity
                  key={category.id}
                  activeOpacity={0.75}
                  onPress={() =>
                    router.push({
                      pathname: '/client/describe',
                      params: { category: category.name, categoryId: category.id },
                    } as any)
                  }
                  style={[
                    styles.categoryCard,
                    {
                      backgroundColor: colors.backgroundCard,
                      borderColor: uiConfig.borderColor,
                    },
                  ]}
                >
                  <View style={[styles.categoryIconWrapper, { backgroundColor: uiConfig.bgColor }]}>
                    <Icon size={28} color={uiConfig.iconColor} />
                  </View>
                  <Text style={[styles.categoryName, { color: colors.text }]} numberOfLines={1}>
                    {category.name}
                  </Text>
                  <View style={[styles.categoryPill, { backgroundColor: uiConfig.bgColor }]}>
                    <Text style={[styles.categoryPillText, { color: uiConfig.iconColor }]}>
                      {uiConfig.badge}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* ── Banner 'Chamar Agora' ─────────── */}
      <View style={styles.callNowSection}>
        <View
          style={[
            styles.callNowCard,
            { backgroundColor: colors.backgroundCard, borderColor: colors.border },
          ]}
        >
          <View style={styles.callNowHeaderRow}>
            <View
              style={[
                styles.callNowPill,
                isDark && { backgroundColor: 'rgba(37, 99, 235, 0.2)', borderColor: 'rgba(96, 165, 250, 0.35)' },
              ]}
            >
              <Zap size={14} color={isDark ? '#60A5FA' : '#2563EB'} />
              <Text style={[styles.callNowPillText, isDark && { color: '#93C5FD' }]}>
                ATENDIMENTO IMEDIATO
              </Text>
            </View>
            <Clock size={16} color={colors.textSecondary} />
          </View>

          <Text style={[styles.callNowCardTitle, { color: colors.text }]}>Precisa de ajuda agora?</Text>
          <Text style={[styles.callNowCardDesc, { color: colors.textSecondary }]}>
            Encontre profissionais prontos para atender seu chamado com prioridade máxima e orçamento rápido.
          </Text>

          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => router.push('/client/category')}
            style={styles.callNowPrimaryButton}
          >
            <Zap size={18} color="#FFFFFF" />
            <Text style={styles.callNowPrimaryButtonText}>Chamar agora</Text>
            <ArrowRight size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Seção 'Por que escolher o WorkEz?' ─────────────────────── */}
      <View style={styles.sectionContainerBottom}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Por que escolher o WorkEz?</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
          Sua tranquilidade garantida do início ao fim
        </Text>

        <View style={styles.benefitsContainer}>
          <View
            style={[
              styles.benefitCard,
              { backgroundColor: colors.backgroundCard, borderColor: colors.border },
            ]}
          >
            <View style={styles.benefitContentRow}>
              <View style={[styles.benefitIconWrapper, { backgroundColor: 'rgba(37, 99, 235, 0.14)' }]}>
                <ShieldCheck size={22} color={isDark ? '#60A5FA' : '#2563EB'} />
              </View>
              <View style={styles.benefitTextContainer}>
                <Text style={[styles.benefitTitle, { color: colors.text }]}>Profissionais Verificados</Text>
                <Text style={[styles.benefitDescription, { color: colors.textSecondary }]}>
                  Documentos, antecedentes e qualificações rigorosamente checados.
                </Text>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.benefitCard,
              { backgroundColor: colors.backgroundCard, borderColor: colors.border },
            ]}
          >
            <View style={styles.benefitContentRow}>
              <View style={[styles.benefitIconWrapper, { backgroundColor: 'rgba(37, 99, 235, 0.14)' }]}>
                <Shield size={22} color={isDark ? '#60A5FA' : '#2563EB'} />
              </View>
              <View style={styles.benefitTextContainer}>
                <Text style={[styles.benefitTitle, { color: colors.text }]}>Pagamento Seguro com Proteção</Text>
                <Text style={[styles.benefitDescription, { color: colors.textSecondary }]}>
                  O valor só é liberado ao profissional após a conclusão do serviço.
                </Text>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.benefitCard,
              { backgroundColor: colors.backgroundCard, borderColor: colors.border },
            ]}
          >
            <View style={styles.benefitContentRow}>
              <View style={[styles.benefitIconWrapper, { backgroundColor: 'rgba(251, 191, 36, 0.14)' }]}>
                <Star size={22} color="#F59E0B" />
              </View>
              <View style={styles.benefitTextContainer}>
                <Text style={[styles.benefitTitle, { color: colors.text }]}>Avaliações e Notas Transparentes</Text>
                <Text style={[styles.benefitDescription, { color: colors.textSecondary }]}>
                  Consulte notas, fotos de trabalhos anteriores e opiniões de clientes.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 48,
  },
  headerBackground: {
    paddingHorizontal: 24,
    paddingTop: 52,
    paddingBottom: 32,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerUserCol: {
    flex: 1,
  },
  headerThemeBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetingText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  subtitleText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 15,
  },
  searchContainer: {
    marginTop: 20,
    position: 'relative',
    justifyContent: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: 16,
    zIndex: 2,
  },
  searchInput: {
    width: '100%',
    paddingLeft: 46,
    paddingRight: 42,
    paddingVertical: 14,
    borderRadius: 16,
    fontSize: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  clearSearchBtn: {
    position: 'absolute',
    right: 14,
    zIndex: 2,
    padding: 6,
  },
  sectionContainer: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  categoryCountBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  categoryCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  clearFilterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
  },
  clearFilterButtonText: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 13,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'flex-start',
  },
  categoryCard: {
    width: '31%',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  categoryPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: '600',
  },
  callNowSection: {
    paddingHorizontal: 20,
    marginTop: 28,
  },
  callNowCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  callNowHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  callNowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  callNowPillText: {
    color: '#2563EB',
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  callNowCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  callNowCardDesc: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 18,
  },
  callNowPrimaryButton: {
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  callNowPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  sectionContainerBottom: {
    paddingHorizontal: 20,
    marginTop: 28,
  },
  benefitsContainer: {
    gap: 12,
    marginTop: 14,
  },
  benefitCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  benefitContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  benefitIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitTextContainer: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  benefitDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
});
