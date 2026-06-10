import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ArrowLeft, Camera, MapPin } from 'lucide-react-native';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { View, Text, TouchableOpacity } from 'react-native';

export default function DescribeService() {
  const router = useRouter();
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('Rua das Flores, 123 - Centro');

  return (
    <View className="min-h-screen bg-[#F8FAFC]">
      <View className="bg-white px-6 py-4 border-b border-[#E2E8F0]">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 hover:bg-[#F1F5F9] rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-[#0F172A]" />
          </TouchableOpacity>
          <Text className="text-xl font-semibold text-[#0F172A]">
            Descreva o serviço
          </Text>
        </View>
      </View>

      <View className="p-6 space-y-6">
        <View>
          <Text className="block text-sm font-medium text-[#0F172A] mb-2">
            O que você precisa?
          </Text>
          <textarea
            value={description}
            onChangeText={setDescription}
            placeholder="Descreva detalhadamente o problema ou serviço que precisa..."
            rows={4}
            className="w-full px-4 py-3.5 bg-white border-2 border-[#E2E8F0] rounded-xl text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10 transition-all duration-200 resize-none"
          />
        </View>

        <View>
          <Text className="block text-sm font-medium text-[#0F172A] mb-3">
            Adicionar fotos (opcional)
          </Text>
          <TouchableOpacity className="w-full border-2 border-dashed border-[#E2E8F0] rounded-xl p-8 hover:border-[#2563EB] hover:bg-[#2563EB]/5 transition-all">
            <Camera className="w-8 h-8 text-[#64748B] mx-auto mb-2" />
            <Text className="text-sm text-[#64748B]">
              Toque para adicionar fotos
            </Text>
          </TouchableOpacity>
        </View>

        <View>
          <Text className="block text-sm font-medium text-[#0F172A] mb-2">
            Endereço do serviço
          </Text>
          <View className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
            <Input
              value={address}
              onChangeText={setAddress}
              className="pl-12"
            />
          </View>
          <TouchableOpacity className="text-[#2563EB] text-sm font-medium mt-2">
            Usar minha localização
          </TouchableOpacity>
        </View>

        <View className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-4">
          <Text className="text-sm text-[#1d4ed8]">
            💡 <Text>Dica:</Text> Quanto mais detalhes você fornecer, mais rápido o profissional poderá entender e resolver seu problema.
          </Text>
        </View>
      </View>

      <View className="fixed bottom-0 left-0 right-0 bg-white p-6 border-t border-[#E2E8F0]">
        <Button
          fullWidth
          onPress={() => router.push('/client/confirm')}
          disabled={!description.trim()}
        >
          Continuar
        </Button>
      </View>
    </View>
  );
}
