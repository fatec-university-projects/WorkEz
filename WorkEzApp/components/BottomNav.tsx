import { Href, usePathname, useRouter } from 'expo-router';
import { Briefcase, Heart, Home, User, Wallet } from 'lucide-react-native';
import { Text, TouchableOpacity, View } from 'react-native';

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
    <View className="bg-white border-t border-[#E2E8F0] z-50">
      <View className="max-w-md mx-auto w-full flex flex-row items-center justify-around px-2 py-2 pb-6">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;

          return (
            <TouchableOpacity
              key={item.path as string}
              onPress={() => router.push(item.path)}
              className="flex flex-col items-center gap-1 py-2 px-4 rounded-lg transition-all"
            >
              <Icon className={`w-6 h-6 ${isActive ? 'text-[#2563EB] stroke-[2.5]' : 'text-[#94A3B8]'}`} />
              <Text className={`text-xs font-medium ${isActive ? 'text-[#2563EB]' : 'text-[#94A3B8]'}`}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
