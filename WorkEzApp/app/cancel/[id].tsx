import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Button } from '../../components/Button';
import { View, Text, TouchableOpacity } from 'react-native';

export default function CancelCall() {
  const router = useRouter();
  const [reason, setReason] = useState('');

  const reasons = [
    'Resolvi de outra forma',
    'Não preciso mais do serviço',
    'Demora para encontrar profissional',
    'Outro motivo',
  ];

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
            Cancelar chamado
          </Text>
        </View>
      </View>

      <View className="p-6 space-y-6">
        <View className="bg-white rounded-2xl p-6 shadow-sm border border-[#E2E8F0]">
          <Text className="font-semibold text-[#0F172A] mb-4">
            Por que você está cancelando?
          </Text>

          <View className="space-y-3">
            {reasons.map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => setReason(r)}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left ${ reason === r ? 'border-[#2563EB] bg-[#2563EB]/5' : 'border-[#E2E8F0]' }`}
              >
                {r}
              </TouchableOpacity>
            ))}
          </View>

          {reason === 'Outro motivo' && (
            <textarea
              placeholder="Conte-nos o motivo..."
              rows={3}
              className="w-full mt-4 px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all resize-none"
            />
          )}
        </View>

        <View className="bg-red-50 border border-red-200 rounded-xl p-4">
          <Text className="text-sm text-red-800">
            <Text>Atenção:</Text> Cancelamentos frequentes podem afetar sua conta.
          </Text>
        </View>
      </View>

      <View className="fixed bottom-0 left-0 right-0 bg-white p-6 border-t border-[#E2E8F0] space-y-3">
        <Button
          fullWidth
          onPress={() => router.push('/client')}
          disabled={!reason}
          className="!bg-red-500 hover:!bg-red-600"
        >
          Confirmar cancelamento
        </Button>
        <Button variant="secondary" fullWidth onPress={() => router.back()}>
          Voltar
        </Button>
      </View>
    </View>
  );
}
