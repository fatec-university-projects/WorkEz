import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ArrowLeft, Camera, AlertTriangle } from 'lucide-react-native';
import { Button } from '../../components/Button';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';

export default function ActivateGuarantee() {
  const router = useRouter();
  const [description, setDescription] = useState('');

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
            Acionar garantia
          </Text>
        </View>
      </View>

      <View className="p-6 space-y-6">
        <View className="bg-[#FEF3C7] border border-[#FDE047] rounded-xl p-5">
          <View className="flex-row items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-[#854D0E] flex-shrink-0 mt-0.5" />
            <View>
              <Text className="font-semibold text-[#854D0E] mb-1">
                Garantia da plataforma
              </Text>
              <Text className="text-sm text-[#92400E]">
                Descreva o problema e nossa equipe fará a mediação entre você e o profissional.
              </Text>
            </View>
          </View>
        </View>

        <View className="bg-white rounded-2xl p-6 shadow-sm border border-[#E2E8F0]">
          <Text className="font-semibold text-[#0F172A] mb-4">
            Descreva o problema
          </Text>

          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Explique detalhadamente o que aconteceu..."
            multiline={true}
            numberOfLines={6}
            textAlignVertical="top"
            style={{ minHeight: 120 }}
            className="w-full px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#2563EB] transition-all"
          />
        </View>

        <View className="bg-white rounded-2xl p-6 shadow-sm border border-[#E2E8F0]">
          <Text className="font-semibold text-[#0F172A] mb-3">
            Adicionar fotos (opcional)
          </Text>
          <TouchableOpacity className="w-full border-2 border-dashed border-[#E2E8F0] rounded-xl p-8 hover:border-[#2563EB] hover:bg-[#2563EB]/5 transition-all">
            <Camera className="w-8 h-8 text-[#64748B] mx-auto mb-2" />
            <Text className="text-sm text-[#64748B]">
              Toque para adicionar fotos do problema
            </Text>
          </TouchableOpacity>
        </View>

        <View className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-4">
          <Text className="text-sm text-[#1d4ed8]">
            Nossa equipe analisará seu caso em até 24 horas e entrará em contato.
          </Text>
        </View>
      </View>

      <View className="fixed bottom-0 left-0 right-0 bg-white p-6 border-t border-[#E2E8F0]">
        <Button
          fullWidth
          onPress={() => router.push('/client')}
          disabled={!description.trim()}
        >
          Enviar solicitação
        </Button>
      </View>
    </View>
  );
}
