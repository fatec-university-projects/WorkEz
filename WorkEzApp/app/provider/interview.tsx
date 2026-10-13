import { useRouter } from 'expo-router';
import { Video, Calendar } from 'lucide-react-native';
import { Button } from '../../components/Button';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Interview() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top > 0 ? insets.top + 24 : 40,
            paddingBottom: insets.bottom > 0 ? insets.bottom + 24 : 40,
          }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentWrap}>
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Video size={36} color="#2563EB" />
            </View>
            <Text style={styles.title}>
              Entrevista de alinhamento
            </Text>
            <Text style={styles.subtitle}>
              Última etapa do processo de cadastro
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>O que esperar?</Text>

            <View style={styles.stepsList}>
              <View style={styles.stepItem}>
                <View style={styles.stepNumberBadge}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTitle}>Validação de experiência</Text>
                  <Text style={styles.stepDesc}>
                    Conversaremos sobre sua trajetória profissional
                  </Text>
                </View>
              </View>

              <View style={styles.stepItem}>
                <View style={styles.stepNumberBadge}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTitle}>Funcionamento da plataforma</Text>
                  <Text style={styles.stepDesc}>
                    Explicaremos como funciona o WorkEz
                  </Text>
                </View>
              </View>

              <View style={styles.stepItem}>
                <View style={styles.stepNumberBadge}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTitle}>Dúvidas</Text>
                  <Text style={styles.stepDesc}>
                    Espaço para você tirar suas dúvidas
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.infoBox}>
            <Calendar size={20} color="#2563EB" style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>
                Nossa equipe entrará em contato
              </Text>
              <Text style={styles.infoDesc}>
                Você receberá um e-mail em até 48 horas para agendar sua entrevista.
              </Text>
            </View>
          </View>

          <Button fullWidth onPress={() => router.push('/provider/analysis')}>
            Entendi, continuar
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  contentWrap: {
    width: '100%',
    maxWidth: 480,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
  },
  stepsList: {
    gap: 16,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  stepDesc: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 18,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1D4ED8',
    marginBottom: 2,
  },
  infoDesc: {
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
});
