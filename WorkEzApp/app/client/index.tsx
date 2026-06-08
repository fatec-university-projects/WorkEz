import { useRouter } from 'expo-router';
import { Search, Zap, Shield, ShieldCheck, Star, Wrench, Brush, Paintbrush, Hammer, Settings } from 'lucide-react-native';
import { Button } from '../../components/Button';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView } from 'react-native';
import { AntigravityTheme } from '../../constants/theme';

export default function ClientHome() {
  const router = useRouter();

  const categories = [
    { name: 'Encanador', icon: Wrench, bgColor: '#eff6ff', iconColor: '#3b82f6' },
    { name: 'Eletricista', icon: Zap, bgColor: '#fefce8', iconColor: '#eab308' },
    { name: 'Diarista', icon: Brush, bgColor: '#faf5ff', iconColor: '#a855f7' },
    { name: 'Pintor', icon: Paintbrush, bgColor: '#f0fdf4', iconColor: '#22c55e' },
    { name: 'Montador', icon: Hammer, bgColor: '#fff7ed', iconColor: '#f97316' },
    { name: 'Técnico', icon: Settings, bgColor: '#fef2f2', iconColor: '#ef4444' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.headerBackground}>
        <Text style={styles.greetingText}>
          Olá, João! 👋
        </Text>
        <Text style={styles.subtitleText}>
          Qual serviço você precisa hoje?
        </Text>

        <View style={styles.searchContainer}>
          <Search size={20} color="#64748B" style={styles.searchIcon} />
          <TextInput
            placeholder="Buscar serviços..."
            style={styles.searchInput}
            placeholderTextColor="#94A3B8"
          />
        </View>
      </View>

      <View style={styles.callNowContainer}>
        <Button
          fullWidth
          onPress={() => router.push('/client/category')}
        >
          <Zap size={20} color="#FFF" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Chamar agora</Text>
        </Button>
      </View>

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>
          Categorias de serviço
        </Text>

        <View style={styles.categoriesGrid}>
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <TouchableOpacity
                key={category.name}
                onPress={() => router.push('/client/category')}
                style={[styles.categoryCard, { backgroundColor: category.bgColor }]}
              >
                <Icon size={32} color={category.iconColor} style={styles.categoryIcon} />
                <Text style={styles.categoryText}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.sectionContainerBottom}>
        <Text style={styles.sectionTitle}>
          Por que escolher o WorkEz?
        </Text>

        <View style={styles.benefitsContainer}>
          <View style={styles.benefitCard}>
            <View style={styles.benefitContentRow}>
              <View style={[styles.benefitIconWrapper, { backgroundColor: 'rgba(38, 255, 245, 0.1)' }]}>
                <ShieldCheck size={20} color={AntigravityTheme.colors.primary} />
              </View>
              <View style={styles.benefitTextContainer}>
                <Text style={styles.benefitTitle}>
                  Profissionais verificados
                </Text>
                <Text style={styles.benefitDescription}>
                  Documentos checados e antecedentes verificados
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.benefitCard}>
            <View style={styles.benefitContentRow}>
              <View style={[styles.benefitIconWrapper, { backgroundColor: 'rgba(37, 99, 235, 0.1)' }]}>
                <Shield size={20} color="#2563EB" />
              </View>
              <View style={styles.benefitTextContainer}>
                <Text style={styles.benefitTitle}>
                  Pagamento seguro
                </Text>
                <Text style={styles.benefitDescription}>
                  Pague pelo app com proteção total
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.benefitCard}>
            <View style={styles.benefitContentRow}>
              <View style={[styles.benefitIconWrapper, { backgroundColor: 'rgba(251, 191, 36, 0.1)' }]}>
                <Star size={20} color={AntigravityTheme.colors.warning} />
              </View>
              <View style={styles.benefitTextContainer}>
                <Text style={styles.benefitTitle}>
                  Avaliações reais
                </Text>
                <Text style={styles.benefitDescription}>
                  Profissionais avaliados por clientes como você
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
    paddingBottom: AntigravityTheme.spacing.xl,
  },
  headerBackground: {
    backgroundColor: '#2563EB', // gradient simplified or use expo-linear-gradient if needed
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  greetingText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitleText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
  },
  searchContainer: {
    marginTop: 24,
    position: 'relative',
    justifyContent: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: 16,
    zIndex: 1,
  },
  searchInput: {
    width: '100%',
    paddingLeft: 48,
    paddingRight: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    fontSize: 16,
  },
  callNowContainer: {
    paddingHorizontal: 24,
    marginTop: -16,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 16,
  },
  sectionContainer: {
    paddingHorizontal: 24,
    marginTop: 32,
  },
  sectionContainerBottom: {
    paddingHorizontal: 24,
    marginTop: 32,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AntigravityTheme.colors.text,
    marginBottom: 16,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  categoryCard: {
    width: '31%',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  categoryIcon: {
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
    color: AntigravityTheme.colors.text,
    textAlign: 'center',
  },
  benefitsContainer: {
    gap: 12,
  },
  benefitCard: {
    backgroundColor: AntigravityTheme.colors.backgroundCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: AntigravityTheme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  benefitContentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  benefitIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitTextContainer: {
    flex: 1,
  },
  benefitTitle: {
    fontWeight: '500',
    color: AntigravityTheme.colors.text,
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: 14,
    color: '#64748B',
  },
});
