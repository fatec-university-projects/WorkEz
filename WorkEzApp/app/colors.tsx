import { useRouter } from 'expo-router';
import { ArrowLeft, Check } from 'lucide-react-native';
import { Logo } from '../components/Logo';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { View, Text, TouchableOpacity } from 'react-native';

export default function ColorPalette() {
  const router = useRouter();

  const colors = [
    {
      name: 'Azul Principal',
      hex: '#2563EB',
      bg: 'bg-[#2563EB]',
      use: 'Botões primários, ações principais',
    },
    {
      name: 'Turquesa/Ciano',
      hex: '#26FFF5',
      bg: 'bg-[#26FFF5]',
      use: 'Verificação, sucesso, status online',
    },
    {
      name: 'Azul Escuro',
      hex: '#0F172A',
      bg: 'bg-[#0F172A]',
      use: 'Textos principais, títulos',
    },
    {
      name: 'Fundo Claro',
      hex: '#F8FAFC',
      bg: 'bg-[#F8FAFC]',
      use: 'Backgrounds, cards',
      border: true,
    },
    {
      name: 'Texto Secundário',
      hex: '#94A3B8',
      bg: 'bg-[#94A3B8]',
      use: 'Textos secundários, placeholders',
    },
  ];

  return (
    <View className="min-h-screen bg-[#F8FAFC]">
      <View className="bg-white px-6 py-4 border-b border-[#E2E8F0]">
        <View className="flex items-center gap-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 hover:bg-[#F1F5F9] rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-[#0F172A]" />
          </TouchableOpacity>
          <Text className="text-xl font-semibold text-[#0F172A]">
            Paleta de Cores - WorkEz
          </Text>
        </View>
      </View>

      <View className="p-6 space-y-6">
        {/* Logo Section */}
        <View className="bg-white rounded-2xl p-8 shadow-sm border border-[#E2E8F0] text-center">
          <Logo size="xl" />
          <Text className="text-2xl font-bold text-[#0F172A] mt-4 mb-2">WorkEz</Text>
          <Text className="text-[#94A3B8]">Serviços profissionais, quando você precisar.</Text>
        </View>

        {/* Color Swatches */}
        <View className="space-y-4">
          {colors.map((color) => (
            <View
              key={color.hex}
              className="bg-white rounded-2xl p-4 shadow-sm border border-[#E2E8F0]"
            >
              <View className="flex items-center gap-4">
                <View
                  className={`w-20 h-20 ${color.bg} rounded-xl shadow-sm ${
                    color.border ? 'border-2 border-[#E2E8F0]' : ''
                  }`}
                />
                <View className="flex-1">
                  <Text className="font-semibold text-[#0F172A]">{color.name}</Text>
                  <Text className="text-sm font-mono text-[#2563EB] mt-1">{color.hex}</Text>
                  <Text className="text-sm text-[#94A3B8] mt-1">{color.use}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Components Demo */}
        <View className="bg-white rounded-2xl p-6 shadow-sm border border-[#E2E8F0]">
          <Text className="font-semibold text-[#0F172A] mb-4">Componentes</Text>

          <View className="space-y-4">
            <View>
              <Text className="text-sm text-[#94A3B8] mb-2">Badges</Text>
              <View className="flex flex-wrap gap-2">
                <Badge variant="verified" />
                <Badge variant="secure-payment" />
                <Badge variant="active-guarantee" />
              </View>
            </View>

            <View>
              <Text className="text-sm text-[#94A3B8] mb-2">Botões</Text>
              <View className="flex flex-wrap gap-2">
                <Button>Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
              </View>
            </View>

            <View>
              <Text className="text-sm text-[#94A3B8] mb-2">Status</Text>
              <View className="space-y-2">
                <View className="flex items-center gap-2">
                  <View className="w-3 h-3 bg-[#26FFF5] rounded-full"></View>
                  <Text className="text-sm text-[#26FFF5] font-medium">Online / Verificado</Text>
                </View>
                <View className="flex items-center gap-2">
                  <View className="w-3 h-3 bg-[#2563EB] rounded-full"></View>
                  <Text className="text-sm text-[#2563EB] font-medium">Em andamento</Text>
                </View>
                <View className="flex items-center gap-2">
                  <View className="w-3 h-3 bg-[#FBBF24] rounded-full"></View>
                  <Text className="text-sm text-[#FBBF24] font-medium">Aguardando</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Gradient Examples */}
        <View className="space-y-3">
          <View className="bg-gradient-to-br from-[#2563EB] to-[#1d4ed8] rounded-2xl p-6 text-white text-center">
            <Text className="font-semibold mb-1">Gradiente Azul</Text>
            <Text className="text-sm text-white/80">Splash Screen</Text>
          </View>

          <View className="bg-gradient-to-br from-[#26FFF5] to-[#2563EB] rounded-2xl p-6 text-white text-center">
            <Text className="font-semibold mb-1">Gradiente Turquesa</Text>
            <Text className="text-sm text-white/80">Status Online do Prestador</Text>
          </View>
        </View>

        {/* Success Message */}
        <View className="bg-[#26FFF5]/10 border border-[#26FFF5]/30 rounded-xl p-4">
          <View className="flex items-start gap-3">
            <View className="w-6 h-6 bg-[#26FFF5] rounded-full flex items-center justify-center flex-shrink-0">
              <Check className="w-4 h-4 text-white" />
            </View>
            <View>
              <Text className="font-medium text-[#0F172A] mb-1">
                Paleta Atualizada com Sucesso
              </Text>
              <Text className="text-sm text-[#94A3B8]">
                WorkEz agora usa turquesa (#26FFF5) para transmitir confiança e modernidade.
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
