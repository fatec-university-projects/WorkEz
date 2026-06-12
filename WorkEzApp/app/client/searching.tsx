import { useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Loader2, ShieldCheck, Star, Clock } from 'lucide-react-native';
import { View, Text, ActivityIndicator } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useFetch } from '../../hooks/useFetch';
import { apiRequest } from '../../services/api';
import { WorkEzTheme } from '../../constants/theme';

export default function SearchingProfessional() {
  const router = useRouter();
  const { user } = useAuth();

  const {
    category,
    categoryId,
    description,
    cep,
    street,
    number,
    complement,
    neighborhood,
    city,
    state,
    images
  } = useLocalSearchParams<{
    category: string;
    categoryId: string;
    description: string;
    cep: string;
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
    images: string;
  }>();

  const parsedImages: string[] = images ? JSON.parse(images) : [];

  const { data: customer, loading: customerLoading, error: customerError } = useFetch<any>(
    user ? `/api/Customers/by-user/${user.id}` : null
  );

  useEffect(() => {
    if (!customer) return;

    let isMounted = true;

    async function createServiceCall() {
      try {
        const payload = {
          title: `Chamado para ${category || 'Serviço'}`,
          description: description || '',
          categoryId: categoryId,
          imageUrl: parsedImages.length > 0 ? parsedImages[0] : null,
          address: {
            zipCode: cep,
            street: street,
            number: number,
            complement: complement || '',
            neighborhood: neighborhood,
            city: city,
            state: state,
            addressType: 'Home'
          }
        };

        const response = await apiRequest<any>(`/api/Services/by-customer/${customer.id}`, {
          method: 'POST',
          body: JSON.stringify(payload)
        });

        if (isMounted) {
          if (response.error) {
            alert('Erro ao criar o chamado: ' + response.error);
            router.back();
          } else {
            // Success: Wait 2.5 seconds to show the animation, then go to found screen
            setTimeout(() => {
              if (isMounted) {
                router.replace(`/client/tracking/${response.data.id}` as any);
              }
            }, 2500);
          }
        }
      } catch (err) {
        if (isMounted) {
          alert('Erro ao processar criação de chamado no servidor.');
          router.back();
        }
      }
    }

    createServiceCall();

    return () => {
      isMounted = false;
    };
  }, [customer]);

  return (
    <View className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between">
      <View className="flex-1 flex flex-col items-center justify-center p-8">
        <View className="w-24 h-24 bg-[#2563EB]/10 rounded-full flex-row items-center justify-center mb-6 relative">
          <Loader2 className="w-12 h-12 text-[#2563EB] animate-spin" />
          <View className="absolute inset-0 rounded-full border-4 border-[#2563EB]/20 animate-ping"></View>
        </View>

        <Text className="text-2xl font-bold text-[#0F172A] text-center mb-2">
          Publicando seu chamado
        </Text>
        <Text className="text-[#64748B] text-center max-w-xs">
          Estamos enviando as informações e procurando profissionais da categoria {category} próximos a você...
        </Text>

        {(customerLoading) && (
          <Text className="text-[#64748B] text-xs text-center mt-4 italic">
            Obtendo dados do perfil do cliente...
          </Text>
        )}
      </View>

      <View className="p-6 space-y-3 bg-white border-t border-[#E2E8F0]">
        <View className="flex-row items-center gap-3 text-sm">
          <View className="w-8 h-8 bg-[#26FFF5]/10 rounded-lg flex-row items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-[#26FFF5]" />
          </View>
          <Text className="text-[#64748B]">
            Todos os profissionais são verificados
          </Text>
        </View>

        <View className="flex-row items-center gap-3 text-sm">
          <View className="w-8 h-8 bg-[#FBBF24]/10 rounded-lg flex-row items-center justify-center">
            <Star className="w-4 h-4 text-[#FBBF24]" />
          </View>
          <Text className="text-[#64748B]">
            Selecionamos os melhores avaliados
          </Text>
        </View>

        <View className="flex-row items-center gap-3 text-sm">
          <View className="w-8 h-8 bg-[#2563EB]/10 rounded-lg flex-row items-center justify-center">
            <Clock className="w-4 h-4 text-[#2563EB]" />
          </View>
          <Text className="text-[#64748B]">
            Atendimento rápido garantido
          </Text>
        </View>
      </View>
    </View>
  );
}
