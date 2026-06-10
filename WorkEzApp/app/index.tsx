import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Logo } from "../components/Logo";
import { View, Text } from 'react-native';

export default function Splash() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/onboarding');
    }, 2500);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View className="min-h-screen bg-gradient-to-br from-[#2563EB] to-[#1d4ed8] flex flex-col items-center justify-center p-8">
      <View className="w-32 h-32 mb-6 scale-150">
        <Logo />
      </View>
      <Text className="text-white/90 text-center text-lg max-w-sm mt-4">
        Serviços profissionais, quando você precisar.
      </Text>
    </View>
  );
}
