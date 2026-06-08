import { Href, usePathname, useRouter } from 'expo-router';
import { Briefcase, Heart, Home, User, Wallet } from 'lucide-react-native';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';

interface NavItem {
  icon: typeof Home;
  label: string;
  path: Href;
}

interface BottomNavProps {
  type: 'client' | 'provider';
}

export function BottomNav({ type }: BottomNavProps) {
  const router = useRouter();
  const pathname = usePathname();

  const clientNav: NavItem[] = [
    { icon: Home, label: 'Início', path: '/client' },
    { icon: Briefcase, label: 'Serviços', path: '/client/services' },
    { icon: Heart, label: 'Favoritos', path: '/client/favorites' },
    { icon: User, label: 'Perfil', path: '/client/profile' },
  ];

  const providerNav: NavItem[] = [
    { icon: Home, label: 'Início', path: '/provider' },
    { icon: Briefcase, label: 'Chamados', path: '/provider/calls' },
    { icon: Wallet, label: 'Carteira', path: '/provider/wallet' },
    { icon: User, label: 'Perfil', path: '/provider/profile' },
  ];

  const items = type === 'client' ? clientNav : providerNav;

  return (
    <View style={styles.container}>
      <View style={styles.navContent}>
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === (item.path as string);

          return (
            <TouchableOpacity
              key={item.path as string}
              onPress={() => router.push(item.path)}
              style={styles.navItem}
            >
              <Icon
                size={24}
                color={isActive ? '#2563EB' : '#94A3B8'}
                strokeWidth={isActive ? 2.5 : 1.8}
              />
              <Text
                style={[
                  styles.navText,
                  { color: isActive ? '#2563EB' : '#94A3B8' }
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    zIndex: 50,
  },
  navContent: {
    maxWidth: 448,
    alignSelf: 'center',
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 24,
  },
  navItem: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  navText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
