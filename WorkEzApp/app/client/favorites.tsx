import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ProfessionalCard } from '../../components/ProfessionalCard';
import { View, Text } from 'react-native';

export default function Favorites() {
  const router = useRouter();
  const [favorites, setFavorites] = useState([
    {
      id: 1,
      name: 'Carlos Silva',
      photo: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&h=200&fit=crop',
      rating: 4.9,
      servicesCompleted: 248,
      specialties: ['Encanamento', 'Instalações'],
      verified: true,
    },
    {
      id: 2,
      name: 'João Alves',
      photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop',
      rating: 4.8,
      servicesCompleted: 195,
      specialties: ['Elétrica', 'Iluminação'],
      verified: true,
    },
  ]);

  const toggleFavorite = (id: number) => {
    setFavorites(favorites.filter(fav => fav.id !== id));
  };

  return (
    <View className="min-h-screen bg-[#F8FAFC]">
      <View className="bg-white px-6 py-4 border-b border-[#E2E8F0]">
        <Text className="text-2xl font-bold text-[#0F172A]">Favoritos</Text>
        <Text className="text-sm text-[#64748B] mt-1">
          Seus profissionais salvos
        </Text>
      </View>

      <View className="p-6 space-y-3">
        {favorites.map((professional) => (
          <ProfessionalCard
            key={professional.id}
            {...professional}
            isFavorite={true}
            onToggleFavorite={() => toggleFavorite(professional.id)}
            onPress={() => router.push(`/client/professional/${professional.id}`)}
          />
        ))}

        {favorites.length === 0 && (
          <View className="py-12 items-center">
            <Text className="text-lg text-[#0F172A] mb-2">Nenhum favorito ainda</Text>
            <Text className="text-[#64748B] text-center">Salve profissionais que você gostou para chamá-los novamente</Text>
          </View>
        )}
      </View>
    </View>
  );
}
