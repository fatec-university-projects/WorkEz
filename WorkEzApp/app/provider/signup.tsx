import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ArrowLeft, User, Mail, Lock, Phone, FileText } from 'lucide-react-native';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { View, Text, TouchableOpacity } from 'react-native';

export default function ProviderSignUp() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    email: '',
    phone: '',
    password: '',
  });

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
          Cadastro de prestador
        </Text>
        <Text className="text-[#64748B]">
          Preencha seus dados para começar
        </Text>

        <View className="mt-8 space-y-4">
          <View className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
            <Input
              placeholder="Nome completo"
              value={formData.name}
              onChangeText={(e) => setFormData({ ...formData, name: e.target.value })}
              className="pl-12"
            />
          </View>

          <View className="relative">
            <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
            <Input
              placeholder="CPF"
              value={formData.cpf}
              onChangeText={(e) => setFormData({ ...formData, cpf: e.target.value })}
              className="pl-12"
            />
          </View>

          <View className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
            <Input
              type="email"
              placeholder="E-mail"
              value={formData.email}
              onChangeText={(e) => setFormData({ ...formData, email: e.target.value })}
              className="pl-12"
            />
          </View>

          <View className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
            <Input
              type="tel"
              placeholder="Telefone"
              value={formData.phone}
              onChangeText={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="pl-12"
            />
          </View>

          <View className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
            <Input
              type="password"
              placeholder="Criar senha"
              value={formData.password}
              onChangeText={(e) => setFormData({ ...formData, password: e.target.value })}
              className="pl-12"
            />
          </View>
        </View>

        <View className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-4 mt-6">
          <Text className="text-sm text-[#1d4ed8]">
            <Text>Próximos passos:</Text> Após o cadastro, você precisará informar sua área de atuação, enviar documentos e passar por verificação.
          </Text>
        </View>

        <View className="mt-8">
          <Button fullWidth onPress={() => router.push('/provider/work-area')}>
            Continuar
          </Button>
        </View>
      </View>
    </View>
  );
}
