import { useState, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { ServiceCard } from '../../components/ServiceCard';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
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
  const [activeTab, setActiveTab] = useState<'opportunities' | 'accepted'>('opportunities');

  // Fetch opportunities (open calls matching category)
  const { data: opportunities, loading: loadingOps, error: errorOps, refetch: refetchOps } = useFetch<Call[]>(
    user ? `/api/Services/opportunities-by-user/${user.id}` : null
  );

  // Fetch accepted calls using the static user session ID
  const { data: acceptedCalls, loading: loadingAcc, error: errorAcc, refetch: refetchAcc } = useFetch<Call[]>(
    user ? `/api/Services/by-provider-user/${user.id}` : null
  );

  // Refetch when the screen gets focus - dependencies are stable now
  useFocusEffect(
    useCallback(() => {
      refetchOps();
      refetchAcc();
    }, [refetchOps, refetchAcc])
  );

  const calls = activeTab === 'opportunities' ? opportunities : acceptedCalls;
  const loading = activeTab === 'opportunities' ? loadingOps : loadingAcc;
  const error = activeTab === 'opportunities' ? errorOps : errorAcc;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chamados</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <View style={styles.tabsRow}>
          <TouchableOpacity
            onPress={() => setActiveTab('opportunities')}
            style={styles.tabButton}
          >
            <Text style={[styles.tabText, activeTab === 'opportunities' && styles.tabTextActive]}>
              Novos Chamados
            </Text>
            {activeTab === 'opportunities' && <View style={styles.activeIndicator} />}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('accepted')}
            style={styles.tabButton}
          >
            <Text style={[styles.tabText, activeTab === 'accepted' && styles.tabTextActive]}>
              Trabalhos Aceitos
            </Text>
            {activeTab === 'accepted' && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
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
          <View style={styles.content}>
            {calls?.map((call) => (
              <ServiceCard
                key={call.id}
                category={call.category}
                description={call.description}
                status={activeTab === 'opportunities' ? 'pending' : call.status}
                date={call.date}
                professional={call.clientName}
                onClick={() => {
                  if (activeTab === 'opportunities') {
                    router.push(`/provider/new-call/${call.id}` as any);
                  } else {
                    if (call.status === 'on-the-way' || call.status === 'in-progress' || call.status === 'inprogress' || call.status === 'ontheway') {
                      router.push(`/provider/in-progress/${call.id}` as any);
                    } else if (call.status === 'waiting-payment' || call.status === 'waitingpayment') {
                      router.push(`/provider/waiting-payment/${call.id}` as any);
                    } else {
                      router.push(`/provider/accepted/${call.id}` as any);
                    }
                  }
                }}
              />
            ))}

            {(!calls || calls.length === 0) && (
              <View style={{ padding: 48, alignItems: 'center' }}>
                <Text style={{ color: WorkEzTheme.colors.textSecondary }}>
                  {activeTab === 'opportunities' 
                    ? 'Nenhum chamado no momento.' 
                    : 'Nenhum chamado aceito.'}
                </Text>
              </View>
            )}
          </View>
        )}
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
  tabsContainer: {
    backgroundColor: WorkEzTheme.colors.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: WorkEzTheme.colors.border,
    paddingHorizontal: 24,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 24,
  },
  tabButton: {
    paddingBottom: 12,
    paddingTop: 8,
    position: 'relative',
  },
  tabText: {
    ...WorkEzTheme.typography.base,
    color: WorkEzTheme.colors.textSecondary,
  },
  tabTextActive: {
    color: '#2563EB',
    fontWeight: WorkEzTheme.typography.fontWeight.semibold,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#2563EB',
  },
  content: {
    padding: 24,
    gap: 12,
  },
});
