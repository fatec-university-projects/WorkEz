import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { View, Text, TouchableOpacity } from 'react-native';

export default function WorkArea() {
  const router = useRouter();
  const [category, setCategory] = useState('');
  const [experience, setExperience] = useState('');
  const [description, setDescription] = useState('');

  const categories = [
    'Encanador',
    'Eletricista',
    'Diarista',
    'Pintor',
    'Montador',
    'Técnico geral',
  ];

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
          Área de atuação
        </Text>
        <Text className="text-[#64748B]">
          Conte-nos sobre sua profissão
        </Text>

        <View className="mt-8 space-y-6">
          <View>
            <Text className="block text-sm font-medium text-[#0F172A] mb-3">
              Categoria principal
            </Text>
            <View className="grid grid-cols-2 gap-3">
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCategory(cat)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    category === cat
                      ? 'border-[#2563EB] bg-[#2563EB]/5'
                      : 'border-[#E2E8F0]'
                  }`}
                >
                  <Text className="font-medium text-[#0F172A]">{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View>
            <Text className="block text-sm font-medium text-[#0F172A] mb-2">
              Anos de experiência
            </Text>
            <Input
              type="number"
              placeholder="Ex: 5"
              value={experience}
              onChangeText={setExperience}
            />
          </View>

          <View>
            <Text className="block text-sm font-medium text-[#0F172A] mb-2">
              Descrição profissional
            </Text>
            <textarea
              value={description}
              onChangeText={setDescription}
              placeholder="Descreva suas habilidades e especialidades..."
              rows={4}
              className="w-full px-4 py-3.5 bg-white border-2 border-[#E2E8F0] rounded-xl
                text-[#0F172A] placeholder:text-[#94A3B8]
                focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10
                transition-all duration-200 resize-none"
            />
          </View>
        </View>

        <View className="mt-8">
          <Button
            fullWidth
            onPress={() => router.push('/provider/documents')}
            disabled={!category || !experience || !description}
          >
            Continuar
          </Button>
        </View>
      </View>
    </View>
  );
}
