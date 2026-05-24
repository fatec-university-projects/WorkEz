import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ShieldCheck, Zap, CreditCard, ChevronRight } from 'lucide-react-native';
import { Button } from '../components/Button';
import { View, Text } from 'react-native';

const slides = [
  {
    icon: ShieldCheck,
    title: 'Profissionais verificados',
    description: 'Todos os prestadores passam por verificação rigorosa de documentos, antecedentes e referências.',
  },
  {
    icon: Zap,
    title: 'Atendimento rápido',
    description: 'Encontre profissionais disponíveis agora mesmo com o "Chamar agora" e resolva seu problema sem espera.',
  },
  {
    icon: CreditCard,
    title: 'Pagamento seguro',
    description: 'Pague pelo app com total segurança e conte com a garantia da plataforma em todos os serviços.',
  },
];

export default function Onboarding() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      router.push('/profile-choice');
    }
  };

  const slide = slides[currentSlide];
  const Icon = slide.icon;

  return (
    <View className="min-h-screen bg-white flex flex-col">
      <View className="flex-1 flex flex-col items-center justify-center p-8">
        <View className="w-24 h-24 bg-[#2563EB]/10 rounded-3xl flex items-center justify-center mb-8">
          <Icon className="w-12 h-12 text-[#2563EB]" />
        </View>

        <Text className="text-2xl font-bold text-[#0F172A] text-center mb-4">
          {slide.title}
        </Text>

        <Text className="text-[#94A3B8] text-center max-w-sm leading-relaxed">
          {slide.description}
        </Text>

        <View className="flex gap-2 mt-12">
          {slides.map((_, index) => (
            <View
              key={index}
              className={`h-2 rounded-full transition-all ${
                index === currentSlide
                  ? 'w-8 bg-[#2563EB]'
                  : 'w-2 bg-[#E2E8F0]'
              }`}
            />
          ))}
        </View>
      </View>

      <View className="p-6 space-y-3">
        <Button fullWidth onPress={handleNext}>
          {currentSlide < slides.length - 1 ? 'Continuar' : 'Começar'}
          <ChevronRight className="w-5 h-5 inline ml-2" />
        </Button>

        {currentSlide < slides.length - 1 && (
          <Button
            variant="ghost"
            fullWidth
            onPress={() => router.push('/profile-choice')}
          >
            Pular
          </Button>
        )}
      </View>
    </View>
  );
}
