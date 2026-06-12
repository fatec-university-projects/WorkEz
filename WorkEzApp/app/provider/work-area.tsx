import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useFetch } from '../../hooks/useFetch';
import { apiRequest } from '../../services/api';
import { WorkEzTheme } from '../../constants/theme';

interface Category {
  id: string;
  name: string;
  description?: string;
}

export default function WorkArea() {
  const router = useRouter();
  const { user } = useAuth();

  const { data: dbCategories, loading: categoriesLoading } = useFetch<Category[]>('/api/Categories');
  const { data: provider, loading: providerLoading } = useFetch<any>(
    user ? `/api/ServiceProviders/by-user/${user.id}` : null
  );

  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [experience, setExperience] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const toggleCategory = (catId: string) => {
    setSelectedCategoryIds(prev =>
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    );
  };

  const handleContinue = async () => {
    if (selectedCategoryIds.length === 0) {
      Alert.alert('Aviso', 'Selecione pelo menos uma categoria de serviço.');
      return;
    }
    if (!experience.trim()) {
      Alert.alert('Aviso', 'Informe seus anos de experiência.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Aviso', 'Descreva suas habilidades profissionais.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Update Provider Description with Experience Years prepended
      const providerPayload = {
        ...provider,
        professionalDescription: `[Experiência: ${experience.trim()} anos] ${description.trim()}`,
      };

      const putResult = await apiRequest(`/api/ServiceProviders/${provider.id}`, {
        method: 'PUT',
        body: JSON.stringify(providerPayload),
      });

      if (putResult.error) {
        Alert.alert('Erro ao atualizar perfil', putResult.error);
        setSubmitting(false);
        return;
      }

      // 2. Link selected categories to provider
      const postResult = await apiRequest(`/api/ProviderCategories/by-provider/${provider.id}/categories`, {
        method: 'POST',
        body: JSON.stringify(selectedCategoryIds),
      });

      if (postResult.error) {
        Alert.alert('Erro ao salvar categorias', postResult.error);
        setSubmitting(false);
        return;
      }

      // Success: Redirect directly to provider dashboard to view services
      router.push('/provider' as any);
    } catch (err) {
      console.error(err);
      Alert.alert('Erro', 'Ocorreu um erro ao salvar suas informações.');
    } finally {
      setSubmitting(false);
    }
  };

  const isLoading = categoriesLoading || providerLoading;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#FFFFFF' }} contentContainerStyle={{ flexGrow: 1 }}>
      <View className="p-6">
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2 hover:bg-[#F1F5F9] rounded-lg transition-colors align-self-start"
        >
          <ArrowLeft className="w-6 h-6 text-[#0F172A]" />
        </TouchableOpacity>

        <Text className="text-3xl font-bold text-[#0F172A] mt-6 mb-2">
          Área de atuação
        </Text>
        <Text className="text-[#64748B] mb-6">
          Conte-nos sobre suas especialidades e sua profissão
        </Text>

        {isLoading ? (
          <View style={{ padding: 48, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={WorkEzTheme.colors.primary} />
            <Text style={{ marginTop: 16, color: '#64748B' }}>Carregando especialidades...</Text>
          </View>
        ) : (
          <View className="space-y-6">
            <View>
              <Text className="block text-sm font-semibold text-[#0F172A] mb-3">
                Categorias que você atende (Selecione todas que aplicam)
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {dbCategories?.map((cat) => {
                  const isSelected = selectedCategoryIds.includes(cat.id);
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => toggleCategory(cat.id)}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        borderRadius: 12,
                        borderWidth: 2,
                        borderColor: isSelected ? '#2563EB' : '#E2E8F0',
                        backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.05)' : '#FFFFFF',
                        minWidth: '47%'
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={{
                        fontWeight: '600',
                        color: isSelected ? '#2563EB' : '#0F172A',
                        textAlign: 'center'
                      }}>{cat.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={{ marginTop: 20 }}>
              <Text className="block text-sm font-semibold text-[#0F172A] mb-2">
                Anos de experiência
              </Text>
              <Input
                placeholder="Ex: 5"
                value={experience}
                onChangeText={setExperience}
                keyboardType="numeric"
              />
            </View>

            <View style={{ marginTop: 20 }}>
              <Text className="block text-sm font-semibold text-[#0F172A] mb-2">
                Descrição profissional
              </Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Descreva detalhadamente suas habilidades, qualificações e o que você oferece aos clientes..."
                multiline={true}
                numberOfLines={4}
                textAlignVertical="top"
                style={{
                  minHeight: 120,
                  width: '100%',
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 2,
                  borderColor: '#E2E8F0',
                  borderRadius: 12,
                  fontSize: 16,
                  color: '#0F172A',
                }}
              />
            </View>

            <View style={{ marginTop: 32, marginBottom: 40 }}>
              <Button
                fullWidth
                onPress={handleContinue}
                disabled={submitting}
              >
                {submitting ? <ActivityIndicator color="#FFF" /> : 'Salvar e Continuar'}
              </Button>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
