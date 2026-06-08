import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, Phone, User } from 'lucide-react-native';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { View, Text, TouchableOpacity } from 'react-native';

export default function References() {
  const router = useRouter();
  const [references, setReferences] = useState([{ name: '', phone: '' }]);

  const addReference = () => {
    setReferences([...references, { name: '', phone: '' }]);
  };

  return (
    <View className="min-h-screen bg-white">
      <View className="p-6">
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2 hover:bg-[#F1F5F9] rounded-lg transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-[#0F172A]" />
        </TouchableOpacity>

        <Text className="text-3xl font-bold text-[#0F172A] mt-8 mb-2">
          Referências profissionais
        </Text>
        <Text className="text-[#64748B]">
          Adicione contatos que possam comprovar sua experiência
        </Text>

        <View className="mt-8 space-y-6">
          {references.map((ref, index) => (
            <View key={index} className="bg-[#F8FAFC] rounded-xl p-4 border border-[#E2E8F0]">
              <Text className="font-medium text-[#0F172A] mb-3">
                Referência {index + 1}
              </Text>
              <View className="space-y-3">
                <View className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
                  <Input
                    placeholder="Nome completo"
                    value={ref.name}
                    onChangeText={(e) => {
                      const newRefs = [...references];
                      newRefs[index].name = e.target.value;
                      setReferences(newRefs);
                    }}
                    className="pl-12"
                  />
                </View>
                <View className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
                  <Input
                    type="tel"
                    placeholder="Telefone"
                    value={ref.phone}
                    onChangeText={(e) => {
                      const newRefs = [...references];
                      newRefs[index].phone = e.target.value;
                      setReferences(newRefs);
                    }}
                    className="pl-12"
                  />
                </View>
              </View>
            </View>
          ))}

          <TouchableOpacity
            onPress={addReference}
            className="w-full py-3 border-2 border-dashed border-[#E2E8F0] rounded-xl text-[#2563EB] hover:border-[#2563EB] hover:bg-[#2563EB]/5 transition-all flex-row items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Adicionar outra referência
          </TouchableOpacity>
        </View>

        <View className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-4 mt-6">
          <Text className="text-sm text-[#1d4ed8] leading-relaxed">
            💡 Recomendamos adicionar pelo menos 2 referências de clientes ou empregadores anteriores.
          </Text>
        </View>

        <View className="mt-8">
          <Button fullWidth onPress={() => router.push('/provider/interview')}>
            Continuar
          </Button>
        </View>
      </View>
    </View>
  );
}
