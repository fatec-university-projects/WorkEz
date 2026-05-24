import { useRouter } from 'expo-router';
import { User, Wrench } from 'lucide-react-native';
import { View, Text, TouchableOpacity } from 'react-native';

export default function ProfileChoice() {
  const router = useRouter();

  return (
    <View className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
      <Text className="text-3xl font-bold text-[#0F172A] text-center mb-2">
        Como você quer usar o WorkEz?
      </Text>
      <Text className="text-[#94A3B8] text-center mb-12">
        Escolha uma opção para continuar
      </Text>

      <View className="w-full max-w-sm space-y-4">
        <TouchableOpacity
          onPress={() => router.push('/client')}
          className="w-full bg-white border-2 border-[#E2E8F0] rounded-2xl p-6 hover:border-[#2563EB] hover:shadow-lg transition-all group"
        >
          <View className="flex items-center gap-4">
            <View className="w-16 h-16 bg-[#2563EB]/10 rounded-2xl flex items-center justify-center group-hover:bg-[#2563EB] transition-colors">
              <User className="w-8 h-8 text-[#2563EB] group-hover:text-white transition-colors" />
            </View>
            <View className="text-left">
              <Text className="text-xl font-semibold text-[#0F172A]">Sou cliente</Text>
              <Text className="text-sm text-[#94A3B8] mt-1">
                Preciso contratar serviços
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/provider/signup')}
          className="w-full bg-white border-2 border-[#E2E8F0] rounded-2xl p-6 hover:border-[#2563EB] hover:shadow-lg transition-all group"
        >
          <View className="flex items-center gap-4">
            <View className="w-16 h-16 bg-[#26FFF5]/10 rounded-2xl flex items-center justify-center group-hover:bg-[#26FFF5] transition-colors">
              <Wrench className="w-8 h-8 text-[#26FFF5] group-hover:text-white transition-colors" />
            </View>
            <View className="text-left">
              <Text className="text-xl font-semibold text-[#0F172A]">Sou prestador</Text>
              <Text className="text-sm text-[#94A3B8] mt-1">
                Quero oferecer meus serviços
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={() => router.push('/login')}
        className="mt-8 text-[#94A3B8] text-sm"
      >
        Já tenho uma conta
      </TouchableOpacity>
    </View>
  );
}
