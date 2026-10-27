import { useRouter } from 'expo-router';
import { ShieldCheck, CreditCard, QrCode, Lock } from 'lucide-react-native';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Button } from '../../components/Button';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useAppTheme } from '../../contexts/ThemeContext';

export default function PaymentMethods() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundAlt }]}>
      <ScreenHeader title="Formas de pagamento" showBack />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Safe banner */}
        <View style={[styles.heroCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
          <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.16)' : '#ECFDF5' }]}>
            <Lock size={36} color="#10B981" />
          </View>
          <Text style={[styles.heroTitle, { color: colors.text }]}>Pagamento 100% Seguro</Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
            Todos os pagamentos dentro da plataforma WorkEz são processados com total segurança através do DelFinance BaaS.
          </Text>
        </View>

        {/* Info list */}
        <View style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Como funciona o processamento?</Text>

          <View style={styles.infoRow}>
            <View style={[styles.iconWrapper, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.16)' : '#ECFDF5' }]}>
              <ShieldCheck size={20} color="#10B981" />
            </View>
            <View style={styles.infoTextWrapper}>
              <Text style={[styles.infoLabel, { color: colors.text }]}>Proteção de dados</Text>
              <Text style={[styles.infoValue, { color: colors.textSecondary }]}>
                Não salvamos seus dados nos nossos servidores. Todo o processamento é feito diretamente pelo ambiente bancário regulado do DelFinance BaaS.
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.infoRow}>
            <View style={[styles.iconWrapper, { backgroundColor: isDark ? 'rgba(37, 99, 235, 0.16)' : '#EFF6FF' }]}>
              <QrCode size={20} color={isDark ? '#60A5FA' : '#2563EB'} />
            </View>
            <View style={styles.infoTextWrapper}>
              <Text style={[styles.infoLabel, { color: colors.text }]}>PIX instantâneo</Text>
              <Text style={[styles.infoValue, { color: colors.textSecondary }]}>
                Pagamentos via PIX são aprovados na hora. O profissional recebe a confirmação instantaneamente para dar andamento ao serviço.
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.infoRow}>
            <View style={[styles.iconWrapper, { backgroundColor: isDark ? 'rgba(37, 99, 235, 0.16)' : '#EFF6FF' }]}>
              <CreditCard size={20} color={isDark ? '#60A5FA' : '#2563EB'} />
            </View>
            <View style={styles.infoTextWrapper}>
              <Text style={[styles.infoLabel, { color: colors.text }]}>Cartão de Crédito</Text>
              <Text style={[styles.infoValue, { color: colors.textSecondary }]}>
                Aceitamos as principais bandeiras com aprovação rápida e parcelamento seguro.
              </Text>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.partnerBadge,
            {
              backgroundColor: isDark ? 'rgba(16, 185, 129, 0.16)' : '#ECFDF5',
              borderColor: isDark ? 'rgba(52, 211, 153, 0.35)' : '#A7F3D0',
            },
          ]}
        >
          <Text style={[styles.badgeText, { color: isDark ? '#6EE7B7' : '#065F46' }]}>BaaS Oficial DelFinance 🛡️</Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.backgroundCard, borderTopColor: colors.border }]}>
        <Button fullWidth onPress={() => router.back()}>
          Entendi
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    gap: 24,
    alignItems: 'center',
  },
  heroCard: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTextWrapper: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 13,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  partnerBadge: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    padding: 24,
    borderTopWidth: 1,
  },
});
