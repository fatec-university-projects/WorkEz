import { useRouter } from 'expo-router';
import { CheckCircle, Clock, Circle } from 'lucide-react-native';
import { Button } from '../../components/Button';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function RegistrationAnalysis() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const steps = [
    { label: 'Dados enviados', completed: true },
    { label: 'Documentos em análise', completed: true },
    { label: 'Verificação de referências', completed: false },
    { label: 'Entrevista agendada', completed: false },
    { label: 'Aprovação final', completed: false },
  ];

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.headerBanner,
          { paddingTop: insets.top > 0 ? insets.top + 16 : 48 }
        ]}
      >
        <View style={styles.clockCircle}>
          <Clock size={32} color="#FFFFFF" />
        </View>
        <Text style={styles.bannerTitle}>Cadastro em análise</Text>
        <Text style={styles.bannerSubtitle}>
          Estamos verificando suas informações
        </Text>
      </View>

      <ScrollView 
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom > 0 ? insets.bottom + 24 : 32 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Status do cadastro
          </Text>

          <View style={styles.stepsList}>
            {steps.map((step, index) => (
              <View key={index} style={styles.stepRow}>
                <View style={styles.stepIndicatorCol}>
                  {step.completed ? (
                    <View style={styles.stepDotCompleted}>
                      <CheckCircle size={14} color="#FFFFFF" />
                    </View>
                  ) : index === 2 ? (
                    <View style={styles.stepDotActive}>
                      <Clock size={14} color="#FFFFFF" />
                    </View>
                  ) : (
                    <Circle size={20} color="#CBD5E1" />
                  )}
                  {index < steps.length - 1 && (
                    <View
                      style={[
                        styles.stepLine,
                        step.completed ? styles.stepLineCompleted : styles.stepLinePending
                      ]}
                    />
                  )}
                </View>
                <View style={styles.stepContentCol}>
                  <Text
                    style={[
                      styles.stepLabel,
                      step.completed && styles.stepLabelCompleted,
                      index === 2 && styles.stepLabelActive
                    ]}
                  >
                    {step.label}
                  </Text>
                  {index === 2 && (
                    <Text style={styles.stepSubtext}>Em andamento</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.tipBox}>
          <Text style={styles.tipTitle}>
            Tempo estimado
          </Text>
          <Text style={styles.tipText}>
            O processo de verificação leva em média 3-5 dias úteis. Você receberá atualizações por e-mail.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Enquanto isso...
          </Text>
          <View style={styles.tipsList}>
            <View style={styles.tipRow}>
              <Text style={styles.checkIcon}>✓</Text>
              <Text style={styles.tipRowText}>Baixe o app e configure suas notificações</Text>
            </View>
            <View style={styles.tipRow}>
              <Text style={styles.checkIcon}>✓</Text>
              <Text style={styles.tipRowText}>Prepare fotos dos seus melhores trabalhos</Text>
            </View>
            <View style={styles.tipRow}>
              <Text style={styles.checkIcon}>✓</Text>
              <Text style={styles.tipRowText}>Revise suas ferramentas e equipamentos</Text>
            </View>
          </View>
        </View>

        <Button fullWidth onPress={() => router.push('/')}>
          Voltar ao início
        </Button>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerBanner: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingBottom: 28,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  clockCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  bannerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  scrollContent: {
    padding: 20,
    gap: 16,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
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
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
  },
  stepsList: {
    gap: 0,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepIndicatorCol: {
    alignItems: 'center',
    width: 24,
  },
  stepDotCompleted: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLine: {
    width: 2,
    height: 28,
    marginVertical: 2,
  },
  stepLineCompleted: {
    backgroundColor: '#16A34A',
  },
  stepLinePending: {
    backgroundColor: '#E2E8F0',
  },
  stepContentCol: {
    flex: 1,
    paddingTop: 1,
    paddingBottom: 16,
  },
  stepLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  stepLabelCompleted: {
    color: '#0F172A',
    fontWeight: '600',
  },
  stepLabelActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  stepSubtext: {
    fontSize: 12,
    color: '#2563EB',
    marginTop: 2,
  },
  tipBox: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 14,
    padding: 16,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1D4ED8',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  tipsList: {
    gap: 10,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  checkIcon: {
    color: '#16A34A',
    fontWeight: '700',
    fontSize: 14,
  },
  tipRowText: {
    fontSize: 13,
    color: '#64748B',
    flex: 1,
    lineHeight: 18,
  },
});
