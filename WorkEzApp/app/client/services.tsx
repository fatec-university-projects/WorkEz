import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ServiceCard } from '../../components/ServiceCard';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { AntigravityTheme } from '../../constants/theme';

export default function MyServices() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'in-progress' | 'completed' | 'cancelled'>('in-progress');

  const services = {
    'in-progress': [
      {
        id: 1,
        category: 'Encanador',
        description: 'Torneira da cozinha está vazando',
        date: 'Hoje, 14:30',
        professional: 'Carlos Silva',
      },
    ],
    completed: [
      {
        id: 2,
        category: 'Eletricista',
        description: 'Instalação de ventilador de teto',
        date: '15 Abr',
        professional: 'João Alves',
      },
      {
        id: 3,
        category: 'Pintor',
        description: 'Pintura da sala e quarto',
        date: '10 Abr',
        professional: 'Maria Santos',
      },
    ],
    cancelled: [
      {
        id: 4,
        category: 'Diarista',
        description: 'Limpeza geral do apartamento',
        date: '08 Abr',
      },
    ],
  };

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
  tabsContainer: {
    backgroundColor: AntigravityTheme.colors.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: AntigravityTheme.colors.border,
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
    ...AntigravityTheme.typography.base,
    color: AntigravityTheme.colors.textSecondary,
  },
  tabTextActive: {
    color: '#2563EB',
    fontWeight: AntigravityTheme.typography.fontWeight.semibold,
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
    ...AntigravityTheme.typography.base,
    color: AntigravityTheme.colors.textSecondary,
  },
});
