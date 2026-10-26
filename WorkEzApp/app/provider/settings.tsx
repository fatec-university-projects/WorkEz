import { useRouter } from 'expo-router';
import { ArrowLeft, User, CreditCard, FileText, MapPin, Bell, HelpCircle, ChevronRight } from 'lucide-react-native';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

import { ScreenHeader } from '../../components/ScreenHeader';
import { useAppTheme } from '../../contexts/ThemeContext';

export default function ProviderSettings() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();

  const menuItems = [
    { icon: User,        label: 'Dados pessoais',         path: '/provider/edit-profile' },
    { icon: CreditCard,  label: 'Dados bancários',         path: '#' },
    { icon: FileText,    label: 'Documentos',               path: '#' },
    { icon: MapPin,      label: 'Regiões de atendimento',  path: '#' },
    { icon: Bell,        label: 'Notificações',            path: '#' },
    { icon: HelpCircle,  label: 'Ajuda e suporte',         path: '/help' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundAlt }]}>
      <ScreenHeader title="Configurações" showBack />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
          {menuItems.map((item, i) => {
            const Icon = item.icon;
            const isDisabled = item.path === '#';
            return (
              <TouchableOpacity
                key={item.label}
                onPress={() => !isDisabled && router.push(item.path as any)}
                disabled={isDisabled}
                activeOpacity={0.7}
                style={[
                  styles.menuItem,
                  i < menuItems.length - 1 && [styles.menuItemBorder, { borderBottomColor: colors.border }],
                  isDisabled && styles.menuItemDisabled,
                ]}
              >
                <View style={[styles.iconBadge, { backgroundColor: isDark ? 'rgba(37,99,235,0.18)' : 'rgba(37,99,235,0.08)' }]}>
                  <Icon size={20} color={isDark ? '#60A5FA' : '#2563EB'} />
                </View>
                <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
                {!isDisabled && <ChevronRight size={18} color={colors.textSecondary} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 24, gap: 16, flexGrow: 1 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, gap: 12 },
  menuItemBorder: { borderBottomWidth: 1 },
  menuItemDisabled: { opacity: 0.4 },
  iconBadge: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
});
