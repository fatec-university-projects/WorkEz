import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ArrowLeft, User, Mail, Lock, Phone } from 'lucide-react-native';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { View, Text, TouchableOpacity } from 'react-native';

export default function SignUp() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });

  const handleSignUp = () => {
    router.push('/profile-choice');
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
          Criar conta
        </Text>
        <Text className="text-[#94A3B8]">
          Preencha seus dados para começar
        </Text>

        <View className="mt-8 space-y-4">
          <View className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
            <Input
              placeholder="Nome completo"
              value={formData.name}
              onChangeText={(e) => setFormData({ ...formData, name: e.target.value })}
              className="pl-12"
            />
          </View>

          <View className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
            <Input
              type="email"
              placeholder="E-mail"
              value={formData.email}
              onChangeText={(e) => setFormData({ ...formData, email: e.target.value })}
              className="pl-12"
            />
          </View>

          <View className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
            <Input
              type="tel"
              placeholder="Telefone"
              value={formData.phone}
              onChangeText={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="pl-12"
            />
          </View>

          <View className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
            <Input
              type="password"
              placeholder="Criar senha"
              value={formData.password}
              onChangeText={(e) => setFormData({ ...formData, password: e.target.value })}
              className="pl-12"
            />
          </View>
        </View>

        <View className="mt-8 space-y-3">
          <Button fullWidth onPress={handleSignUp}>
            Continuar
          </Button>

          <View className="text-center text-sm text-[#94A3B8]">
            Já tem uma conta?{' '}
            <TouchableOpacity
              onPress={() => router.push('/login')}
              className="text-[#2563EB] font-medium"
            >
              Entrar
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}
