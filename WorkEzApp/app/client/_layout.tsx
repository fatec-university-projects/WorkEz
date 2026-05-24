import { Slot, usePathname } from 'expo-router';
import { BottomNav } from '../../components/BottomNav';
import { View } from 'react-native';

const ROUTES_WITHOUT_NAV = [
  '/client/searching',
  '/client/found',
  '/client/tracking',
  '/client/payment',
  '/client/completed',
  '/client/rating',
];

export default function ClientLayout() {
  const pathname = usePathname();
  const showNav = !ROUTES_WITHOUT_NAV.some(route => pathname.startsWith(route));

  return (
    <View className="flex-1 bg-[#F8FAFC]">
      <View className="flex-1">
        <Slot />
      </View>
      {showNav && <BottomNav type="client" />}
    </View>
  );
}
