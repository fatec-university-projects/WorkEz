import { useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle, Circle, MessageCircle, Star } from 'lucide-react-native';
import { Button } from '../../../components/Button';
import { View, Text, TouchableOpacity, Image } from 'react-native';

export default function ServiceTracking() {
  const router = useRouter();

  const steps = [
    { label: 'Chamado aceito', completed: true },
    { label: 'Profissional a caminho', completed: true },
    { label: 'Serviço em andamento', completed: true },
    { label: 'Aguardando pagamento', completed: false },
    { label: 'Concluído', completed: false },
  ];

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
            Acompanhar serviço
          </Text>
        </View>
      </View>

      <View className="p-6 space-y-6">
        <View className="bg-white rounded-2xl p-6 shadow-sm border border-[#E2E8F0]">
          <Text className="font-semibold text-[#0F172A] mb-4">
            Status do serviço
          </Text>

          <View className="space-y-4">
            {steps.map((step, index) => (
              <View key={index} className="flex items-start gap-3">
                <View className="flex flex-col items-center">
                  {step.completed ? (
                    <View className="w-6 h-6 bg-[#26FFF5] rounded-full flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </View>
                  ) : (
                    <Circle className="w-6 h-6 text-[#E2E8F0]" />
                  )}
                  {index < steps.length - 1 && (
                    <View
                      className={`w-0.5 h-8 ${
                        step.completed ? 'bg-[#26FFF5]' : 'bg-[#E2E8F0]'
                      }`}
                    />
                  )}
                </View>
                <View className="flex-1 pt-0.5">
                  <Text
                    className={`font-medium ${
                      step.completed ? 'text-[#0F172A]' : 'text-[#64748B]'
                    }`}
                  >
                    {step.label}
                  </Text>
                  {index === 2 && step.completed && (
                    <Text className="text-sm text-[#64748B] mt-1">
                      Serviço iniciado há 25 minutos
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>

        <View className="bg-white rounded-2xl p-6 shadow-sm border border-[#E2E8F0]">
          <Text className="font-semibold text-[#0F172A] mb-4">Profissional</Text>
          <View className="flex items-center gap-3">
            <Image
              source="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop"
              alt="Carlos Silva"
              className="w-12 h-12 rounded-full object-cover"
            />
            <View className="flex-1">
              <Text className="font-medium text-[#0F172A]">Carlos Silva</Text>
              <Text className="text-sm text-[#64748B]">Encanador • <Star className="w-4 h-4 text-[#EAB308] inline" /> 4.9</Text>
            </View>
            <Button
              variant="secondary"
              onPress={() => router.push('/client/chat/1')}
              className="!p-3"
            >
              <MessageCircle className="w-5 h-5" />
            </Button>
          </View>
        </View>

        <View className="bg-white rounded-2xl p-6 shadow-sm border border-[#E2E8F0]">
          <Text className="font-semibold text-[#0F172A] mb-4">
            Detalhes do serviço
          </Text>
          <View className="space-y-3 text-sm">
            <View className="flex justify-between">
              <Text className="text-[#64748B]">Categoria</Text>
              <Text className="font-medium text-[#0F172A]">Encanador</Text>
            </View>
            <View className="flex justify-between">
              <Text className="text-[#64748B]">Endereço</Text>
              <Text className="font-medium text-[#0F172A]">Rua das Flores, 123</Text>
            </View>
            <View className="flex justify-between">
              <Text className="text-[#64748B]">Horário de início</Text>
              <Text className="font-medium text-[#0F172A]">14:30</Text>
            </View>
          </View>
        </View>

        <Button
          variant="secondary"
          fullWidth
          onPress={() => router.push('/cancel/1')}
        >
          Cancelar serviço
        </Button>
      </View>
    </View>
  );
}
