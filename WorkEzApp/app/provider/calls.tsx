import { useRouter } from 'expo-router';
import { ServiceCard } from '../../components/ServiceCard';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { WorkEzTheme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useFetch } from '../../hooks/useFetch';

interface Call {
  id: string;
  category: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  date: string;
  clientName: string;
}

export default function ProviderCalls() {
  const router = useRouter();
  const { user } = useAuth();

  const { data: calls, loading, error } = useFetch<Call[]>(
    user ? `/api/Providers/${user.id}/calls` : null
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chamados</Text>
      </View>
      <View style={styles.content}>
        {loading ? (
          <View style={{ padding: 48, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={WorkEzTheme.colors.primary} />
            <Text style={{ marginTop: 16, color: WorkEzTheme.colors.textSecondary }}>Buscando chamados...</Text>
          </View>
        ) : error ? (
          <View style={{ padding: 48, alignItems: 'center' }}>
            <Text style={{ color: WorkEzTheme.colors.danger }}>{error}</Text>
          </View>
        ) : (
          <>
            {calls?.map((call) => (
              <ServiceCard
                key={call.id}
                category={call.category}
                description={call.description}
                status={call.status as any}
                date={call.date}
                professional={call.clientName}
                onClick={() => router.push(`/provider/new-call/${call.id}`)}
              />
            ))}

            {(!calls || calls.length === 0) && (
              <View style={{ padding: 48, alignItems: 'center' }}>
                <Text style={{ color: WorkEzTheme.colors.textSecondary }}>Nenhum chamado no momento.</Text>
              </View>
            )}
          </>
        )}
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
    backgroundColor: WorkEzTheme.colors.backgroundCard,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: WorkEzTheme.colors.border,
  },
  headerTitle: {
    ...WorkEzTheme.typography.xl,
    fontWeight: WorkEzTheme.typography.fontWeight.bold,
    color: WorkEzTheme.colors.text,
  },
  content: {
    padding: 24,
    gap: 12,
  },
});
