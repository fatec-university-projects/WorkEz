import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ArrowLeft, MapPin, Navigation } from 'lucide-react-native';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useFetch } from '../../hooks/useFetch';
import { useLocation } from '../../hooks/useLocation';
import { apiRequest } from '../../services/api';
import { WorkEzTheme } from '../../constants/theme';
import { ScreenHeader } from '../../components/ScreenHeader';
import { RadiusMapPreview } from '../../components/RadiusMapPreview';

interface Category {
  id: string;
  name: string;
  description?: string;
}

export default function WorkArea() {
  const router = useRouter();
  const { user } = useAuth();
  const { coordinates: gpsCoords, refreshLocation, loading: gpsLoading } = useLocation();

  const { data: dbCategories, loading: categoriesLoading } = useFetch<Category[]>('/api/Categories');
  const { data: provider, loading: providerLoading } = useFetch<any>(
    user ? `/api/ServiceProviders/by-user/${user.id}` : null
  );

  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [experience, setExperience] = useState('');
  const [description, setDescription] = useState('');
  const [serviceRadiusKm, setServiceRadiusKm] = useState(15);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (provider) {
      if (provider.serviceRadiusKm) setServiceRadiusKm(provider.serviceRadiusKm);
      if (provider.latitude && provider.longitude) {
        setCoords({ latitude: provider.latitude, longitude: provider.longitude });
      }
    }
  }, [provider]);

  useEffect(() => {
    if (!coords && gpsCoords) {
      setCoords(gpsCoords);
    }
  }, [gpsCoords, coords]);

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

      // 3. Update Provider GeoLocation & Radius
      const targetCoords = coords || gpsCoords || { latitude: -23.55052, longitude: -46.633308 };
      await apiRequest(`/api/ServiceProviders/${provider.id}/location`, {
        method: 'PUT',
        body: JSON.stringify({
          latitude: targetCoords.latitude,
          longitude: targetCoords.longitude,
          serviceRadiusKm: serviceRadiusKm,
        }),
      });

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
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScreenHeader
        title="Área de atuação"
        subtitle="Conte-nos sobre suas especialidades"
        showBack
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
        <View className="p-6">
          {isLoading ? (
          <View style={{ padding: 48, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={WorkEzTheme.colors.primary} />
            <Text style={{ marginTop: 16, color: '#64748B' }}>Carregando especialidades...</Text>
          </View>
        ) : (
          <View style={{ gap: 20 }}>
            <View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A', marginBottom: 12 }}>
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

            <View style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A', marginBottom: 8 }}>
                Anos de experiência
              </Text>
              <Input
                placeholder="Ex: 5"
                value={experience}
                onChangeText={setExperience}
                keyboardType="numeric"
              />
            </View>

            <View style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A', marginBottom: 8 }}>
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

            {/* ─── Raio de Atendimento & Localização Base ─── */}
            <View style={{ marginTop: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>
                  Raio de atendimento no mapa
                </Text>
                <TouchableOpacity
                  onPress={async () => {
                    const loc = await refreshLocation();
                    if (loc) setCoords(loc);
                  }}
                  disabled={gpsLoading}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                >
                  <Navigation size={14} color="#2563EB" />
                  <Text style={{ fontSize: 12, color: '#2563EB', fontWeight: '600' }}>
                    {gpsLoading ? 'Localizando...' : 'Usar GPS Atual'}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: 13, color: '#64748B', marginBottom: 12 }}>
                Defina até que distância da sua base você deseja receber oportunidades de chamados:
              </Text>

              {/* Seletor de Raio em KM */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                {[5, 10, 15, 20, 30].map((km) => (
                  <TouchableOpacity
                    key={km}
                    onPress={() => setServiceRadiusKm(km)}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 10,
                      borderWidth: 2,
                      borderColor: serviceRadiusKm === km ? '#2563EB' : '#E2E8F0',
                      backgroundColor: serviceRadiusKm === km ? '#2563EB' : '#FFFFFF',
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: '700',
                        fontSize: 13,
                        color: serviceRadiusKm === km ? '#FFFFFF' : '#475569',
                      }}
                    >
                      {km} km
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Radar Visualizador Interativo */}
              <RadiusMapPreview
                radiusKm={serviceRadiusKm}
                latitude={coords?.latitude}
                longitude={coords?.longitude}
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
  </View>
);
}
