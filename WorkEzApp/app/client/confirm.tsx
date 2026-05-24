import { useRouter } from 'expo-router';
import { ArrowLeft, MapPin, FileText, Image as ImageIcon, Wrench } from 'lucide-react-native';
import { Button } from '../../components/Button';
import { View, Text, TouchableOpacity } from 'react-native';

export default function ConfirmCall() {
  const router = useRouter();

  return (
    <View className="min-h-screen bg-[#F8FAFC]">
      <View className="bg-white px-6 py-4 border-b border-[#E2E8F0]">
        <View className="flex items-center gap-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 hover:bg-[#F1F5F9] rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-[#0F172A]" />
          </TouchableOpacity>
          <Text className="text-xl font-semibold text-[#0F172A]">
            Confirmar chamado
          </Text>
        </View>
      </View>

      <View className="p-6 space-y-6">
        <View className="bg-white rounded-2xl p-5 shadow-sm border border-[#E2E8F0]">
          <Text className="text-lg font-semibold text-[#0F172A] mb-4">
            Resumo do serviço
          </Text>

          <View className="space-y-4">
            <View>
              <View className="flex items-start gap-3">
                <View className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Wrench className="w-5 h-5 text-[#3B82F6]" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm text-[#64748B]">Categoria</Text>
                  <Text className="font-medium text-[#0F172A]">Encanador</Text>
                </View>
              </View>
            </View>

            <View className="flex items-start gap-3">
              <View className="w-10 h-10 bg-[#F1F5F9] rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-[#64748B]" />
              </View>
              <View className="flex-1">
                <Text className="text-sm text-[#64748B]">Descrição</Text>
                <Text className="font-medium text-[#0F172A]">
                  Torneira da cozinha está vazando. Preciso de reparo urgente.
                </Text>
              </View>
            </View>

            <View className="flex items-start gap-3">
              <View className="w-10 h-10 bg-[#F1F5F9] rounded-xl flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-[#64748B]" />
              </View>
              <View className="flex-1">
                <Text className="text-sm text-[#64748B]">Endereço</Text>
                <Text className="font-medium text-[#0F172A]">
                  Rua das Flores, 123 - Centro
                </Text>
              </View>
            </View>

            <View className="flex items-start gap-3">
              <View className="w-10 h-10 bg-[#F1F5F9] rounded-xl flex items-center justify-center flex-shrink-0">
                <ImageIcon className="w-5 h-5 text-[#64748B]" />
              </View>
              <View className="flex-1">
                <Text className="text-sm text-[#64748B]">Fotos anexadas</Text>
                <View className="flex gap-2 mt-2">
                  <View className="w-16 h-16 bg-[#E2E8F0] rounded-lg"></View>
                  <View className="w-16 h-16 bg-[#E2E8F0] rounded-lg"></View>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-4">
          <Text className="text-sm text-[#1d4ed8] leading-relaxed">
            <Text>Como funciona:</Text> Ao confirmar, buscaremos profissionais disponíveis próximos a você. O pagamento só será liberado após a conclusão do serviço.
          </Text>
        </View>
      </View>

      <View className="fixed bottom-0 left-0 right-0 bg-white p-6 border-t border-[#E2E8F0]">
        <View className="space-y-3">
          <Button
            fullWidth
            onPress={() => router.push('/client/searching')}
          >
            Confirmar chamado
          </Button>
          <Button
            variant="secondary"
            fullWidth
            onPress={() => router.back()}
          >
            Editar informações
          </Button>
        </View>
      </View>
    </View>
  );
}
