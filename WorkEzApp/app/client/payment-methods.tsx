import { useRouter } from 'expo-router';
import { ArrowLeft, ShieldCheck, CreditCard, QrCode, Lock } from 'lucide-react-native';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { WorkEzTheme } from '../../constants/theme';
import { Button } from '../../components/Button';

export default function PaymentMethods() {
  const router = useRouter();

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
          <Text style={styles.headerTitle}>Formas de pagamento</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Safe banner */}
        <View style={styles.heroCard}>
          <View style={styles.iconCircle}>
            <Lock size={36} color="#10B981" />
          </View>
          <Text style={styles.heroTitle}>Pagamento 100% Seguro</Text>
          <Text style={styles.heroSubtitle}>
            Todos os pagamentos dentro da plataforma WorkEz são processados com total segurança através do AbacatePay.
          </Text>
        </View>

        {/* Info list */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Como funciona o processamento?</Text>

          <View style={styles.infoRow}>
            <View style={[styles.iconWrapper, { backgroundColor: '#ECFDF5' }]}>
              <ShieldCheck size={20} color="#10B981" />
            </View>
            <View style={styles.infoTextWrapper}>
              <Text style={styles.infoLabel}>Proteção de dados</Text>
              <Text style={styles.infoValue}>
                Não salvamos seus dados de cartão nos nossos servidores. Todo o processamento é feito diretamente pelo ambiente seguro do AbacatePay.
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={[styles.iconWrapper, { backgroundColor: '#EFF6FF' }]}>
              <QrCode size={20} color="#2563EB" />
            </View>
            <View style={styles.infoTextWrapper}>
              <Text style={styles.infoLabel}>PIX instantâneo</Text>
              <Text style={styles.infoValue}>
                Pagamentos via PIX são aprovados na hora. O profissional recebe a confirmação instantaneamente para dar andamento ao serviço.
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={[styles.iconWrapper, { backgroundColor: '#EFF6FF' }]}>
              <CreditCard size={20} color="#2563EB" />
            </View>
            <View style={styles.infoTextWrapper}>
              <Text style={styles.infoLabel}>Cartão de Crédito</Text>
              <Text style={styles.infoValue}>
                Aceitamos as principais bandeiras com aprovação rápida e parcelamento seguro.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.abacateBadge}>
          <Text style={styles.badgeText}>Parceiro Oficial AbacatePay 🥑</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
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
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0F172A',
  },
  scrollContent: {
    padding: 24,
    gap: 24,
    alignItems: 'center',
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    color: '#0F172A',
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
    color: '#0F172A',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 16,
  },
  abacateBadge: {
    backgroundColor: '#ECFDF5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#065F46',
  },
  footer: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
});
