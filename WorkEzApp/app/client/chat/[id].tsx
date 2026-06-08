import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ArrowLeft, Send, AlertCircle } from 'lucide-react-native';
import { View, Text, TouchableOpacity, Image, TextInput } from 'react-native';

export default function ClientChat() {
  const router = useRouter();
  const [message, setMessage] = useState('');

  const messages = [
    {
      id: 1,
      sender: 'professional',
      text: 'Olá! Já estou a caminho. Chego em aproximadamente 15 minutos.',
      time: '14:23',
    },
    {
      id: 2,
      sender: 'client',
      text: 'Ótimo! Obrigado pela confirmação.',
      time: '14:24',
    },
    {
      id: 3,
      sender: 'professional',
      text: 'Você tem alguma ferramenta específica em casa que possa ser útil?',
      time: '14:25',
    },
  ];

  return (
    <View className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <View className="bg-white px-6 py-4 border-b border-[#E2E8F0]">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 hover:bg-[#F1F5F9] rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-[#0F172A]" />
          </TouchableOpacity>
          <Image
            source="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop"
            alt="Carlos Silva"
            className="w-10 h-10 rounded-full object-cover"
          />
          <View className="flex-1">
            <Text className="font-semibold text-[#0F172A]">Carlos Silva</Text>
            <Text className="text-sm text-[#26FFF5]">Online</Text>
          </View>
        </View>
      </View>

      <View className="bg-[#EFF6FF] border-y border-[#BFDBFE] px-4 py-3">
        <View className="flex-row items-start gap-2">
          <AlertCircle className="w-4 h-4 text-[#2563EB] flex-shrink-0 mt-0.5" />
          <Text className="text-xs text-[#1d4ed8]">
            <Text>Para sua segurança:</Text> Mantenha o pagamento e a comunicação dentro do app.
          </Text>
        </View>
      </View>

      <View className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg) => (
          <View
            key={msg.id}
            className={`flex-row ${msg.sender === 'client' ? 'justify-end' : 'justify-start'}`}
          >
            <View
              className={`max-w-[75%] rounded-2xl px-4 py-3 ${ msg.sender === 'client' ? 'bg-[#2563EB] text-white' : 'bg-white border border-[#E2E8F0] text-[#0F172A]' }`}
            >
              <Text className="text-sm">{msg.text}</Text>
              <Text
                className={`text-xs mt-1 ${ msg.sender === 'client' ? 'text-white/70' : 'text-[#64748B]' }`}
              >
                {msg.time}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View className="bg-white p-4 border-t border-[#E2E8F0]">
        <View className="flex-row items-center gap-2">
          <TextInput
            type="text"
            value={message}
            onChangeText={setMessage}
            placeholder="Digite sua mensagem..."
            className="flex-1 px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10"
          />
          <TouchableOpacity
            className="w-12 h-12 bg-[#2563EB] text-white rounded-xl flex-row items-center justify-center hover:bg-[#1d4ed8] transition-colors disabled:opacity-50"
            disabled={!message.trim()}
          >
            <Send className="w-5 h-5" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
