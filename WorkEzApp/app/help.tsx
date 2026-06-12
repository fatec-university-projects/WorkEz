import { useRouter } from 'expo-router';
import { ArrowLeft, MessageCircle, Mail, Phone, HelpCircle } from 'lucide-react-native';
import { View, Text, TouchableOpacity } from 'react-native';

export default function Help() {
  const router = useRouter();

  const faqs = [
    {
      question: 'Como funciona o pagamento?',
      answer: 'O pagamento é feito pelo app após a conclusão do serviço.',
    },
    {
      question: 'Posso cancelar um chamado?',
      answer: 'Sim, você pode cancelar antes do profissional chegar.',
    },
    {
      question: 'O que é a garantia da plataforma?',
      answer: 'Proteção em caso de problemas com o serviço executado.',
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
            Ajuda e suporte
          </Text>
        </View>
      </View>

      <View className="p-6 space-y-6">
        <View className="bg-gradient-to-br from-[#2563EB] to-[#1d4ed8] rounded-2xl p-6 text-white text-center">
          <HelpCircle className="w-12 h-12 mx-auto mb-3" />
          <Text className="text-xl font-bold mb-2">Como podemos ajudar?</Text>
          <Text className="text-white/90 text-sm">
            Estamos aqui para resolver suas dúvidas
          </Text>
        </View>

        <View className="bg-white rounded-2xl p-5 shadow-sm border border-[#E2E8F0]">
          <Text className="font-semibold text-[#0F172A] mb-4">
            Perguntas frequentes
          </Text>

          <View className="space-y-4">
            {faqs.map((faq, index) => (
              <View key={index} className="pb-4 border-b border-[#E2E8F0] last:border-0">
                <Text className="font-medium text-[#0F172A] mb-2">
                  {faq.question}
                </Text>
                <Text className="text-sm text-[#94A3B8]">{faq.answer}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className="bg-white rounded-2xl p-5 shadow-sm border border-[#E2E8F0]">
          <Text className="font-semibold text-[#0F172A] mb-4">
            Fale conosco
          </Text>

          <View className="space-y-3">
            <TouchableOpacity className="w-full flex-row items-center gap-3 p-4 bg-[#F8FAFC] rounded-xl hover:bg-[#EFF6FF] transition-colors">
              <MessageCircle className="w-5 h-5 text-[#2563EB]" />
              <View className="text-left flex-1">
                <Text className="font-medium text-[#0F172A]">Chat ao vivo</Text>
                <Text className="text-sm text-[#94A3B8]">Seg-Sex, 8h-18h</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity className="w-full flex-row items-center gap-3 p-4 bg-[#F8FAFC] rounded-xl hover:bg-[#EFF6FF] transition-colors">
              <Mail className="w-5 h-5 text-[#2563EB]" />
              <View className="text-left flex-1">
                <Text className="font-medium text-[#0F172A]">E-mail</Text>
                <Text className="text-sm text-[#94A3B8]">suporte@workez.com.br</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity className="w-full flex-row items-center gap-3 p-4 bg-[#F8FAFC] rounded-xl hover:bg-[#EFF6FF] transition-colors">
              <Phone className="w-5 h-5 text-[#2563EB]" />
              <View className="text-left flex-1">
                <Text className="font-medium text-[#0F172A]">Telefone</Text>
                <Text className="text-sm text-[#94A3B8]">0800 123 4567</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}
