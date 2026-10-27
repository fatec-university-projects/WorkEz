import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Camera, MapPin, Home, Briefcase, Plus, Check, CheckCircle2 } from 'lucide-react-native';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import {
  View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView,
  ActivityIndicator, Image, Switch
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { imageService } from '../../services/imageService';
import { ScreenHeader } from '../../components/ScreenHeader';
import { geocodeAddress } from '../../hooks/useLocation';
import { useAppTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { fetchUserAddresses, createAddress, AddressItem } from '../../services/api';
import { safeStorage } from '../../services/storage';

export default function DescribeService() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();
  const { user } = useAuth();
  const { category, categoryId } = useLocalSearchParams<{ category: string; categoryId: string }>();
  const categoryName = category || 'Encanador';
  const defaultCategoryId = '11111111-1111-1111-1111-111111111102'; // Hidráulica / Encanador Guid
  const selectedCategoryId = categoryId || defaultCategoryId;

  const [description, setDescription] = useState('');
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [cepLoading, setCepLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // Gestão de endereços salvos
  const [savedAddresses, setSavedAddresses] = useState<AddressItem[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | 'new'>('new');
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [saveNewAddress, setSaveNewAddress] = useState(true);
  const [newAddressType, setNewAddressType] = useState<'Home' | 'Work' | 'Other'>('Home');

  const applyAddress = useCallback((addr: AddressItem) => {
    setCep(addr.zipCode || '');
    setStreet(addr.street || '');
    setNumber(addr.number || '');
    setComplement(addr.complement || '');
    setNeighborhood(addr.neighborhood || '');
    setCity(addr.city || '');
    setState(addr.state || '');
    if (addr.latitude && addr.longitude) {
      setCoords({ latitude: addr.latitude, longitude: addr.longitude });
    }
  }, []);

  // Carrega endereços salvos da conta do cliente
  useEffect(() => {
    let isMounted = true;

    const loadUserAddresses = async () => {
      const storageKey = user ? `@workez_addresses_${user.id}` : '@workez_addresses_guest';
      const defaultStorageKey = user ? `@workez_default_address_${user.id}` : '@workez_default_address_guest';
      let list: AddressItem[] = [];

      try {
        const res = await fetchUserAddresses();
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          list = res.data;
        }
      } catch {}

      if (list.length === 0) {
        try {
          const cached = await safeStorage.getItem(storageKey);
          if (cached) list = JSON.parse(cached);
        } catch {}
      }

      if (!isMounted) return;

      setSavedAddresses(list);
      setLoadingAddresses(false);

      if (list.length > 0) {
        let target = list[0];
        try {
          const defId = await safeStorage.getItem(defaultStorageKey);
          if (defId) {
            const found = list.find((a) => a.id === defId);
            if (found) target = found;
          }
        } catch {}

        setSelectedAddressId(target.id);
        applyAddress(target);
      } else {
        setSelectedAddressId('new');
      }
    };

    loadUserAddresses();
    return () => {
      isMounted = false;
    };
  }, [user, applyAddress]);

  const handleSelectSavedAddress = (item: AddressItem) => {
    setSelectedAddressId(item.id);
    applyAddress(item);
  };

  const handleSelectNewAddress = () => {
    setSelectedAddressId('new');
    setCep('');
    setStreet('');
    setNumber('');
    setComplement('');
    setNeighborhood('');
    setCity('');
    setState('');
    setCoords(null);
  };

  const handleCepChange = async (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 8);
    let masked = cleaned;
    if (cleaned.length > 5) {
      masked = cleaned.slice(0, 5) + '-' + cleaned.slice(5, 8);
    }
    setCep(masked);

    if (cleaned.length === 8) {
      setCepLoading(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
        const json = await response.json();
        if (json && !json.erro) {
          const st = json.logradouro || '';
          const nb = json.bairro || '';
          const ct = json.localidade || '';
          const uf = json.uf || '';

          setStreet(st);
          setNeighborhood(nb);
          setCity(ct);
          setState(uf);

          geocodeAddress({
            street: st,
            neighborhood: nb,
            city: ct,
            state: uf,
            postalCode: cleaned,
          }).then((c) => {
            if (c) setCoords(c);
          }).catch(() => {});
        } else {
          alert('CEP não encontrado.');
        }
      } catch (err) {
        console.error(err);
        alert('Erro ao buscar o CEP.');
      } finally {
        setCepLoading(false);
      }
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Precisamos de permissão para acessar suas fotos!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      setUploading(true);

      try {
        const imageUrl = await imageService.uploadImage(asset.uri, asset.base64);
        setImages(prev => [...prev, imageUrl]);
        alert('Imagem enviada com sucesso!');
      } catch (err) {
        console.error(err);
        alert('Erro ao enviar imagem.');
      } finally {
        setUploading(false);
      }
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // Ao continuar, se for novo endereço e a opção de salvar estiver ativa, salva automaticamente
  const handleContinue = async () => {
    if (selectedAddressId === 'new' && (saveNewAddress || savedAddresses.length === 0)) {
      const storageKey = user ? `@workez_addresses_${user.id}` : '@workez_addresses_guest';
      const defaultStorageKey = user ? `@workez_default_address_${user.id}` : '@workez_default_address_guest';

      const newPayload = {
        street: street.trim(),
        number: number.trim(),
        complement: complement.trim() || undefined,
        neighborhood: neighborhood.trim(),
        city: city.trim(),
        state: state.trim().toUpperCase(),
        zipCode: cep.trim(),
        addressType: newAddressType,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
      };

      try {
        const res = await createAddress(newPayload);
        const newItem: AddressItem = res.data || {
          ...newPayload,
          id: `addr_${Date.now()}`,
          userId: user?.id || 'guest',
          addressType: newAddressType,
        };
        const updatedList = [newItem, ...savedAddresses];
        await safeStorage.setItem(storageKey, JSON.stringify(updatedList));

        // Se for o primeiro, define como padrão
        if (savedAddresses.length === 0) {
          await safeStorage.setItem(defaultStorageKey, newItem.id);
        }
      } catch {
        // Se a API falhar, garante no storage local
        try {
          const fallbackItem: AddressItem = {
            ...newPayload,
            id: `addr_${Date.now()}`,
            userId: user?.id || 'guest',
            addressType: newAddressType,
          };
          const updatedList = [fallbackItem, ...savedAddresses];
          await safeStorage.setItem(storageKey, JSON.stringify(updatedList));
          if (savedAddresses.length === 0) {
            await safeStorage.setItem(defaultStorageKey, fallbackItem.id);
          }
        } catch {}
      }
    }

    router.push({
      pathname: '/client/confirm',
      params: {
        category: categoryName,
        categoryId: selectedCategoryId,
        description,
        cep,
        street,
        number,
        complement,
        neighborhood,
        city,
        state,
        latitude: coords?.latitude?.toString() || '',
        longitude: coords?.longitude?.toString() || '',
        images: JSON.stringify(images),
      },
    } as any);
  };

  const selectedSavedAddress = useMemo(() => {
    if (selectedAddressId === 'new') return null;
    return savedAddresses.find((a) => a.id === selectedAddressId) || null;
  }, [selectedAddressId, savedAddresses]);

  const renderAddressIcon = (type?: string) => {
    const t = (type || '').toLowerCase();
    if (t === 'work') return <Briefcase size={16} color="#8B5CF6" />;
    if (t === 'home') return <Home size={16} color="#2563EB" />;
    return <MapPin size={16} color="#F59E0B" />;
  };

  const getAddressLabel = (type?: string) => {
    const t = (type || '').toLowerCase();
    if (t === 'work') return 'Trabalho';
    if (t === 'home') return 'Casa';
    return 'Outro';
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundAlt }]}>
      <ScreenHeader title="Descreva o serviço" showBack />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Categoria */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Categoria Selecionada</Text>
          <View style={[styles.categoryBadge, { backgroundColor: isDark ? 'rgba(37, 99, 235, 0.16)' : '#EFF6FF', borderColor: isDark ? 'rgba(96, 165, 250, 0.35)' : '#BFDBFE' }]}>
            <Text style={[styles.categoryBadgeText, { color: isDark ? '#93C5FD' : '#1D4ED8' }]}>{categoryName}</Text>
          </View>
        </View>

        {/* Descrição */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>O que você precisa?</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Descreva detalhadamente o problema ou serviço que precisa..."
            multiline={true}
            numberOfLines={4}
            textAlignVertical="top"
            style={[styles.textInput, { backgroundColor: colors.backgroundCard, borderColor: colors.border, color: colors.text }]}
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {/* Fotos */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Adicionar fotos (opcional)</Text>
          <TouchableOpacity
            onPress={pickImage}
            disabled={uploading}
            style={[styles.photoUploadBtn, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
            activeOpacity={0.8}
          >
            {uploading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Camera size={32} color={colors.textSecondary} />
                <Text style={[styles.photoUploadText, { color: colors.textSecondary }]}>Toque para adicionar fotos</Text>
              </>
            )}
          </TouchableOpacity>

          {images.length > 0 && (
            <View style={styles.imagesGrid}>
              {images.map((imgUrl, idx) => (
                <View key={idx} style={[styles.imageWrapper, { borderColor: colors.border }]}>
                  <Image source={{ uri: imgUrl }} style={styles.uploadedImage} />
                  <TouchableOpacity
                    onPress={() => removeImage(idx)}
                    style={styles.removeImageBtn}
                  >
                    <Text style={styles.removeImageText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Local de Atendimento / Seleção de Endereços */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[styles.label, { color: colors.text }]}>Local de Atendimento</Text>
            {savedAddresses.length > 0 && selectedAddressId !== 'new' && (
              <TouchableOpacity onPress={handleSelectNewAddress}>
                <Text style={{ fontSize: 13, color: '#2563EB', fontWeight: '700' }}>+ Outro endereço</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Se tem endereços salvos, exibe seletor rápido */}
          {loadingAddresses ? (
            <ActivityIndicator size="small" color="#2563EB" style={{ alignSelf: 'flex-start' }} />
          ) : savedAddresses.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
              {savedAddresses.map((addr) => {
                const isSelected = selectedAddressId === addr.id;
                return (
                  <TouchableOpacity
                    key={addr.id}
                    onPress={() => handleSelectSavedAddress(addr)}
                    style={[
                      styles.addressChip,
                      {
                        backgroundColor: isSelected
                          ? (isDark ? '#2563EB' : '#1D4ED8')
                          : (isDark ? 'rgba(255, 255, 255, 0.05)' : colors.backgroundCard),
                        borderColor: isSelected
                          ? (isDark ? '#3B82F6' : '#1D4ED8')
                          : colors.border,
                      },
                    ]}
                  >
                    {renderAddressIcon(addr.addressType)}
                    <Text
                      style={[
                        styles.addressChipText,
                        { color: isSelected ? '#FFFFFF' : colors.text },
                      ]}
                    >
                      {getAddressLabel(addr.addressType)}: {addr.street.slice(0, 16)}...
                    </Text>
                    {isSelected && <Check size={14} color="#FFFFFF" />}
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                onPress={handleSelectNewAddress}
                style={[
                  styles.addressChip,
                  {
                    backgroundColor: selectedAddressId === 'new'
                      ? (isDark ? '#2563EB' : '#1D4ED8')
                      : (isDark ? 'rgba(255, 255, 255, 0.05)' : colors.backgroundCard),
                    borderColor: selectedAddressId === 'new'
                      ? (isDark ? '#3B82F6' : '#1D4ED8')
                      : colors.border,
                  },
                ]}
              >
                <Plus size={14} color={selectedAddressId === 'new' ? '#FFFFFF' : colors.textSecondary} />
                <Text
                  style={[
                    styles.addressChipText,
                    { color: selectedAddressId === 'new' ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  Novo endereço
                </Text>
              </TouchableOpacity>
            </ScrollView>
          ) : null}

          {/* Se um endereço salvo estiver selecionado, exibe o card de confirmação do local */}
          {selectedSavedAddress ? (
            <View
              style={[
                styles.selectedAddressBox,
                {
                  backgroundColor: isDark ? 'rgba(37, 99, 235, 0.12)' : '#EFF6FF',
                  borderColor: isDark ? 'rgba(96, 165, 250, 0.35)' : '#BFDBFE',
                },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View
                  style={[
                    styles.addressTypeBadgeCircle,
                    { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#FFFFFF' },
                  ]}
                >
                  {renderAddressIcon(selectedSavedAddress.addressType)}
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>
                      {getAddressLabel(selectedSavedAddress.addressType)}
                    </Text>
                    <View style={styles.selectedConfirmedBadge}>
                      <CheckCircle2 size={12} color="#10B981" />
                      <Text style={styles.selectedConfirmedText}>Selecionado</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 14, color: colors.text, fontWeight: '500' }}>
                    {selectedSavedAddress.street}, {selectedSavedAddress.number}
                    {selectedSavedAddress.complement ? ` • ${selectedSavedAddress.complement}` : ''}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    {selectedSavedAddress.neighborhood} — {selectedSavedAddress.city}/{selectedSavedAddress.state} (CEP: {selectedSavedAddress.zipCode})
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            /* Formulário para Digitar Novo Endereço */
            <View style={{ gap: 16 }}>
              {savedAddresses.length > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 4 }}>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>Cadastrando um novo local de atendimento:</Text>
                  <TouchableOpacity onPress={() => handleSelectSavedAddress(savedAddresses[0])}>
                    <Text style={{ fontSize: 12, color: '#2563EB', fontWeight: '600' }}>Usar endereço salvo</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Tipo do novo endereço */}
              <View style={{ gap: 6 }}>
                <Text style={[styles.label, { color: colors.textSecondary, fontSize: 12 }]}>Salvar como:</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[
                    { key: 'Home', label: 'Casa', icon: Home },
                    { key: 'Work', label: 'Trabalho', icon: Briefcase },
                    { key: 'Other', label: 'Outro', icon: MapPin },
                  ].map((type) => {
                    const isSelected = newAddressType === type.key;
                    const IconComp = type.icon;
                    return (
                      <TouchableOpacity
                        key={type.key}
                        onPress={() => setNewAddressType(type.key as any)}
                        style={[
                          styles.typeChipSmall,
                          {
                            backgroundColor: isSelected
                              ? (isDark ? '#2563EB' : '#1D4ED8')
                              : (isDark ? 'rgba(255, 255, 255, 0.05)' : colors.backgroundCard),
                            borderColor: isSelected ? '#3B82F6' : colors.border,
                          },
                        ]}
                      >
                        <IconComp size={13} color={isSelected ? '#FFFFFF' : colors.textSecondary} />
                        <Text style={{ fontSize: 12, fontWeight: '600', color: isSelected ? '#FFFFFF' : colors.textSecondary }}>
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* CEP */}
              <View style={{ gap: 6 }}>
                <Text style={[styles.label, { color: colors.text }]}>CEP do serviço *</Text>
                <Input
                  value={cep}
                  onChangeText={handleCepChange}
                  placeholder="Digite o CEP (Ex: 09441-550)"
                  keyboardType="numeric"
                  maxLength={9}
                />
                {cepLoading && (
                  <ActivityIndicator size="small" color="#2563EB" style={{ marginTop: 4, alignSelf: 'flex-start' }} />
                )}
              </View>

              {street ? (
                <View style={[styles.section, { backgroundColor: isDark ? 'rgba(37, 99, 235, 0.16)' : '#EFF6FF', borderColor: isDark ? 'rgba(96, 165, 250, 0.35)' : '#BFDBFE', borderWidth: 1, padding: 14, borderRadius: 12, gap: 4 }]}>
                  <Text style={[styles.label, { color: isDark ? '#93C5FD' : '#1D4ED8' }]}>Endereço encontrado:</Text>
                  <Text style={{ fontSize: 15, color: colors.text, fontWeight: '600' }}>
                    {street}, {neighborhood}
                  </Text>
                  <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                    {city}/{state}
                  </Text>
                </View>
              ) : null}

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={[styles.label, { color: colors.text }]}>Número *</Text>
                  <Input
                    value={number}
                    onChangeText={setNumber}
                    placeholder="Ex: 123"
                    keyboardType="numeric"
                  />
                </View>

                <View style={{ flex: 2, gap: 6 }}>
                  <Text style={[styles.label, { color: colors.text }]}>Complemento</Text>
                  <Input
                    value={complement}
                    onChangeText={setComplement}
                    placeholder="Ex: Apto 4"
                  />
                </View>
              </View>

              {/* Opção para salvar este endereço */}
              <View style={[styles.saveAddressToggleRow, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC', borderColor: colors.border }]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>Salvar endereço</Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                    Disponível em "Meus Endereços" para futuros chamados
                  </Text>
                </View>
                <Switch
                  value={saveNewAddress}
                  onValueChange={setSaveNewAddress}
                  trackColor={{ false: colors.border, true: '#2563EB' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
          )}
        </View>

        <View style={[styles.dicaBanner, { backgroundColor: isDark ? 'rgba(37, 99, 235, 0.16)' : '#EFF6FF', borderColor: isDark ? 'rgba(96, 165, 250, 0.35)' : '#BFDBFE' }]}>
          <Text style={[styles.dicaText, { color: isDark ? '#93C5FD' : '#1D4ED8' }]}>
            💡 <Text style={{ fontWeight: 'bold' }}>Dica:</Text> Quanto mais detalhes você fornecer, mais rápido o profissional poderá entender e resolver seu problema.
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.backgroundCard, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
        <Button
          fullWidth
          onPress={handleContinue}
          disabled={!description.trim() || !cep || !street || !number.trim() || uploading}
        >
          Continuar
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 140,
    gap: 24,
  },
  section: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  categoryBadgeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  textInput: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderRadius: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  photoUploadBtn: {
    width: '100%',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoUploadText: {
    fontSize: 14,
  },
  dicaBanner: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  dicaText: {
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    borderTopWidth: 1,
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  imageWrapper: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    lineHeight: 18,
  },
  addressChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  addressChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  selectedAddressBox: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    marginTop: 4,
  },
  addressTypeBadgeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedConfirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  selectedConfirmedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  typeChipSmall: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  saveAddressToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
});
