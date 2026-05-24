import { Clock, MapPin } from 'lucide-react-native';
import { View, Text, TouchableOpacity } from 'react-native';

interface ServiceCardProps {
  category: string;
  description: string;
  status: 'in-progress' | 'completed' | 'cancelled';
  date: string;
  professional?: string;
  onClick?: () => void;
}

export function ServiceCard({
  category,
  description,
  status,
  date,
  professional,
  onClick
}: ServiceCardProps) {
  const statusConfig = {
    'in-progress': { color: 'text-[#2563EB]', bg: 'bg-[#2563EB]/10', label: 'Em andamento' },
    'completed': { color: 'text-[#26FFF5]', bg: 'bg-[#26FFF5]/10', label: 'Concluído' },
    'cancelled': { color: 'text-[#94A3B8]', bg: 'bg-[#94A3B8]/10', label: 'Cancelado' },
  };

  const config = statusConfig[status];

  return (
    <TouchableOpacity
      onPress={onClick}
      className="bg-white rounded-2xl p-4 shadow-sm border border-[#E2E8F0] hover:shadow-md transition-all cursor-pointer"
    >
      <View className="flex items-start justify-between mb-3">
        <View>
          <Text className="font-semibold text-[#0F172A]">{category}</Text>
          <Text className="text-sm text-[#94A3B8] mt-1 line-clamp-2">{description}</Text>
        </View>
        <Text className={`${config.bg} ${config.color} text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ml-2`}>
          {config.label}
        </Text>
      </View>

      <View className="flex items-center gap-4 text-sm text-[#94A3B8]">
        <View className="flex items-center gap-1.5">
          <Clock className="w-4 h-4" />
          {date}
        </View>
        {professional && (
          <View className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4" />
            {professional}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
