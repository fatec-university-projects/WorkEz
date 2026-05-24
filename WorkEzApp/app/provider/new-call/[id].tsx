import { useRouter } from 'expo-router';
import { MapPin, FileText, Image as ImageIcon, X, Wrench, Timer, Star } from 'lucide-react-native';
import { Button } from '../../../components/Button';
import { View, Text, TouchableOpacity, Image } from 'react-native';

export default function NewCall() {
  const router = useRouter();

  return (
    <View className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <View className="bg-white px-6 py-4 border-b border-[#E2E8F0]">
        <View className="flex items-center justify-between">
          <Text className="text-xl font-semibold text-[#0F172A]">
            Novo chamado
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 hover:bg-[#F1F5F9] rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-[#0F172A]" />
          </TouchableOpacity>
        </View>
      </View>

      <View className="flex-1 p-6 space-y-6">
        <View className="bg-white rounded-2xl p-6 shadow-sm border border-[#E2E8F0]">
          <View className="flex items-center gap-3 mb-4">
            <View className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <Wrench className="w-5 h-5 text-[#3B82F6]" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-semibold text-[#0F172A]">Encanador</Text>
              <View className="flex items-center gap-3 text-sm text-[#64748B] mt-1">
                <View className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  2.3 km
                </View>
                <Text>•</Text>
                <Text>Centro</Text>
              </View>
            </View>
          </View>

          <View className="space-y-4 pt-4 border-t border-[#E2E8F0]">
            <View className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-[#64748B] flex-shrink-0 mt-0.5" />
              <View className="flex-1">
                <Text className="text-sm text-[#64748B] mb-1">Descrição</Text>
                <Text className="text-[#0F172A]">
                  Torneira da cozinha está vazando. Preciso de reparo urgente.
                </Text>
              </View>
            </View>

            <View className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-[#64748B] flex-shrink-0 mt-0.5" />
              <View className="flex-1">
                <Text className="text-sm text-[#64748B] mb-1">Endereço</Text>
                <Text className="text-[#0F172A]">Rua das Flores, 123 - Centro</Text>
              </View>
            </View>

            <View className="flex items-start gap-3">
              <ImageIcon className="w-5 h-5 text-[#64748B] flex-shrink-0 mt-0.5" />
              <View className="flex-1">
                <Text className="text-sm text-[#64748B] mb-2">Fotos do problema</Text>
                <View className="flex gap-2">
                  <View className="w-20 h-20 bg-[#E2E8F0] rounded-lg"></View>
                  <View className="w-20 h-20 bg-[#E2E8F0] rounded-lg"></View>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View className="bg-white rounded-2xl p-5 shadow-sm border border-[#E2E8F0]">
          <Text className="font-semibold text-[#0F172A] mb-3">Cliente</Text>
          <View className="flex items-center gap-3">
            <Image
              source="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop"
              alt="João Silva"
              className="w-12 h-12 rounded-full object-cover"
            />
            <View>
              <Text className="font-medium text-[#0F172A]">João Silva</Text>
              <Text className="text-sm text-[#64748B]"><Star className="w-4 h-4 text-[#EAB308] inline" /> Primeira vez no app</Text>
            </View>
          </View>
        </View>

        <View className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-4">
          <Text className="text-sm text-[#1d4ed8]">
            <Timer className="w-4 h-4 text-[#3B82F6] inline" /> <Text>Responda rápido!</Text> Quanto mais rápido você aceitar, maior a chance de conquistar o cliente.
          </Text>
        </View>
      </View>

      <View className="bg-white p-6 border-t border-[#E2E8F0] space-y-3">
        <Button
          fullWidth
          onPress={() => router.push('/provider/accepted/1')}
        >
          Aceitar chamado
        </Button>
        <Button
          variant="secondary"
          fullWidth
          onPress={() => router.back()}
        >
          Recusar
        </Button>
      </View>
    </View>
  );
}
