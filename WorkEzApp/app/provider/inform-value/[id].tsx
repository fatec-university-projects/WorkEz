import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { View, Text } from 'react-native';

export default function InformValue() {
  const router = useRouter();
  const [value, setValue] = useState('');

  return (
    <View className="min-h-screen bg-[#F8FAFC] p-6">
      <Text className="text-2xl font-bold mb-6">Informar valor</Text>
      <View className="bg-white rounded-2xl p-6">
        <Input
          label="Valor do serviço"
          type="number"
          placeholder="150.00"
          value={value}
          onChangeText={setValue}
        />
        <Button
          fullWidth
          className="mt-4"
          onPress={() => router.push('/provider/waiting-payment/1')}
        >
          Confirmar valor
        </Button>
      </View>
    </View>
  );
}
