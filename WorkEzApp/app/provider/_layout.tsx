import { Slot, usePathname } from 'expo-router';
import { BottomNav } from '../../components/BottomNav';
import { View } from 'react-native';

const ROUTES_WITHOUT_NAV = [
  '/provider/signup',
  '/provider/work-area',
  '/provider/documents',
  '/provider/references',
  '/provider/interview',
  '/provider/analysis',
  '/provider/new-call',
  '/provider/in-progress',
  '/provider/waiting-payment',
];

export default function ProviderLayout() {
  const pathname = usePathname();
  const showNav = !ROUTES_WITHOUT_NAV.some(route => pathname.startsWith(route));

  return (
    <View className="flex-1 bg-[#F8FAFC]">
      <View className="flex-1">
        <Slot />
      </View>
      {showNav && <BottomNav type="provider" />}
    </View>
  );
}
