import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ShieldCheck, Zap, CreditCard, ChevronRight } from 'lucide-react-native';
import { Button } from '../components/Button';
import { View, Text, StyleSheet } from 'react-native';
import { WorkEzTheme } from '../constants/theme';

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
      router.push('/profile-choice' as any);
    }
  };

  const slide = slides[currentSlide];
  const Icon = slide.icon;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Icon size={48} color={WorkEzTheme.colors.primary} />
        </View>

        <Text style={styles.title}>
          {slide.title}
        </Text>

        <Text style={styles.description}>
          {slide.description}
        </Text>

        <View style={styles.paginationContainer}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentSlide ? styles.dotActive : styles.dotInactive
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <Button fullWidth onPress={handleNext}>
          <View style={styles.buttonContent}>
            <Text style={styles.buttonText}>
              {currentSlide < slides.length - 1 ? 'Continuar' : 'Começar'}
            </Text>
            <ChevronRight size={20} color="#FFFFFF" style={styles.buttonIcon} />
          </View>
        </Button>

        {currentSlide < slides.length - 1 && (
          <Button
            variant="ghost"
            fullWidth
            onPress={() => router.push('/profile-choice' as any)}
          >
            Pular
          </Button>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WorkEzTheme.colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  iconContainer: {
    width: 96,
    height: 96,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  title: {
    ...WorkEzTheme.typography['2xl'],
    fontWeight: WorkEzTheme.typography.fontWeight.bold,
    color: WorkEzTheme.colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    ...WorkEzTheme.typography.base,
    color: WorkEzTheme.colors.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 24,
  },
  paginationContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 48,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 32,
    backgroundColor: WorkEzTheme.colors.primary,
  },
  dotInactive: {
    width: 8,
    backgroundColor: WorkEzTheme.colors.border,
  },
  footer: {
    padding: 24,
    gap: 12,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: WorkEzTheme.typography.fontWeight.semibold,
  },
  buttonIcon: {
    marginLeft: 8,
  },
});
