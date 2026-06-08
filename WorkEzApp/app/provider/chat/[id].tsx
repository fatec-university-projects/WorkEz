import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ArrowLeft, Send } from 'lucide-react-native';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';

export default function ProviderChat() {
  const router = useRouter();
  const [message, setMessage] = useState('');

  return (
    <View className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <View className="bg-white px-6 py-4 border-b border-[#E2E8F0]">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft className="w-6 h-6" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold">João Silva</Text>
        </View>
      </View>
      <View className="flex-1"></View>
      <View className="bg-white p-4 border-t flex-row gap-2">
        <TextInput
          type="text"
          value={message}
          onChangeText={setMessage}
          placeholder="Digite..."
          className="flex-1 px-4 py-3 border rounded-xl"
        />
        <TouchableOpacity className="w-12 h-12 bg-[#2563EB] text-white rounded-xl">
          <Send className="w-5 h-5 mx-auto" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
