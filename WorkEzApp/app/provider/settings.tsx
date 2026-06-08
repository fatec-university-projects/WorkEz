import { useRouter } from 'expo-router';
import { ArrowLeft, User, CreditCard, FileText, MapPin, Bell, HelpCircle, LogOut, ChevronRight } from 'lucide-react-native';
import { View, Text, TouchableOpacity } from 'react-native';

export default function ProviderSettings() {
  const router = useRouter();

  const menuItems = [
    { icon: User, label: 'Dados pessoais', path: '#' },
    { icon: CreditCard, label: 'Dados bancários', path: '#' },
    { icon: FileText, label: 'Documentos', path: '#' },
    { icon: MapPin, label: 'Regiões de atendimento', path: '#' },
    { icon: Bell, label: 'Notificações', path: '#' },
    { icon: HelpCircle, label: 'Ajuda', path: '/help' },
  ];

  return (
    <View className="min-h-screen bg-[#F8FAFC]">
      <View className="bg-white px-6 py-4 border-b">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft className="w-6 h-6" />
          </TouchableOpacity>
          <Text className="text-xl font-semibold">Configurações</Text>
        </View>
      </View>
      <View className="p-6">
        <View className="bg-white rounded-2xl overflow-hidden mb-4">
          {menuItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <TouchableOpacity
                key={i}
                onPress={() => router.push(item.path)}
                className="w-full flex-row items-center gap-3 px-6 py-4 border-b last:border-0"
              >
                <Icon className="w-5 h-5 text-[#64748B]" />
                <Text className="flex-1 text-left">{item.label}</Text>
                <ChevronRight className="w-5 h-5 text-[#64748B]" />
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity
          onPress={() => router.push('/')}
          className="w-full flex-row items-center gap-3 px-6 py-4 bg-white rounded-2xl text-red-500"
        >
          <LogOut className="w-5 h-5" />
          <Text className="flex-1 text-left font-medium">Sair</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
