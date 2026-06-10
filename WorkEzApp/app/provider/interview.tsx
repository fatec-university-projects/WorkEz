import { useRouter } from 'expo-router';
import { Video, Calendar } from 'lucide-react-native';
import { Button } from '../../components/Button';
import { View, Text } from 'react-native';

export default function Interview() {
  const router = useRouter();

  return (
    <View className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
      <View className="w-full max-w-md">
        <View className="text-center mb-8">
          <View className="w-20 h-20 bg-[#2563EB]/10 rounded-full flex-row items-center justify-center mx-auto mb-4">
            <Video className="w-10 h-10 text-[#2563EB]" />
          </View>
          <Text className="text-3xl font-bold text-[#0F172A] mb-2">
            Entrevista de alinhamento
          </Text>
          <Text className="text-[#64748B]">
            Última etapa do processo de cadastro
          </Text>
        </View>

        <View className="bg-white rounded-2xl p-6 shadow-sm border border-[#E2E8F0] mb-6">
          <Text className="font-semibold text-[#0F172A] mb-4">O que esperar?</Text>

          <View className="space-y-3">
            <View className="flex-row items-start gap-3">
              <View className="w-6 h-6 bg-[#26FFF5] rounded-full flex-row items-center justify-center flex-shrink-0 mt-0.5">
                <Text className="text-white text-xs font-bold">1</Text>
              </View>
              <View>
                <Text className="font-medium text-[#0F172A]">Validação de experiência</Text>
                <Text className="text-sm text-[#64748B]">
                  Conversaremos sobre sua trajetória profissional
                </Text>
              </View>
            </View>

            <View className="flex-row items-start gap-3">
              <View className="w-6 h-6 bg-[#26FFF5] rounded-full flex-row items-center justify-center flex-shrink-0 mt-0.5">
                <Text className="text-white text-xs font-bold">2</Text>
              </View>
              <View>
                <Text className="font-medium text-[#0F172A]">Funcionamento da plataforma</Text>
                <Text className="text-sm text-[#94A3B8]">
                  Explicaremos como funciona o WorkEz
                </Text>
              </View>
            </View>

            <View className="flex-row items-start gap-3">
              <View className="w-6 h-6 bg-[#26FFF5] rounded-full flex-row items-center justify-center flex-shrink-0 mt-0.5">
                <Text className="text-white text-xs font-bold">3</Text>
              </View>
              <View>
                <Text className="font-medium text-[#0F172A]">Dúvidas</Text>
                <Text className="text-sm text-[#64748B]">
                  Espaço para você tirar suas dúvidas
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-4 mb-6">
          <View className="flex-row items-start gap-3">
            <Calendar className="w-5 h-5 text-[#2563EB] flex-shrink-0 mt-0.5" />
            <View>
              <Text className="font-medium text-[#1d4ed8] mb-1">
                Nossa equipe entrará em contato
              </Text>
              <Text className="text-sm text-[#1e40af]">
                Você receberá um e-mail em até 48 horas para agendar sua entrevista.
              </Text>
            </View>
          </View>
        </View>

        <Button fullWidth onPress={() => router.push('/provider/analysis')}>
          Entendi, continuar
        </Button>
      </View>
    </View>
  );
}
