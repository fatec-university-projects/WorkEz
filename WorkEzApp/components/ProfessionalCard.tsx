import { Star, MapPin, Heart, Check } from 'lucide-react-native';
import { View, Text, TouchableOpacity, Image } from 'react-native';

interface ProfessionalCardProps {
  name: string;
  photo: string;
  rating: number;
  servicesCompleted: number;
  distance?: string;
  specialties: string[];
  verified?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onClick?: () => void;
}

export function ProfessionalCard({
  name,
  photo,
  rating,
  servicesCompleted,
  distance,
  specialties,
  verified = false,
  isFavorite = false,
  onToggleFavorite,
  onClick,
}: ProfessionalCardProps) {
  return (
    <View
      onPress={onClick}
      className="bg-white rounded-2xl p-4 shadow-sm border border-[#E2E8F0] hover:shadow-md transition-all cursor-pointer"
    >
      <View className="flex items-start gap-4">
        <View className="relative">
          <Image
            source={photo}
            alt={name}
            className="w-16 h-16 rounded-full object-cover"
          />
          {verified && (
            <View className="absolute -bottom-1 -right-1 bg-[#26FFF5] rounded-full p-1 border-2 border-white">
              <Check className="w-3 h-3 text-[#0F172A]" />
            </View>
          )}
        </View>

        <View className="flex-1 min-w-0">
          <View className="flex items-start justify-between">
            <View className="flex-1">
              <Text className="font-semibold text-[#0F172A]">{name}</Text>
              <View className="flex items-center gap-2 mt-1">
                <View className="flex items-center gap-1 text-sm">
                  <Star className="w-4 h-4 fill-[#FBBF24] text-[#FBBF24]" />
                  <Text className="font-medium text-[#0F172A]">{rating.toFixed(1)}</Text>
                </View>
                <Text className="text-sm text-[#94A3B8]">
                  {servicesCompleted} serviços
                </Text>
              </View>
            </View>

            {onToggleFavorite && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  onToggleFavorite();
                }}
                className="p-2 hover:bg-[#F1F5F9] rounded-lg transition-colors"
              >
                <Heart
                  className={`w-5 h-5 ${
                    isFavorite ? 'fill-red-500 text-red-500' : 'text-[#94A3B8]'
                  }`}
                />
              </TouchableOpacity>
            )}
          </View>

          {distance && (
            <View className="flex items-center gap-1.5 text-sm text-[#94A3B8] mt-2">
              <MapPin className="w-4 h-4" />
              {distance}
            </View>
          )}

          <View className="flex flex-wrap gap-2 mt-3">
            {specialties.slice(0, 2).map((specialty, index) => (
              <Text
                key={index}
                className="text-xs px-2.5 py-1 bg-[#F1F5F9] text-[#94A3B8] rounded-full"
              >
                {specialty}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}
