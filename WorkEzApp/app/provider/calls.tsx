import { useRouter } from 'expo-router';
import { ServiceCard } from '../../components/ServiceCard';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { AntigravityTheme } from '../../constants/theme';

export default function ProviderCalls() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chamados</Text>
      </View>
      <View style={styles.content}>
        <ServiceCard
          category="Encanador"
          description="Torneira da cozinha vazando"
          status="in-progress"
          date="Hoje, 14:30"
          professional="João Silva"
          onClick={() => router.push('/provider/new-call/1')}
        />
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
  },
  header: {
    backgroundColor: AntigravityTheme.colors.backgroundCard,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: AntigravityTheme.colors.border,
  },
  headerTitle: {
    ...AntigravityTheme.typography.xl,
    fontWeight: AntigravityTheme.typography.fontWeight.bold,
    color: AntigravityTheme.colors.text,
  },
  content: {
    padding: 24,
    gap: 12,
  },
});
