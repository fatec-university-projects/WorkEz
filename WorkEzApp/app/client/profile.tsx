import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { User, MapPin, HelpCircle, LogOut, ChevronRight, Sun, Moon, Smartphone } from 'lucide-react-native';
import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { WorkEzTheme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useAppTheme, ThemeMode } from '../../contexts/ThemeContext';
import { useFetch } from '../../hooks/useFetch';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  photo?: string;
  phone?: string;
}

export default function ClientProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { mode, isDark, colors, setMode } = useAppTheme();

  const { data: profile, loading, refetch } = useFetch<CustomerProfile>(
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
    { icon: MapPin, label: 'Meus endereços', path: '/client/addresses' },
    { icon: HelpCircle, label: 'Ajuda e suporte', path: '/help' },
  ];

  const themeOptions: { key: ThemeMode; label: string; icon: any }[] = [
    { key: 'light', label: 'Claro', icon: Sun },
    { key: 'dark', label: 'Escuro', icon: Moon },
    { key: 'system', label: 'Sistema', icon: Smartphone },
  ];

  const handleLogout = () => {
    signOut();
    router.replace('/' as any);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundAlt }]}>
      <ScreenHeader title="Perfil" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 110 + (insets.bottom > 0 ? insets.bottom : 20) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View
            style={[
              styles.profileCard,
              { backgroundColor: colors.backgroundCard, borderColor: colors.border },
            ]}
          >
            {loading ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : (
              <View style={styles.profileRow}>
                {profile?.photo || user?.photo || user?.profilePicture ? (
                  <Image
                    source={{ uri: (profile?.photo || user?.photo || user?.profilePicture)! }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.backgroundAlt }]}>
                    <User size={32} color={colors.textSecondary} />
                  </View>
                )}
                <View style={styles.profileInfo}>
                  <Text style={[styles.profileName, { color: colors.text }]}>
                    {profile?.name || user?.name || 'Cliente'}
                  </Text>
                  <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>
                    {profile?.email || user?.email || 'email@exemplo.com'}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* ── Seletor de Tema (Claro / Escuro / Sistema) ── */}
          <View
            style={[
              styles.themeCard,
              { backgroundColor: colors.backgroundCard, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.themeTitle, { color: colors.text }]}>Aparência do aplicativo</Text>
            <Text style={[styles.themeSubtitle, { color: colors.textSecondary }]}>
              Escolha entre o modo claro, escuro ou automático do celular
            </Text>
            <View style={[styles.themeSegmentedRow, { backgroundColor: colors.backgroundAlt }]}>
              {themeOptions.map((opt) => {
                const Icon = opt.icon;
                const active = mode === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    activeOpacity={0.8}
                    onPress={() => setMode(opt.key)}
                    style={[
                      styles.themeOptionBtn,
                      active && {
                        backgroundColor: isDark ? '#2563EB' : '#FFFFFF',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.1,
                        shadowRadius: 2,
                        elevation: 2,
                      },
                    ]}
                  >
                    <Icon
                      size={16}
                      color={active ? (isDark ? '#FFFFFF' : '#2563EB') : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.themeOptionText,
                        {
                          color: active ? (isDark ? '#FFFFFF' : '#0F172A') : colors.textSecondary,
                          fontWeight: active ? '700' : '500',
                        },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View
            style={[
              styles.menuCard,
              { backgroundColor: colors.backgroundCard, borderColor: colors.border },
            ]}
          >
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              const isLast = index === menuItems.length - 1;
              const isDisabled = item.path === '#';
              return (
                <TouchableOpacity
                  key={index}
                  onPress={() => !isDisabled && router.push(item.path as any)}
                  disabled={isDisabled}
                  style={[
                    styles.menuItem,
                    { borderBottomColor: colors.border },
                    isLast && styles.menuItemLast,
                    { opacity: isDisabled ? 0.4 : 1 },
                  ]}
                >
                  <Icon size={20} color={colors.textSecondary} />
                  <Text style={[styles.menuItemText, { color: colors.text }]}>{item.label}</Text>
                  {!isDisabled && <ChevronRight size={20} color={colors.textSecondary} />}
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            onPress={handleLogout}
            style={[
              styles.logoutButton,
              { backgroundColor: colors.backgroundCard, borderColor: colors.border },
            ]}
          >
            <LogOut size={20} color={colors.danger} />
            <Text style={[styles.logoutText, { color: colors.danger }]}>Sair</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: 24,
  },
  profileCard: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    marginBottom: 16,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    ...WorkEzTheme.typography.xl,
    fontWeight: WorkEzTheme.typography.fontWeight.semibold,
  },
  profileEmail: {
    ...WorkEzTheme.typography.sm,
  },
  themeCard: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  themeTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  themeSubtitle: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 12,
  },
  themeSegmentedRow: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    gap: 6,
  },
  themeOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 9,
  },
  themeOptionText: {
    fontSize: 13,
  },
  menuCard: {
    borderRadius: 16,
    borderWidth: 1,
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
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemText: {
    flex: 1,
    ...WorkEzTheme.typography.base,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  logoutText: {
    flex: 1,
    ...WorkEzTheme.typography.base,
    fontWeight: WorkEzTheme.typography.fontWeight.medium,
  },
});
