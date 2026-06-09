import { useState, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { ServiceCard } from '../../components/ServiceCard';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { WorkEzTheme } from '../../constants/theme';
import { useFetch } from '../../hooks/useFetch';
import { useAuth } from '../../contexts/AuthContext';

interface Service {
  id: string;
  category: string;
  description: string;
  date: string;
  status: 'in-progress' | 'completed' | 'cancelled';
  professional?: string;
}

export default function MyServices() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'in-progress' | 'completed' | 'cancelled'>('in-progress');

  const { data: fetchedServices, loading, error } = useFetch<Service[]>(
    user ? `/api/Services/by-customer/${user.id}` : null
  );

  const services = useMemo(() => {
    const defaultGrouping: Record<string, Service[]> = {
      'in-progress': [],
      'completed': [],
      'cancelled': [],
    };
    if (!fetchedServices) return defaultGrouping;

    return fetchedServices.reduce((acc, curr) => {
      const status = curr.status || 'in-progress';
      if (!acc[status]) acc[status] = [];
      acc[status].push(curr);
      return acc;
    }, defaultGrouping);
  }, [fetchedServices]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Meus serviços</Text>
      </View>

      <View style={styles.tabsContainer}>
        <View style={styles.tabsRow}>
          {[
            { key: 'in-progress', label: 'Em andamento' },
            { key: 'completed', label: 'Concluídos' },
            { key: 'cancelled', label: 'Cancelados' },
          ].map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key as typeof activeTab)}
                style={styles.tabButton}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab.label}
                </Text>
                {isActive && <View style={styles.activeIndicator} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <View style={{ padding: 48, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={WorkEzTheme.colors.primary} />
            <Text style={{ marginTop: 16, color: WorkEzTheme.colors.textSecondary }}>Carregando serviços...</Text>
          </View>
        ) : error ? (
          <View style={{ padding: 48, alignItems: 'center' }}>
            <Text style={{ color: WorkEzTheme.colors.danger }}>{error}</Text>
          </View>
        ) : (
          <View style={styles.servicesList}>
            {services[activeTab].map((service) => (
              <ServiceCard
                key={service.id}
                category={service.category}
                description={service.description}
                status={activeTab as any}
                date={service.date}
                professional={service.professional}
                onClick={() => router.push(`/client/tracking/${service.id}`)}
              />
            ))}

            {services[activeTab].length === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Nenhum serviço encontrado</Text>
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
  scrollContent: {
    flexGrow: 1,
  },
  servicesList: {
    padding: 24,
    gap: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    ...WorkEzTheme.typography.base,
    color: WorkEzTheme.colors.textSecondary,
  },
});
