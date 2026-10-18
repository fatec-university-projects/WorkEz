import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { MapPin, Navigation, Compass, ShieldCheck, Zap, Crosshair, Building, Home, Map as MapIcon, Infinity as InfinityIcon } from 'lucide-react-native';
import Slider from '@react-native-community/slider';
import { Button } from '../../components/Button';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, ScrollView, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useFetch } from '../../hooks/useFetch';
import { useLocation, reverseGeocodeCoords, AddressDetails } from '../../hooks/useLocation';
import { apiRequest } from '../../services/api';
import { WorkEzTheme } from '../../constants/theme';
import { ScreenHeader } from '../../components/ScreenHeader';
import { RadiusMapPreview } from '../../components/RadiusMapPreview';

export default function WorkArea() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { coordinates: gpsCoords, address: gpsAddress, refreshLocation, loading: gpsLoading } = useLocation();

  const { data: provider, loading: providerLoading } = useFetch<any>(
    user ? `/api/ServiceProviders/by-user/${user.id}` : null
  );

  const [serviceRadiusKm, setServiceRadiusKm] = useState(15);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [addressDetails, setAddressDetails] = useState<AddressDetails | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Inicializa a partir do perfil do prestador no banco
  useEffect(() => {
    if (provider) {
      if (provider.serviceRadiusKm) setServiceRadiusKm(provider.serviceRadiusKm);
      if (provider.latitude && provider.longitude) {
        const initialCoords = { latitude: provider.latitude, longitude: provider.longitude };
        setCoords(initialCoords);
        fetchAddress(initialCoords.latitude, initialCoords.longitude);
      }
    }
  }, [provider]);

  // Se não tem do banco, usa o GPS do dispositivo
  useEffect(() => {
    if (!coords && gpsCoords) {
      setCoords(gpsCoords);
      if (gpsAddress) {
        setAddressDetails(gpsAddress);
      } else {
        fetchAddress(gpsCoords.latitude, gpsCoords.longitude);
      }
    }
  }, [gpsCoords, coords, gpsAddress]);

  const fetchAddress = async (lat: number, lon: number) => {
    setAddressLoading(true);
    try {
      const details = await reverseGeocodeCoords(lat, lon);
      setAddressDetails(details);
    } catch (err) {
      console.warn('Erro ao obter detalhes do endereço:', err);
    } finally {
      setAddressLoading(false);
    }
  };

  const handleUseGps = async () => {
    const res = await refreshLocation();
    if (res?.coords) {
      setCoords(res.coords);
      setAddressDetails(res.address);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('Localização e endereço atualizados via GPS!');
      } else {
        Alert.alert('GPS Atualizado', 'Sua localização atual foi definida como base de atendimento.');
      }
    }
  };

  const handleSave = async () => {
    if (!provider?.id) {
      Alert.alert('Erro', 'Perfil de prestador não encontrado.');
      return;
    }

    setSubmitting(true);
    try {
      const targetCoords = coords || gpsCoords || { latitude: -23.55052, longitude: -46.633308 };

      const res = await apiRequest(`/api/ServiceProviders/${provider.id}/location`, {
        method: 'PUT',
        body: JSON.stringify({
          latitude: targetCoords.latitude,
          longitude: targetCoords.longitude,
          serviceRadiusKm: serviceRadiusKm,
        }),
      });

      if (res.error) {
        Alert.alert('Erro ao salvar localização', res.error);
        return;
      }

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('Raio e área de atendimento atualizados com sucesso!');
      } else {
        Alert.alert('Sucesso!', 'Raio e área de atendimento atualizados com sucesso!');
      }

      if (router.canGoBack()) {
        router.back();
      } else {
        router.push('/provider' as any);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Erro', 'Ocorreu um erro ao salvar suas preferências de área.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screenContainer}>
      <ScreenHeader
        title="Área de atuação"
        subtitle="Defina sua base no mapa e raio máximo de atendimento"
        showBack
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 50 + (insets.bottom > 0 ? insets.bottom : 20) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {providerLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={WorkEzTheme.colors.primary} />
            <Text style={styles.loadingText}>Carregando dados da sua região...</Text>
          </View>
        ) : (
          <View style={{ gap: 18 }}>
            {/* Card 1: Endereço Detalhado da Base */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.iconCircle}>
                  <MapPin size={20} color="#2563EB" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Sua Localização Base</Text>
                  <Text style={styles.cardSubtitle}>
                    Ponto de partida para o cálculo de distância.
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleUseGps}
                  disabled={gpsLoading}
                  style={styles.btnGps}
                  activeOpacity={0.8}
                >
                  {gpsLoading ? (
                    <ActivityIndicator size="small" color="#2563EB" />
                  ) : (
                    <>
                      <Crosshair size={13} color="#2563EB" />
                      <Text style={styles.btnGpsText}>Detectar GPS</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Informações detalhadas: Rua, Bairro, Cidade, Estado */}
              <View style={styles.addressBox}>
                {addressLoading ? (
                  <View style={styles.addressLoadingRow}>
                    <ActivityIndicator size="small" color="#2563EB" />
                    <Text style={styles.addressLoadingText}>Identificando rua, bairro e cidade...</Text>
                  </View>
                ) : (
                  <View style={{ gap: 10 }}>
                    <View style={styles.addressFieldRow}>
                      <View style={styles.addressBadgeIcon}>
                        <Home size={14} color="#2563EB" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.addressFieldLabel}>RUA / LOGRADOURO</Text>
                        <Text style={styles.addressFieldValue} numberOfLines={2}>
                          {addressDetails?.street || 'Erro ao carregar rua'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.addressFieldRow}>
                      <View style={styles.addressBadgeIcon}>
                        <Building size={14} color="#2563EB" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.addressFieldLabel}>BAIRRO</Text>
                        <Text style={styles.addressFieldValue} numberOfLines={1}>
                          {addressDetails?.neighborhood || 'Erro ao carregar bairro'}
                        </Text>
                      </View>
                    </View>

                    {/* Cidade, Estado e CEP em 2 colunas com espaço garantido */}
                    <View style={styles.addressInlineRow}>
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={styles.addressFieldLabel}>CIDADE / ESTADO</Text>
                        <Text style={styles.addressFieldValue} numberOfLines={1}>
                          {addressDetails?.city || 'Erro ao carregar cidade'}
                          {addressDetails?.state ? ` - ${addressDetails.state}` : ''}
                        </Text>
                      </View>

                      {addressDetails?.postalCode ? (
                        <View style={{ minWidth: 90, alignItems: 'flex-end' }}>
                          <Text style={styles.addressFieldLabel}>CEP</Text>
                          <Text style={styles.addressFieldValue}>
                            {addressDetails.postalCode}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* Card 2: Mapa com Ruas e Seletor de Raio */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={[styles.iconCircle, { backgroundColor: '#EFF6FF' }]}>
                  <MapIcon size={20} color="#2563EB" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Raio de atendimento no mapa</Text>
                  <Text style={styles.cardSubtitle}>
                    Escolha até que distância você deseja atender.
                  </Text>
                </View>
              </View>

              {/* Seletor de Raio: Input de Range de 5 km até Sem Limite */}
              <View style={styles.rangeContainer}>
                <View style={styles.rangeHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rangeTitle}>Distância Máxima</Text>
                    <Text style={styles.rangeSubtitle}>Arraste o slider para ajustar</Text>
                  </View>
                  
                  {serviceRadiusKm > 0 ? (
                    <View style={styles.rangeBadgeKm}>
                      <Text style={styles.rangeBadgeKmText}>{serviceRadiusKm} km</Text>
                    </View>
                  ) : (
                    <View style={styles.rangeBadgeUnlimited}>
                      <InfinityIcon size={14} color="#059669" />
                      <Text style={styles.rangeBadgeUnlimitedText}>Sem limite</Text>
                    </View>
                  )}
                </View>

                {/* Slider / Range Input interativo */}
                <View style={styles.sliderWrapper}>
                  {Platform.OS === 'web' ? (
                    React.createElement('input', {
                      type: 'range',
                      min: 5,
                      max: 105,
                      step: 5,
                      value: serviceRadiusKm <= 0 ? 105 : serviceRadiusKm,
                      onChange: (e: any) => {
                        const val = Number(e.target.value);
                        setServiceRadiusKm(val >= 105 ? 0 : val);
                      },
                      style: {
                        width: '100%',
                        height: 28,
                        accentColor: '#2563EB',
                        cursor: 'pointer',
                      },
                    })
                  ) : (
                    <Slider
                      style={{ width: '100%', height: 40 }}
                      minimumValue={5}
                      maximumValue={105}
                      step={5}
                      value={serviceRadiusKm <= 0 ? 105 : serviceRadiusKm}
                      onValueChange={(val) => {
                        setServiceRadiusKm(val >= 105 ? 0 : val);
                      }}
                      minimumTrackTintColor="#2563EB"
                      maximumTrackTintColor="#CBD5E1"
                      thumbTintColor="#2563EB"
                    />
                  )}
                </View>

                {/* Marcadores rápidos abaixo do slider */}
                <View style={styles.ticksRow}>
                  <TouchableOpacity
                    onPress={() => setServiceRadiusKm(5)}
                    activeOpacity={0.7}
                    style={[styles.tickChip, serviceRadiusKm === 5 && styles.tickChipActive]}
                  >
                    <Text style={[styles.tickText, serviceRadiusKm === 5 && styles.tickTextActive]}>5 km</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setServiceRadiusKm(20)}
                    activeOpacity={0.7}
                    style={[styles.tickChip, serviceRadiusKm === 20 && styles.tickChipActive]}
                  >
                    <Text style={[styles.tickText, serviceRadiusKm === 20 && styles.tickTextActive]}>20 km</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setServiceRadiusKm(50)}
                    activeOpacity={0.7}
                    style={[styles.tickChip, serviceRadiusKm === 50 && styles.tickChipActive]}
                  >
                    <Text style={[styles.tickText, serviceRadiusKm === 50 && styles.tickTextActive]}>50 km</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setServiceRadiusKm(100)}
                    activeOpacity={0.7}
                    style={[styles.tickChip, serviceRadiusKm === 100 && styles.tickChipActive]}
                  >
                    <Text style={[styles.tickText, serviceRadiusKm === 100 && styles.tickTextActive]}>100 km</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setServiceRadiusKm(0)}
                    activeOpacity={0.7}
                    style={[styles.tickChip, serviceRadiusKm <= 0 && styles.tickChipUnlimitedActive]}
                  >
                    <InfinityIcon size={13} color={serviceRadiusKm <= 0 ? '#FFFFFF' : '#059669'} />
                    <Text style={[styles.tickText, serviceRadiusKm <= 0 && styles.tickTextUnlimitedActive]}>
                      Sem limite
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Texto explicativo dinâmico */}
                <View style={styles.rangeInfoBanner}>
                  {serviceRadiusKm > 0 ? (
                    <Text style={styles.rangeInfoBannerText}>
                      Você receberá chamados localizados a até <Text style={styles.rangeInfoBold}>{serviceRadiusKm} km</Text> da sua base.
                    </Text>
                  ) : (
                    <Text style={styles.rangeInfoBannerText}>
                      <Text style={styles.rangeInfoUnlimitedBold}>Atendimento sem limite:</Text> você poderá receber chamados de qualquer lugar do Brasil.
                    </Text>
                  )}
                </View>
              </View>

              {/* Mapa de Ruas e Raio de Atendimento */}
              <RadiusMapPreview
                radiusKm={serviceRadiusKm}
                latitude={coords?.latitude}
                longitude={coords?.longitude}
                addressText={
                  addressDetails?.formattedAddress ||
                  (addressDetails?.street && addressDetails?.neighborhood
                    ? `${addressDetails.street}, ${addressDetails.neighborhood} - ${addressDetails.city}/${addressDetails.state}`
                    : undefined)
                }
              />
            </View>

            {/* Card 3: Resumo dos Benefícios */}
            <View style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>Como funciona a distribuição de chamados</Text>

              <View style={styles.infoItemRow}>
                <ShieldCheck size={18} color="#16A34A" />
                <Text style={styles.infoItemText}>
                  <Text style={{ fontWeight: '700', color: '#0F172A' }}>Oportunidades no seu raio:</Text> Você só receberá novos chamados de clientes em até {serviceRadiusKm} km da sua base.
                </Text>
              </View>

              <View style={styles.infoItemRow}>
                <Zap size={18} color="#EAB308" />
                <Text style={styles.infoItemText}>
                  <Text style={{ fontWeight: '700', color: '#0F172A' }}>Prioridade por proximidade:</Text> Chamados mais perto de você ganham destaque no topo da sua lista.
                </Text>
              </View>

              <View style={styles.infoItemRow}>
                <Compass size={18} color="#2563EB" />
                <Text style={styles.infoItemText}>
                  <Text style={{ fontWeight: '700', color: '#0F172A' }}>Ajuste a qualquer hora:</Text> Você pode alterar seu raio a qualquer momento sem afetar atendimentos em andamento.
                </Text>
              </View>
            </View>

            {/* Botão de Salvar */}
            <View style={{ marginTop: 6, marginBottom: 20 }}>
              <Button
                fullWidth
                onPress={handleSave}
                disabled={submitting}
              >
                {submitting ? <ActivityIndicator color="#FFF" /> : 'Salvar Raio de Atendimento'}
              </Button>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#64748B',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
    lineHeight: 16,
  },
  btnGps: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
  },
  btnGpsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  addressBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  addressLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  addressLoadingText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  addressFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addressBadgeIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressFieldLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  addressFieldValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 1,
  },
  addressInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  rangeContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    gap: 10,
  },
  rangeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rangeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  rangeSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  rangeBadgeKm: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
  },
  rangeBadgeKmText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2563EB',
  },
  rangeBadgeUnlimited: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
  },
  rangeBadgeUnlimitedText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  sliderWrapper: {
    width: '100%',
    paddingVertical: 4,
  },
  ticksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  tickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tickChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  tickChipUnlimitedActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  tickText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  tickTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  tickTextUnlimitedActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  rangeInfoBanner: {
    paddingTop: 2,
  },
  rangeInfoBannerText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  rangeInfoBold: {
    fontWeight: '700',
    color: '#2563EB',
  },
  rangeInfoUnlimitedBold: {
    fontWeight: '700',
    color: '#059669',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  infoCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  infoItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  infoItemText: {
    flex: 1,
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
  },
});
