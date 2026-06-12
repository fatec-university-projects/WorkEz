import { useRouter } from 'expo-router';
import { User, MapPin, CreditCard, HelpCircle, LogOut, ChevronRight } from 'lucide-react-native';
import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { WorkEzTheme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useFetch } from '../../hooks/useFetch';

import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  photo?: string;
  phone?: string;
}

export default function ClientProfile() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const { data: profile, loading, error, refetch } = useFetch<CustomerProfile>(
    user ? `/api/Customers/by-user/${user.id}` : null
  );

  useFocusEffect(
    useCallback(() => {
      if (user) {
        refetch();
      }
    }, [user, refetch])
  );

  const menuItems = [
    { icon: User, label: 'Dados pessoais', path: '/client/edit-profile' },
    { icon: MapPin, label: 'Meus endereços', path: '#' },
    { icon: CreditCard, label: 'Formas de pagamento', path: '#' },
    { icon: HelpCircle, label: 'Ajuda e suporte', path: '/help' },
  ];

  const handleLogout = () => {
    signOut();
    router.replace('/' as any);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Perfil</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.profileCard}>
          {loading ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={WorkEzTheme.colors.primary} />
            </View>
          ) : (
            <View style={styles.profileRow}>
              {profile?.photo ? (
                <Image
                  source={{ uri: profile.photo }}
                  style={styles.avatar}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <User size={32} color={WorkEzTheme.colors.textSecondary} />
                </View>
              )}
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{profile?.name || user?.name || 'Cliente'}</Text>
                <Text style={styles.profileEmail}>{profile?.email || user?.email || 'email@exemplo.com'}</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.menuCard}>
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isLast = index === menuItems.length - 1;
            return (
              <TouchableOpacity
                key={index}
                onPress={() => router.push(item.path as any)}
                style={[styles.menuItem, isLast && styles.menuItemLast]}
              >
                <Icon size={20} color={WorkEzTheme.colors.textSecondary} />
                <Text style={styles.menuItemText}>{item.label}</Text>
                <ChevronRight size={20} color={WorkEzTheme.colors.textSecondary} />
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          onPress={handleLogout}
          style={styles.logoutButton}
        >
          <LogOut size={20} color={WorkEzTheme.colors.danger} />
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
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
  },
  profileCard: {
    backgroundColor: WorkEzTheme.colors.backgroundCard,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: WorkEzTheme.colors.border,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    resizeMode: 'cover',
  },
  avatarPlaceholder: {
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    ...WorkEzTheme.typography.xl,
    fontWeight: WorkEzTheme.typography.fontWeight.semibold,
    color: WorkEzTheme.colors.text,
  },
  profileEmail: {
    ...WorkEzTheme.typography.sm,
    color: WorkEzTheme.colors.textSecondary,
  },
  menuCard: {
    backgroundColor: WorkEzTheme.colors.backgroundCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WorkEzTheme.colors.border,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: WorkEzTheme.colors.border,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemText: {
    flex: 1,
    ...WorkEzTheme.typography.base,
    color: WorkEzTheme.colors.text,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: WorkEzTheme.colors.backgroundCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WorkEzTheme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  logoutText: {
    flex: 1,
    ...WorkEzTheme.typography.base,
    color: WorkEzTheme.colors.danger,
    fontWeight: WorkEzTheme.typography.fontWeight.medium,
  },
});
