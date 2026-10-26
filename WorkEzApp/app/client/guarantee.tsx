import { ShieldCheck, CreditCard, MessageCircle, Scale } from 'lucide-react-native';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useAppTheme } from '../../contexts/ThemeContext';

export default function PlatformGuarantee() {
  const { colors, isDark } = useAppTheme();

  const features = [
    {
      icon: ShieldCheck,
      title: 'Profissionais verificados',
      description: 'Todos os prestadores passam por verificação rigorosa de documentos, antecedentes criminais e referências profissionais.',
    },
    {
      icon: CreditCard,
      title: 'Pagamento protegido',
      description: 'O pagamento só é liberado ao profissional após a conclusão do serviço e sua confirmação.',
    },
    {
      icon: MessageCircle,
      title: 'Suporte dedicado',
      description: 'Nossa equipe está disponível para ajudar em caso de dúvidas ou problemas durante o serviço.',
    },
    {
      icon: Scale,
      title: 'Mediação de conflitos',
      description: 'Em caso de divergências, oferecemos mediação imparcial e proteção ao consumidor.',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundAlt }]}>
      <ScreenHeader title="Garantia da plataforma" showBack />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroBanner}>
          <ShieldCheck size={56} color="#FFFFFF" style={{ marginBottom: 12 }} />
          <Text style={styles.heroTitle}>100% Seguro</Text>
          <Text style={styles.heroSubtitle}>Sua proteção é nossa prioridade</Text>
        </View>

        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <View
              key={index}
              style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
            >
              <View style={styles.cardRow}>
                <View style={[styles.iconBox, { backgroundColor: isDark ? 'rgba(37, 99, 235, 0.16)' : '#EFF6FF' }]}>
                  <Icon size={24} color={isDark ? '#60A5FA' : '#2563EB'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.featureTitle, { color: colors.text }]}>{feature.title}</Text>
                  <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>{feature.description}</Text>
                </View>
              </View>
            </View>
          );
        })}

        <View
          style={[
            styles.warningBox,
            {
              backgroundColor: isDark ? 'rgba(245, 158, 11, 0.16)' : '#FEF3C7',
              borderColor: isDark ? 'rgba(251, 191, 36, 0.35)' : '#FDE047',
            },
          ]}
        >
          <Text style={[styles.warningTitle, { color: isDark ? '#FCD34D' : '#854D0E' }]}>
            Garantia de 7 dias
          </Text>
          <Text style={[styles.warningDesc, { color: isDark ? '#FDE68A' : '#92400E' }]}>
            Após a conclusão do serviço, você tem 7 dias para reportar qualquer problema. Mediaremos a situação e garantiremos uma solução justa.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, gap: 16 },
  heroBanner: {
    backgroundColor: '#2563EB',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  heroTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  heroSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.9)' },
  card: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  featureDesc: { fontSize: 14, lineHeight: 20 },
  warningBox: { borderRadius: 14, padding: 20, borderWidth: 1 },
  warningTitle: { fontSize: 15, fontWeight: '700', marginBottom: 6 },
  warningDesc: { fontSize: 13, lineHeight: 20 },
});
