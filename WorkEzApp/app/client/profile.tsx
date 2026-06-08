import { useRouter } from 'expo-router';
import { User, MapPin, CreditCard, HelpCircle, LogOut, ChevronRight } from 'lucide-react-native';
import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView } from 'react-native';
import { AntigravityTheme } from '../../constants/theme';

export default function ClientProfile() {
  const router = useRouter();

  const menuItems = [
    { icon: User, label: 'Dados pessoais', path: '#' },
    { icon: MapPin, label: 'Meus endereços', path: '#' },
    { icon: CreditCard, label: 'Formas de pagamento', path: '#' },
    { icon: HelpCircle, label: 'Ajuda e suporte', path: '/help' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Perfil</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.profileRow}>
            <Image
              source={{ uri: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop" }}
              style={styles.avatar}
            />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>João Silva</Text>
              <Text style={styles.profileEmail}>joao.silva@email.com</Text>
            </View>
          </View>
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
                <Icon size={20} color={AntigravityTheme.colors.textSecondary} />
                <Text style={styles.menuItemText}>{item.label}</Text>
                <ChevronRight size={20} color={AntigravityTheme.colors.textSecondary} />
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          onPress={() => router.push('/')}
          style={styles.logoutButton}
        >
          <LogOut size={20} color={AntigravityTheme.colors.danger} />
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
  },
  profileCard: {
    backgroundColor: AntigravityTheme.colors.backgroundCard,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: AntigravityTheme.colors.border,
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
  profileInfo: {
    flex: 1,
  },
  profileName: {
    ...AntigravityTheme.typography.xl,
    fontWeight: AntigravityTheme.typography.fontWeight.semibold,
    color: AntigravityTheme.colors.text,
  },
  profileEmail: {
    ...AntigravityTheme.typography.sm,
    color: AntigravityTheme.colors.textSecondary,
  },
  menuCard: {
    backgroundColor: AntigravityTheme.colors.backgroundCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AntigravityTheme.colors.border,
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
    borderBottomColor: AntigravityTheme.colors.border,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemText: {
    flex: 1,
    ...AntigravityTheme.typography.base,
    color: AntigravityTheme.colors.text,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: AntigravityTheme.colors.backgroundCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AntigravityTheme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  logoutText: {
    flex: 1,
    ...AntigravityTheme.typography.base,
    color: AntigravityTheme.colors.danger,
    fontWeight: AntigravityTheme.typography.fontWeight.medium,
  },
});
