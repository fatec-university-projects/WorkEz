import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { ServiceCard } from '../../components/ServiceCard';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { WorkEzTheme } from '../../constants/theme';
import { useFetch } from '../../hooks/useFetch';
import { useAuth } from '../../contexts/AuthContext';
import { useAppTheme } from '../../contexts/ThemeContext';
import { ScreenHeader } from '../../components/ScreenHeader';

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
  const { isDark, colors } = useAppTheme();
  const [activeTab, setActiveTab] = useState<'in-progress' | 'completed' | 'cancelled'>('in-progress');

  const { data: customer } = useFetch<any>(
    user ? `/api/Customers/by-user/${user.id}` : null
  );

  const { data: fetchedServices, loading, error, refetch } = useFetch<Service[]>(
    customer ? `/api/Services/by-customer/${customer.id}` : null
  );

  useFocusEffect(
    useCallback(() => {
      if (customer) {
        refetch();
      }
    }, [customer, refetch])
  );

  useEffect(() => {
    if (!customer) return;
    const timer = setInterval(() => {
      refetch();
    }, 5000);
    return () => clearInterval(timer);
  }, [customer, refetch]);

  const services = useMemo(() => {
    const defaultGrouping: Record<'in-progress' | 'completed' | 'cancelled', Service[]> = {
      'in-progress': [],
      completed: [],
      cancelled: [],
    };
    if (!fetchedServices) return defaultGrouping;

    return fetchedServices.reduce((acc, curr) => {
      const rawStatus = curr.status || 'in-progress';
      const s = rawStatus.toLowerCase().replace(/[^a-z]/g, '');
      let mappedStatus: 'in-progress' | 'completed' | 'cancelled' = 'in-progress';

      if (s === 'completed' || s === 'concluido' || s === 'done' || s === 'finalizado') {
        mappedStatus = 'completed';
      } else if (s === 'cancelled' || s === 'cancelado' || s === 'refused') {
        mappedStatus = 'cancelled';
      } else {
        mappedStatus = 'in-progress';
      }

      acc[mappedStatus].push(curr);
      return acc;
    }, defaultGrouping);
  }, [fetchedServices]);

  const activeColor = isDark ? '#60A5FA' : '#2563EB';

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundAlt }]}>
      <ScreenHeader title="Meus serviços" />

      <View
        style={[
          styles.tabsContainer,
          { backgroundColor: colors.backgroundCard, borderBottomColor: colors.border },
        ]}
      >
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
                <Text
                  style={[
                    styles.tabText,
                    { color: colors.textSecondary },
                    isActive && [styles.tabTextActive, { color: activeColor }],
                  ]}
                >
                  {tab.label}
                </Text>
                {isActive && <View style={[styles.activeIndicator, { backgroundColor: activeColor }]} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <View style={{ padding: 48, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ marginTop: 16, color: colors.textSecondary }}>Carregando serviços...</Text>
          </View>
        ) : error ? (
          <View style={{ padding: 48, alignItems: 'center' }}>
            <Text style={{ color: colors.danger }}>{error}</Text>
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
                onClick={() => router.push(`/client/tracking/${service.id}?from=services` as any)}
              />
            ))}

            {services[activeTab].length === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Nenhum serviço encontrado
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
  },
  tabsContainer: {
    borderBottomWidth: 1,
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
  },
  tabTextActive: {
    fontWeight: WorkEzTheme.typography.fontWeight.semibold,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
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
  },
});
