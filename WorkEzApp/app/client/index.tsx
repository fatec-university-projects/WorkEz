import { useState, useMemo } from 'react';
import { useRouter } from 'expo-router';
import {
  Search,
  Zap,
  Shield,
  ShieldCheck,
  Star,
  Wrench,
  Brush,
  Paintbrush,
  Hammer,
  Settings,
  Droplet,
  Sparkles,
  Wind,
  Key,
  Trees,
  Cpu,
  ArrowRight,
  X,
  Clock,
  CheckCircle2,
  SlidersHorizontal,
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
import { WorkEzTheme } from '../../constants/theme';
import { useFetch } from '../../hooks/useFetch';
import { useAuth } from '../../contexts/AuthContext';

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

function getCategoryConfig(name: string): CategoryUI {
  const norm = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (norm.includes('jard') || norm.includes('grama') || norm.includes('poda')) {
    return { icon: Trees, bgColor: '#ECFDF5', borderColor: '#A7F3D0', iconColor: '#059669', badge: 'Jardinagem' };
  }
  if (norm.includes('encan') || norm.includes('hidraul') || norm.includes('vazam') || norm.includes('cano') || norm.includes('torneira')) {
    return { icon: Droplet, bgColor: '#EFF6FF', borderColor: '#BFDBFE', iconColor: '#2563EB', badge: 'Hidráulica' };
  }
  if (norm.includes('eletri') || norm.includes('luz') || norm.includes('fiac') || norm.includes('disjunt') || norm.includes('tomada')) {
    return { icon: Zap, bgColor: '#FEFCE8', borderColor: '#FEF08A', iconColor: '#CA8A04', badge: 'Elétrica' };
  }
  if (norm.includes('diar') || norm.includes('limp') || norm.includes('faxin') || norm.includes('passad')) {
    return { icon: Sparkles, bgColor: '#FAF5FF', borderColor: '#E9D5FF', iconColor: '#9333EA', badge: 'Limpeza' };
  }
  if (norm.includes('pint') || norm.includes('parede') || norm.includes('verniz')) {
    return { icon: Paintbrush, bgColor: '#F0FDF4', borderColor: '#BBF7D0', iconColor: '#16A34A', badge: 'Pintura' };
  }
  if (norm.includes('mont') || norm.includes('marcen') || norm.includes('move')) {
    return { icon: Hammer, bgColor: '#FFF7ED', borderColor: '#FED7AA', iconColor: '#EA580C', badge: 'Montagem' };
  }
  if (norm.includes('ar-cond') || norm.includes('ar cond') || norm.includes('clima') || norm.includes('refrig') || norm.includes('split') || norm.includes('ventilador')) {
    return { icon: Wind, bgColor: '#F0F9FF', borderColor: '#BAE6FD', iconColor: '#0284C7', badge: 'Climatização' };
  }
  if (norm.includes('chave') || norm.includes('tranc') || norm.includes('fechad')) {
    return { icon: Key, bgColor: '#FFFBEB', borderColor: '#FDE68A', iconColor: '#D97706', badge: 'Chaveiro' };
  }
  if (norm.includes('pedreir') || norm.includes('alvenar') || norm.includes('obra') || norm.includes('reforma') || norm.includes('constru')) {
    return { icon: Hammer, bgColor: '#F1F5F9', borderColor: '#CBD5E1', iconColor: '#475569', badge: 'Alvenaria' };
  }
  if (norm.includes('serralh') || norm.includes('solda') || norm.includes('portao') || norm.includes('grade')) {
    return { icon: Wrench, bgColor: '#F8FAFC', borderColor: '#E2E8F0', iconColor: '#0284C7', badge: 'Serralheria' };
  }
  if (norm.includes('dedetiz') || norm.includes('praga') || norm.includes('inset')) {
    return { icon: ShieldCheck, bgColor: '#ECFDF5', borderColor: '#A7F3D0', iconColor: '#0D9488', badge: 'Dedetização' };
  }
  if (norm.includes('tec') || norm.includes('comput') || norm.includes('celul') || norm.includes('eletron')) {
    return { icon: Cpu, bgColor: '#F8FAFC', borderColor: '#CBD5E1', iconColor: '#475569', badge: 'Aparelhos' };
  }
  return { icon: Wrench, bgColor: '#F8FAFC', borderColor: '#E2E8F0', iconColor: '#2563EB', badge: 'Geral' };
}

export default function ClientHome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'popular' | 'urgent'>('all');

  const { data: categories, loading, error } = useFetch<Category[]>('/api/Categories');

  // Categorias filtradas por busca
  const filteredCategories = useMemo(() => {
    if (!categories) return [];
    if (!searchQuery.trim()) return categories;
    const query = searchQuery.toLowerCase().trim();
    return categories.filter((c) =>
      c.name.toLowerCase().includes(query) || (c.description && c.description.toLowerCase().includes(query))
    );
  }, [categories, searchQuery]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* ── Header Elegante com Gradiente ─────────────────────────── */}
      <LinearGradient
        colors={['#1E3A8A', '#2563EB', '#3B82F6']}
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
        </View>

        {/* Barra de Pesquisa Interativa */}
        <View style={styles.searchContainer}>
          <Search size={20} color="#64748B" style={styles.searchIcon} />
          <TextInput
            placeholder="Buscar encanador, eletricista, pintor..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            placeholderTextColor="#94A3B8"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
              <X size={16} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* ── Seção de Categorias de Serviços ─────────────────────────── */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Categorias de Serviço</Text>
            <Text style={styles.sectionSubtitle}>
              Selecione a especialidade desejada para orçar
            </Text>
          </View>
          {filteredCategories.length > 0 && (
            <View style={styles.categoryCountBadge}>
              <Text style={styles.categoryCountText}>{filteredCategories.length}</Text>
            </View>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Carregando serviços disponíveis...</Text>
          </View>
        ) : error || filteredCategories.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>Nenhuma categoria disponível</Text>
            <Text style={styles.emptySubtitle}>
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
              const uiConfig = getCategoryConfig(category.name);
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
                  style={[styles.categoryCard, { borderColor: uiConfig.borderColor }]}
                >
                  <View style={[styles.categoryIconWrapper, { backgroundColor: uiConfig.bgColor }]}>
                    <Icon size={28} color={uiConfig.iconColor} />
                  </View>
                  <Text style={styles.categoryName} numberOfLines={1}>
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

      {/* ── Banner 'Chamar Agora' (Harmônico com o Design do WorkEz) ─────────── */}
      <View style={styles.callNowSection}>
        <View style={styles.callNowCard}>
          <View style={styles.callNowHeaderRow}>
            <View style={styles.callNowPill}>
              <Zap size={14} color="#2563EB" />
              <Text style={styles.callNowPillText}>ATENDIMENTO IMEDIATO</Text>
            </View>
            <Clock size={16} color="#64748B" />
          </View>

          <Text style={styles.callNowCardTitle}>Precisa de ajuda agora?</Text>
          <Text style={styles.callNowCardDesc}>
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
        <Text style={styles.sectionTitle}>Por que escolher o WorkEz?</Text>
        <Text style={styles.sectionSubtitle}>
          Sua tranquilidade garantida do início ao fim
        </Text>

        <View style={styles.benefitsContainer}>
          <View style={styles.benefitCard}>
            <View style={styles.benefitContentRow}>
              <View style={[styles.benefitIconWrapper, { backgroundColor: 'rgba(37, 99, 235, 0.1)' }]}>
                <ShieldCheck size={22} color="#2563EB" />
              </View>
              <View style={styles.benefitTextContainer}>
                <Text style={styles.benefitTitle}>Profissionais Verificados</Text>
                <Text style={styles.benefitDescription}>
                  Documentos, antecedentes e qualificações rigorosamente checados.
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.benefitCard}>
            <View style={styles.benefitContentRow}>
              <View style={[styles.benefitIconWrapper, { backgroundColor: 'rgba(37, 99, 235, 0.1)' }]}>
                <Shield size={22} color="#2563EB" />
              </View>
              <View style={styles.benefitTextContainer}>
                <Text style={styles.benefitTitle}>Pagamento Seguro com Proteção</Text>
                <Text style={styles.benefitDescription}>
                  O valor só é liberado ao profissional após a conclusão do serviço.
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.benefitCard}>
            <View style={styles.benefitContentRow}>
              <View style={[styles.benefitIconWrapper, { backgroundColor: 'rgba(251, 191, 36, 0.12)' }]}>
                <Star size={22} color="#D97706" />
              </View>
              <View style={styles.benefitTextContainer}>
                <Text style={styles.benefitTitle}>Avaliações e Notas Transparentes</Text>
                <Text style={styles.benefitDescription}>
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
    backgroundColor: '#F8FAFC',
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
  headerStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ADE80',
  },
  headerStatusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    fontSize: 15,
    color: '#0F172A',
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
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748B',
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
    color: '#64748B',
    fontSize: 14,
  },
  errorContainer: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
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
    backgroundColor: '#FFFFFF',
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
    color: '#0F172A',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    color: '#0F172A',
    marginBottom: 6,
  },
  callNowCardDesc: {
    fontSize: 13,
    color: '#64748B',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    color: '#0F172A',
    marginBottom: 2,
  },
  benefitDescription: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
});
