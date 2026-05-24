import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ArrowLeft, Mail, Lock } from 'lucide-react-native';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { View, Text, TouchableOpacity } from 'react-native';


export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    router.push('/client');
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
          Bem-vindo de volta
        </Text>
        <Text className="text-[#94A3B8]">
          Acesse sua conta para continuar
        </Text>

        <View className="mt-8 space-y-4">
          <View className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
            <Input
              type="email"
              placeholder="Seu e-mail"
              value={email}
              onChangeText={setEmail}
              className="pl-12"
            />
          </View>

          <View className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
            <Input
              type="password"
              placeholder="Sua senha"
              value={password}
              onChangeText={setPassword}
              className="pl-12"
            />
          </View>

          <TouchableOpacity className="text-[#2563EB] text-sm font-medium">
            Esqueci minha senha
          </TouchableOpacity>
        </View>

        <View className="mt-8 space-y-3">
          <Button fullWidth onPress={handleLogin}>
            Entrar
          </Button>

          <View className="text-center text-sm text-[#94A3B8]">
            Não tem uma conta?{' '}
            <TouchableOpacity
              onPress={() => router.push('/signup')}
              className="text-[#2563EB] font-medium"
            >
              Cadastre-se
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}
