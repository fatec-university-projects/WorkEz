import { useRouter } from 'expo-router';
import { ArrowLeft, User, CreditCard, FileText, MapPin, Bell, HelpCircle, ChevronRight } from 'lucide-react-native';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

import { ScreenHeader } from '../../components/ScreenHeader';

export default function ProviderSettings() {
  const router = useRouter();

  const menuItems = [
    { icon: User,        label: 'Dados pessoais',         path: '/provider/edit-profile' },
    { icon: CreditCard,  label: 'Dados bancários',         path: '#' },
    { icon: FileText,    label: 'Documentos',               path: '#' },
    { icon: MapPin,      label: 'Regiões de atendimento',  path: '#' },
    { icon: Bell,        label: 'Notificações',            path: '#' },
    { icon: HelpCircle,  label: 'Ajuda e suporte',         path: '/help' },
  ];

  return (
    <View style={styles.container}>
      <ScreenHeader title="Configurações" showBack />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          {menuItems.map((item, i) => {
            const Icon = item.icon;
            const isDisabled = item.path === '#';
            return (
              <TouchableOpacity
                key={item.label}
                onPress={() => !isDisabled && router.push(item.path as any)}
                disabled={isDisabled}
                activeOpacity={0.7}
                style={[styles.menuItem, i < menuItems.length - 1 && styles.menuItemBorder, isDisabled && styles.menuItemDisabled]}
              >
                <View style={styles.iconBadge}>
                  <Icon size={20} color="#2563EB" />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                {!isDisabled && <ChevronRight size={18} color="#CBD5E1" />}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: { padding: 8, borderRadius: 8, backgroundColor: '#F1F5F9' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#0F172A' },
  scrollContent: { padding: 24, gap: 16, flexGrow: 1 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, gap: 12 },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  menuItemDisabled: { opacity: 0.4 },
  iconBadge: { width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(37,99,235,0.08)', alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: '#0F172A' },
});