import { useRouter } from 'expo-router';
import { ArrowLeft, ShieldCheck, CreditCard, MessageCircle, Scale } from 'lucide-react-native';
import { View, Text, TouchableOpacity } from 'react-native';

export default function PlatformGuarantee() {
  const router = useRouter();

  const features = [
    {
      icon: ShieldCheck,
      title: 'Profissionais verificados',
      description: 'Todos os prestadores passam por verificação rigorosa de documentos, antecedentes criminais e referências profissionais.',
    },
    {
      icon: CreditCard,
      title: 'Pagamento protegido',
      description: 'O pagamento só é liberado ao profissional após a conclusão do serviço e sua confirmação.',
    },
    {
      icon: MessageCircle,
      title: 'Suporte dedicado',
      description: 'Nossa equipe está disponível para ajudar em caso de dúvidas ou problemas durante o serviço.',
    },
    {
      icon: Scale,
      title: 'Mediação de conflitos',
      description: 'Em caso de divergências, oferecemos mediação imparcial e proteção ao consumidor.',
    },
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
            Garantia da plataforma
          </Text>
        </View>
      </View>

      <View className="p-6 space-y-6">
        <View className="bg-gradient-to-br from-[#2563EB] to-[#1d4ed8] rounded-2xl p-6 text-white text-center">
          <ShieldCheck className="w-16 h-16 mx-auto mb-3" />
          <Text className="text-2xl font-bold mb-2">100% Seguro</Text>
          <Text className="text-white/90">
            Sua proteção é nossa prioridade
          </Text>
        </View>

        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <View
              key={index}
              className="bg-white rounded-2xl p-5 shadow-sm border border-[#E2E8F0]"
            >
              <View className="flex-row items-start gap-4">
                <View className="w-12 h-12 bg-[#2563EB]/10 rounded-xl flex-row items-center justify-center flex-shrink-0">
                  <Icon className="w-6 h-6 text-[#2563EB]" />
                </View>
                <View className="flex-1">
                  <Text className="font-semibold text-[#0F172A] mb-2">
                    {feature.title}
                  </Text>
                  <Text className="text-sm text-[#64748B] leading-relaxed">
                    {feature.description}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}

        <View className="bg-[#FEF3C7] border border-[#FDE047] rounded-xl p-5">
          <Text className="font-semibold text-[#854D0E] mb-2">
            Garantia de 7 dias
          </Text>
          <Text className="text-sm text-[#92400E] leading-relaxed">
            Após a conclusão do serviço, você tem 7 dias para reportar qualquer problema. Mediaremos a situação e garantiremos uma solução justa.
          </Text>
        </View>
      </View>
    </View>
  );
}
