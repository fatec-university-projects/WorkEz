import { Star } from 'lucide-react-native';
import { View, Text, Image } from 'react-native';

interface RatingCardProps {
  clientName: string;
  clientPhoto: string;
  rating: number;
  comment: string;
  date: string;
  tags?: string[];
}

export function RatingCard({
  clientName,
  clientPhoto,
  rating,
  comment,
  date,
  tags = [],
}: RatingCardProps) {
  return (
    <View className="bg-white rounded-2xl p-4 shadow-sm border border-[#E2E8F0]">
      <View className="flex items-start gap-3">
        <Image
          source={clientPhoto}
          alt={clientName}
          className="w-12 h-12 rounded-full object-cover"
        />

        <View className="flex-1">
          <View className="flex items-center justify-between mb-2">
            <Text className="font-medium text-[#0F172A]">{clientName}</Text>
            <Text className="text-xs text-[#94A3B8]">{date}</Text>
          </View>

          <View className="flex items-center gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-4 h-4 ${
                  star <= rating
                    ? 'fill-[#FBBF24] text-[#FBBF24]'
                    : 'text-[#E2E8F0]'
                }`}
              />
            ))}
          </View>

          <Text className="text-sm text-[#94A3B8] mb-3">{comment}</Text>

          {tags.length > 0 && (
            <View className="flex flex-wrap gap-2">
              {tags.map((tag, index) => (
                <Text
                  key={index}
                  className="text-xs px-2.5 py-1 bg-[#26FFF5]/10 text-[#26FFF5] rounded-full"
                >
                  {tag}
                </Text>
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
