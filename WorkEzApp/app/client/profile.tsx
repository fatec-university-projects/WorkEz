import { useRouter } from 'expo-router';
import { User, MapPin, CreditCard, HelpCircle, LogOut, ChevronRight } from 'lucide-react-native';
import { View, Text, TouchableOpacity, Image } from 'react-native';

export default function ClientProfile() {
  const router = useRouter();

  const menuItems = [
    { icon: User, label: 'Dados pessoais', path: '#' },
    { icon: MapPin, label: 'Meus endereços', path: '#' },
    { icon: CreditCard, label: 'Formas de pagamento', path: '#' },
    { icon: HelpCircle, label: 'Ajuda e suporte', path: '/help' },
  ];

  return (
    <View className="min-h-screen bg-[#F8FAFC]">
      <View className="bg-white px-6 py-4 border-b border-[#E2E8F0]">
        <Text className="text-2xl font-bold text-[#0F172A]">Perfil</Text>
      </View>

      <View className="p-6">
        <View className="bg-white rounded-2xl p-6 shadow-sm border border-[#E2E8F0] mb-6">
          <View className="flex items-center gap-4">
            <Image
              source="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop"
              alt="João Silva"
              className="w-16 h-16 rounded-full object-cover"
            />
            <View className="flex-1">
              <Text className="text-xl font-semibold text-[#0F172A]">João Silva</Text>
              <Text className="text-sm text-[#64748B]">joao.silva@email.com</Text>
            </View>
          </View>
        </View>

        <View className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] overflow-hidden mb-4">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <TouchableOpacity
                key={index}
                onPress={() => router.push(item.path)}
                className="w-full flex items-center gap-3 px-6 py-4 hover:bg-[#F8FAFC] transition-colors border-b border-[#E2E8F0] last:border-0"
              >
                <Icon className="w-5 h-5 text-[#64748B]" />
                <Text className="flex-1 text-left text-[#0F172A]">{item.label}</Text>
                <ChevronRight className="w-5 h-5 text-[#64748B]" />
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          onPress={() => router.push('/')}
          className="w-full flex items-center gap-3 px-6 py-4 bg-white rounded-2xl shadow-sm border border-[#E2E8F0] hover:bg-red-50 hover:border-red-200 transition-colors"
        >
          <LogOut className="w-5 h-5 text-red-500" />
          <Text className="flex-1 text-left text-red-500 font-medium">Sair</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
