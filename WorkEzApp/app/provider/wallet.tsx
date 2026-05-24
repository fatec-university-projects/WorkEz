import { DollarSign, TrendingUp, Calendar, ArrowDownToLine } from 'lucide-react-native';
import { Button } from '../../components/Button';
import { View, Text } from 'react-native';

export default function Wallet() {
  const transactions = [
    { date: '25 Abr', service: 'Encanamento - Rua das Flores', value: 150, status: 'received' },
    { date: '24 Abr', service: 'Instalação - Av. Principal', value: 200, status: 'received' },
    { date: '23 Abr', service: 'Reparo - Centro', value: 120, status: 'pending' },
  ];

  return (
    <View className="min-h-screen bg-[#F8FAFC]">
      <View className="bg-white px-6 py-4 border-b border-[#E2E8F0]">
        <Text className="text-2xl font-bold text-[#0F172A]">Carteira</Text>
      </View>

      <View className="p-6 space-y-6">
        <View className="bg-gradient-to-br from-[#26FFF5] to-[#26FFF5] rounded-2xl p-6 text-white">
          <Text className="text-white/80 text-sm mb-1">Saldo disponível</Text>
          <Text className="text-4xl font-bold mb-4">R$ 850,00</Text>
          <Button
            variant="secondary"
            className="!bg-white !text-[#26FFF5] hover:!bg-white/90"
          >
            <ArrowDownToLine className="w-5 h-5 inline mr-2" />
            Solicitar saque
          </Button>
        </View>

        <View className="grid grid-cols-2 gap-3">
          <View className="bg-white rounded-2xl p-4 shadow-sm border border-[#E2E8F0]">
            <View className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-[#2563EB]" />
              <Text className="text-sm text-[#64748B]">A receber</Text>
            </View>
            <Text className="text-2xl font-bold text-[#0F172A]">R$ 320</Text>
          </View>

          <View className="bg-white rounded-2xl p-4 shadow-sm border border-[#E2E8F0]">
            <View className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-[#26FFF5]" />
              <Text className="text-sm text-[#64748B]">Este mês</Text>
            </View>
            <Text className="text-2xl font-bold text-[#0F172A]">R$ 3.450</Text>
          </View>
        </View>

        <View className="bg-white rounded-2xl p-5 shadow-sm border border-[#E2E8F0]">
          <Text className="font-semibold text-[#0F172A] mb-1">Comissão da plataforma</Text>
          <Text className="text-sm text-[#64748B] mb-3">
            15% sobre cada serviço concluído
          </Text>
          <View className="bg-[#F8FAFC] rounded-lg p-3">
            <View className="flex justify-between text-sm">
              <Text className="text-[#64748B]">Último serviço (R$ 150)</Text>
              <Text className="font-medium text-[#0F172A]">- R$ 22,50</Text>
            </View>
          </View>
        </View>

        <View className="bg-white rounded-2xl p-5 shadow-sm border border-[#E2E8F0]">
          <View className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-[#0F172A]" />
            <Text className="font-semibold text-[#0F172A]">Histórico de repasses</Text>
          </View>

          <View className="space-y-3">
            {transactions.map((transaction, index) => (
              <View
                key={index}
                className="flex items-center justify-between py-3 border-b border-[#E2E8F0] last:border-0"
              >
                <View className="flex-1">
                  <Text className="font-medium text-[#0F172A] text-sm">
                    {transaction.service}
                  </Text>
                  <Text className="text-xs text-[#64748B] mt-1">{transaction.date}</Text>
                </View>
                <View className="text-right">
                  <Text className="font-semibold text-[#26FFF5]">
                    + R$ {transaction.value}
                  </Text>
                  <Text
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      transaction.status === 'received'
                        ? 'bg-[#26FFF5]/10 text-[#26FFF5]'
                        : 'bg-[#FBBF24]/10 text-[#FBBF24]'
                    }`}
                  >
                    {transaction.status === 'received' ? 'Recebido' : 'Pendente'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}
