import { useRouter } from 'expo-router';
import { Button } from '../../../components/Button';
import { View } from 'react-native';
import { ScreenHeader } from '../../../components/ScreenHeader';

export default function CallDetails() {
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <ScreenHeader title="Detalhes do Chamado" showBack />
      <View style={{ padding: 24 }}>
        <Button onPress={() => router.push('/provider' as any)} className="mt-4">Voltar</Button>
      </View>
    </View>
  );
}
