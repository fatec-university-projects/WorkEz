import { useRouter } from 'expo-router';
import { CheckCircle, Clock, Circle } from 'lucide-react-native';
import { Button } from '../../components/Button';
import { View, Text } from 'react-native';

export default function RegistrationAnalysis() {
  const router = useRouter();

  const steps = [
    { label: 'Dados enviados', completed: true },
    { label: 'Documentos em análise', completed: true },
    { label: 'Verificação de referências', completed: false },
    { label: 'Entrevista agendada', completed: false },
    { label: 'Aprovação final', completed: false },
  ];

  return (
    <View className="min-h-screen bg-[#F8FAFC]">
      <View className="bg-gradient-to-br from-[#2563EB] to-[#1d4ed8] px-6 pt-12 pb-8 rounded-b-3xl text-white text-center">
        <View className="w-16 h-16 bg-white/20 rounded-full flex-row items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8" />
        </View>
        <Text className="text-2xl font-bold mb-2">Cadastro em análise</Text>
        <Text className="text-white/90">
          Estamos verificando suas informações
        </Text>
      </View>

      <View className="p-6 space-y-6">
        <View className="bg-white rounded-2xl p-6 shadow-sm border border-[#E2E8F0]">
          <Text className="font-semibold text-[#0F172A] mb-4">
            Status do cadastro
          </Text>

          <View className="space-y-4">
            {steps.map((step, index) => (
              <View key={index} className="flex-row items-start gap-3">
                <View className="flex flex-col items-center">
                  {step.completed ? (
                    <View className="w-6 h-6 bg-[#26FFF5] rounded-full flex-row items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </View>
                  ) : index === 2 ? (
                    <View className="w-6 h-6 bg-[#2563EB] rounded-full flex-row items-center justify-center">
                      <Clock className="w-4 h-4 text-white" />
                    </View>
                  ) : (
                    <Circle className="w-6 h-6 text-[#E2E8F0]" />
                  )}
                  {index < steps.length - 1 && (
                    <View
                      className={`w-0.5 h-8 ${ step.completed ? 'bg-[#26FFF5]' : 'bg-[#E2E8F0]' }`}
                    />
                  )}
                </View>
                <View className="flex-1 pt-0.5">
                  <Text
                    className={`font-medium ${ step.completed ? 'text-[#0F172A]' : index === 2 ? 'text-[#2563EB]' : 'text-[#64748B]' }`}
                  >
                    {step.label}
                  </Text>
                  {index === 2 && (
                    <Text className="text-sm text-[#64748B] mt-1">Em andamento</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>

        <View className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-4">
          <Text className="font-medium text-[#1d4ed8] mb-2">
            Tempo estimado
          </Text>
          <Text className="text-sm text-[#1e40af]">
            O processo de verificação leva em média 3-5 dias úteis. Você receberá atualizações por e-mail.
          </Text>
        </View>

        <View className="bg-white rounded-2xl p-5 shadow-sm border border-[#E2E8F0]">
          <Text className="font-semibold text-[#0F172A] mb-3">
            Enquanto isso...
          </Text>
          <ul className="space-y-2 text-sm text-[#64748B]">
            <li className="flex-row items-start gap-2">
              <Text className="text-[#26FFF5]">✓</Text>
              <Text>Baixe o app e configure suas notificações</Text>
            </li>
            <li className="flex-row items-start gap-2">
              <Text className="text-[#26FFF5]">✓</Text>
              <Text>Prepare fotos dos seus melhores trabalhos</Text>
            </li>
            <li className="flex-row items-start gap-2">
              <Text className="text-[#26FFF5]">✓</Text>
              <Text>Revise suas ferramentas e equipamentos</Text>
            </li>
          </ul>
        </View>

        <Button fullWidth onPress={() => router.push('/')}>
          Voltar ao início
        </Button>
      </View>
    </View>
  );
}
