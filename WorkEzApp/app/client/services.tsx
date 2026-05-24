import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ServiceCard } from '../../components/ServiceCard';
import { View, Text, TouchableOpacity } from 'react-native';

export default function MyServices() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'in-progress' | 'completed' | 'cancelled'>('in-progress');

  const services = {
    'in-progress': [
      {
        id: 1,
        category: 'Encanador',
        description: 'Torneira da cozinha está vazando',
        date: 'Hoje, 14:30',
        professional: 'Carlos Silva',
      },
    ],
    completed: [
      {
        id: 2,
        category: 'Eletricista',
        description: 'Instalação de ventilador de teto',
        date: '15 Abr',
        professional: 'João Alves',
      },
      {
        id: 3,
        category: 'Pintor',
        description: 'Pintura da sala e quarto',
        date: '10 Abr',
        professional: 'Maria Santos',
      },
    ],
    cancelled: [
      {
        id: 4,
        category: 'Diarista',
        description: 'Limpeza geral do apartamento',
        date: '08 Abr',
      },
    ],
  };

  return (
    <View className="min-h-screen bg-[#F8FAFC]">
      <View className="bg-white px-6 py-4 border-b border-[#E2E8F0]">
        <Text className="text-2xl font-bold text-[#0F172A]">Meus serviços</Text>
      </View>

      <View className="bg-white border-b border-[#E2E8F0] px-6">
        <View className="flex gap-6">
          {[
            { key: 'in-progress', label: 'Em andamento' },
            { key: 'completed', label: 'Concluídos' },
            { key: 'cancelled', label: 'Cancelados' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key as typeof activeTab)}
              className={`pb-3 pt-2 relative ${
                activeTab === tab.key
                  ? 'text-[#2563EB] font-semibold'
                  : 'text-[#64748B]'
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <View className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2563EB]"></View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View className="p-6 space-y-3">
        {services[activeTab].map((service) => (
          <ServiceCard
            key={service.id}
            category={service.category}
            description={service.description}
            status={activeTab}
            date={service.date}
            professional={service.professional}
            onPress={() => router.push(`/client/tracking/${service.id}`)}
          />
        ))}

        {services[activeTab].length === 0 && (
          <View className="text-center py-12">
            <Text className="text-[#64748B]">Nenhum serviço encontrado</Text>
          </View>
        )}
      </View>
    </View>
  );
}
