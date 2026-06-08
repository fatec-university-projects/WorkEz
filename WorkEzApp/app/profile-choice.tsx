import { useRouter } from 'expo-router';
import { User, Wrench } from 'lucide-react-native';
import { View, Text, Pressable } from 'react-native';

export default function ProfileChoice() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-white items-center justify-center p-8">
      <Text className="text-3xl font-bold text-[#0F172A] text-center mb-2">
        Como você quer usar o WorkEz?
      </Text>
      <Text className="text-[#94A3B8] text-center mb-12">
        Escolha uma opção para continuar
      </Text>

      <View className="w-full max-w-sm gap-4">
        {/* Card Cliente */}
        <Pressable
          onPress={() => router.push('/client')}
          android_ripple={{ color: '#2563EB22' }}
          className="w-full bg-white border-2 border-[#E2E8F0] rounded-2xl p-6 active:border-[#2563EB]"
        >
          <View className="flex-row items-center gap-4">
            <View className="w-16 h-16 bg-[#EFF6FF] rounded-2xl items-center justify-center">
              <User className="w-8 h-8" color="#2563EB" />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-semibold text-[#0F172A]">Sou cliente</Text>
              <Text className="text-sm text-[#94A3B8] mt-1">Preciso contratar serviços</Text>
            </View>
          </View>
        </Pressable>

        {/* Card Prestador */}
        <Pressable
          onPress={() => router.push('/provider/signup')}
          android_ripple={{ color: '#26FFF522' }}
          className="w-full bg-white border-2 border-[#E2E8F0] rounded-2xl p-6 active:border-[#26FFF5]"
        >
          <View className="flex-row items-center gap-4">
            <View className="w-16 h-16 bg-[#F0FFFD] rounded-2xl items-center justify-center">
              <Wrench className="w-8 h-8" color="#26FFF5" />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-semibold text-[#0F172A]">Sou prestador</Text>
              <Text className="text-sm text-[#94A3B8] mt-1">Quero oferecer meus serviços</Text>
            </View>
          </View>
        </Pressable>
      </View>

      {/* Link de login — string SEMPRE dentro de <Text> */}
      <Pressable
        onPress={() => router.push('/login')}
        className="mt-8"
      ><Text className="text-[#94A3B8] text-sm">Já tenho uma conta</Text></Pressable>
    </View>
  );
}
