import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  MapPin,
  Home,
  Briefcase,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Search,
  CheckCircle2,
  AlertCircle
} from 'lucide-react-native';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useAppTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  AddressItem,
  AddressPayload,
  fetchUserAddresses,
  createAddress,
  updateAddress,
  deleteAddress
} from '../../services/api';
import { safeStorage } from '../../services/storage';
import { geocodeAddress } from '../../hooks/useLocation';

type AddressType = 'Home' | 'Work' | 'Other';

interface AddressFormData {
  id?: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  addressType: AddressType;
  latitude?: number;
  longitude?: number;
}

const INITIAL_FORM: AddressFormData = {
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  zipCode: '',
  addressType: 'Home',
};

export default function MyAddresses() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();
  const { user } = useAuth();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [defaultAddressId, setDefaultAddressId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal de formulário
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [form, setForm] = useState<AddressFormData>(INITIAL_FORM);
  const [cepLoading, setCepLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const storageKey = user ? `@workez_addresses_${user.id}` : '@workez_addresses_guest';
  const defaultStorageKey = user ? `@workez_default_address_${user.id}` : '@workez_default_address_guest';

  // Carrega endereços da API e sincroniza com o cache local
  const loadAddresses = useCallback(async () => {
    setLoading(true);
    let loaded: AddressItem[] = [];

    // 1. Tenta carregar da API
    try {
      const res = await fetchUserAddresses();
      if (res.data && Array.isArray(res.data)) {
        loaded = res.data;
      }
    } catch {
      // Falha de rede silenciosa, usará cache
    }

    // 2. Se a API estiver offline ou vazia, verifica cache local
    if (loaded.length === 0) {
      try {
        const cached = await safeStorage.getItem(storageKey);
        if (cached) {
          loaded = JSON.parse(cached);
        }
      } catch {}
    } else {
      // Salva no cache local para resiliência offline
      try {
        await safeStorage.setItem(storageKey, JSON.stringify(loaded));
      } catch {}
    }

    // Carrega ID do endereço padrão
    try {
      const savedDefaultId = await safeStorage.getItem(defaultStorageKey);
      if (savedDefaultId && loaded.some((a) => a.id === savedDefaultId)) {
        setDefaultAddressId(savedDefaultId);
      } else if (loaded.length > 0) {
        setDefaultAddressId(loaded[0].id);
      }
    } catch {}

    setAddresses(loaded);
    setLoading(false);
    setRefreshing(false);
  }, [storageKey, defaultStorageKey]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  // Busca CEP automático via ViaCEP
  const handleCepChange = async (val: string) => {
    const raw = val.replace(/\D/g, '');
    let formatted = raw;
    if (raw.length > 5) {
      formatted = `${raw.slice(0, 5)}-${raw.slice(5, 8)}`;
    }
    setForm((prev) => ({ ...prev, zipCode: formatted }));

    if (raw.length === 8) {
      setCepLoading(true);
      setFormError(null);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
        const data = await res.json();

        if (data.erro) {
          setFormError('CEP não encontrado. Por favor, digite o endereço manualmente.');
        } else {
          setForm((prev) => ({
            ...prev,
            street: data.logradouro || prev.street,
            neighborhood: data.bairro || prev.neighborhood,
            city: data.localidade || prev.city,
            state: data.uf || prev.state,
          }));

          // Geocodificação opcional em background
          geocodeAddress({
            street: data.logradouro,
            city: data.localidade,
            state: data.uf,
            postalCode: raw,
          }).then((coords) => {
            if (coords) {
              setForm((prev) => ({
                ...prev,
                latitude: coords.latitude,
                longitude: coords.longitude,
              }));
            }
          }).catch(() => {});
        }
      } catch {
        setFormError('Não foi possível consultar o CEP automaticamente.');
      } finally {
        setCepLoading(false);
      }
    }
  };

  const handleOpenAddModal = () => {
    setEditingAddressId(null);
    setForm(INITIAL_FORM);
    setFormError(null);
    setModalVisible(true);
  };

  const handleOpenEditModal = (item: AddressItem) => {
    setEditingAddressId(item.id);
    setForm({
      id: item.id,
      street: item.street,
      number: item.number,
      complement: item.complement || '',
      neighborhood: item.neighborhood,
      city: item.city,
      state: item.state,
      zipCode: item.zipCode,
      addressType: (item.addressType as AddressType) || 'Home',
      latitude: item.latitude,
      longitude: item.longitude,
    });
    setFormError(null);
    setModalVisible(true);
  };

  const handleSaveAddress = async () => {
    if (!form.street.trim()) {
      setFormError('Informe a rua / logradouro.');
      return;
    }
    if (!form.number.trim()) {
      setFormError('Informe o número do endereço.');
      return;
    }
    if (!form.neighborhood.trim()) {
      setFormError('Informe o bairro.');
      return;
    }
    if (!form.city.trim() || !form.state.trim()) {
      setFormError('Informe a cidade e o estado.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const payload: AddressPayload = {
      street: form.street.trim(),
      number: form.number.trim(),
      complement: form.complement.trim() || undefined,
      neighborhood: form.neighborhood.trim(),
      city: form.city.trim(),
      state: form.state.trim().toUpperCase(),
      zipCode: form.zipCode.trim(),
      addressType: form.addressType,
      latitude: form.latitude,
      longitude: form.longitude,
    };

    let updatedList: AddressItem[] = [...addresses];

    try {
      if (editingAddressId) {
        // Atualiza
        const res = await updateAddress(editingAddressId, payload);
        const updatedItem: AddressItem = res.data || {
          ...payload,
          id: editingAddressId,
          userId: user?.id || 'guest',
          addressType: payload.addressType || 'Home',
        };
        updatedList = updatedList.map((a) => (a.id === editingAddressId ? updatedItem : a));
      } else {
        // Cria novo
        const res = await createAddress(payload);
        const newItem: AddressItem = res.data || {
          ...payload,
          id: `addr_${Date.now()}`,
          userId: user?.id || 'guest',
          addressType: payload.addressType || 'Home',
        };
        updatedList = [newItem, ...updatedList];

        // Se for o primeiro, define como padrão
        if (updatedList.length === 1) {
          setDefaultAddressId(newItem.id);
          await safeStorage.setItem(defaultStorageKey, newItem.id);
        }
      }

      setAddresses(updatedList);
      await safeStorage.setItem(storageKey, JSON.stringify(updatedList));
      setModalVisible(false);
    } catch {
      setFormError('Erro ao salvar endereço. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAddress = (id: string) => {
    const confirmDelete = async () => {
      try {
        await deleteAddress(id);
      } catch {}

      const nextList = addresses.filter((a) => a.id !== id);
      setAddresses(nextList);
      await safeStorage.setItem(storageKey, JSON.stringify(nextList));

      if (defaultAddressId === id) {
        const nextDefault = nextList[0]?.id || null;
        setDefaultAddressId(nextDefault);
        if (nextDefault) {
          await safeStorage.setItem(defaultStorageKey, nextDefault);
        } else {
          await safeStorage.removeItem(defaultStorageKey);
        }
      }
    };

    if (Platform.OS === 'web') {
      if (confirm('Deseja realmente excluir este endereço?')) {
        confirmDelete();
      }
    } else {
      Alert.alert('Excluir Endereço', 'Deseja realmente remover este endereço da sua conta?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: confirmDelete },
      ]);
    }
  };

  const handleSetDefault = async (id: string) => {
    setDefaultAddressId(id);
    await safeStorage.setItem(defaultStorageKey, id);
  };

  const renderTypeIcon = (type: string) => {
    const t = (type || '').toLowerCase();
    if (t === 'work') {
      return <Briefcase size={18} color="#8B5CF6" />;
    }
    if (t === 'home') {
      return <Home size={18} color="#2563EB" />;
    }
    return <MapPin size={18} color="#F59E0B" />;
  };

  const getTypeLabel = (type: string) => {
    const t = (type || '').toLowerCase();
    if (t === 'work') return 'Trabalho';
    if (t === 'home') return 'Casa';
    return 'Outro';
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Meus endereços" showBack />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom > 0 ? insets.bottom + 32 : 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Top Action Card */}
          <View style={styles.topBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.topBannerTitle}>Endereços para atendimento</Text>
              <Text style={styles.topBannerSub}>
                {addresses.length === 0
                  ? 'Nenhum endereço cadastrado ainda.'
                  : `${addresses.length} ${addresses.length === 1 ? 'endereço salvo' : 'endereços salvos'}`}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={handleOpenAddModal}
              activeOpacity={0.8}
            >
              <Plus size={16} color="#FFFFFF" />
              <Text style={styles.addBtnText}>Novo endereço</Text>
            </TouchableOpacity>
          </View>

          {/* Estado de Carregamento */}
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={styles.loadingText}>Carregando seus endereços...</Text>
            </View>
          ) : addresses.length === 0 ? (
            /* Estado Vazio */
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <MapPin size={38} color="#2563EB" />
              </View>
              <Text style={styles.emptyTitle}>Nenhum endereço cadastrado</Text>
              <Text style={styles.emptySub}>
                Cadastre sua casa, escritório ou locais frequentes para solicitar serviços com agilidade.
              </Text>
              <TouchableOpacity
                style={styles.emptyAddBtn}
                onPress={handleOpenAddModal}
                activeOpacity={0.85}
              >
                <Plus size={18} color="#FFFFFF" />
                <Text style={styles.emptyAddBtnText}>Cadastrar meu primeiro endereço</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Lista de Endereços */
            <View style={styles.addressList}>
              {addresses.map((item) => {
                const isDefault = item.id === defaultAddressId;

                return (
                  <View
                    key={item.id}
                    style={[styles.addressCard, isDefault && styles.addressCardDefault]}
                  >
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.cardTypeRow}>
                        <View style={styles.typeIconCircle}>
                          {renderTypeIcon(item.addressType)}
                        </View>
                        <Text style={styles.cardTypeLabel}>{getTypeLabel(item.addressType)}</Text>
                      </View>

                      {isDefault ? (
                        <View style={styles.defaultBadge}>
                          <Check size={12} color="#10B981" />
                          <Text style={styles.defaultBadgeText}>Padrão</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.setDefaultBtn}
                          onPress={() => handleSetDefault(item.id)}
                        >
                          <Text style={styles.setDefaultBtnText}>Definir como padrão</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Dados do endereço */}
                    <View style={styles.addressBody}>
                      <Text style={styles.streetText}>
                        {item.street}, {item.number}
                        {item.complement ? ` • ${item.complement}` : ''}
                      </Text>
                      <Text style={styles.cityText}>
                        {item.neighborhood} — {item.city}, {item.state}
                      </Text>
                      {item.zipCode ? (
                        <Text style={styles.cepText}>CEP: {item.zipCode}</Text>
                      ) : null}
                    </View>

                    {/* Rodapé de Ações */}
                    <View style={styles.cardActionsRow}>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => handleOpenEditModal(item)}
                      >
                        <Edit3 size={15} color={colors.textSecondary} />
                        <Text style={styles.actionBtnText}>Editar</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnDanger]}
                        onPress={() => handleDeleteAddress(item.id)}
                      >
                        <Trash2 size={15} color="#EF4444" />
                        <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Excluir</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── MODAL: CADASTRAR / EDITAR ENDEREÇO ───────────────────────────── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {editingAddressId ? 'Editar Endereço' : 'Novo Endereço'}
                </Text>
                <Text style={styles.modalSub}>
                  Preencha os dados do local de atendimento
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ maxHeight: 460 }}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Tipo de Endereço em Chips */}
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Identificação do local</Text>
                <View style={styles.typeSelectorRow}>
                  {[
                    { key: 'Home', label: 'Casa', icon: Home },
                    { key: 'Work', label: 'Trabalho', icon: Briefcase },
                    { key: 'Other', label: 'Outro', icon: MapPin },
                  ].map((type) => {
                    const isSelected = form.addressType === type.key;
                    const IconComp = type.icon;
                    return (
                      <TouchableOpacity
                        key={type.key}
                        style={[
                          styles.typeChip,
                          isSelected && styles.typeChipSelected,
                        ]}
                        onPress={() =>
                          setForm((prev) => ({
                            ...prev,
                            addressType: type.key as AddressType,
                          }))
                        }
                      >
                        <IconComp
                          size={15}
                          color={isSelected ? '#FFFFFF' : colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.typeChipText,
                            isSelected && styles.typeChipTextSelected,
                          ]}
                        >
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* CEP com Busca Automática */}
              <View style={styles.formGroup}>
                <View style={styles.labelWithBadge}>
                  <Text style={styles.inputLabel}>CEP</Text>
                  <Text style={styles.autoCompleteBadge}>Busca automática</Text>
                </View>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="00000-000"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    maxLength={9}
                    value={form.zipCode}
                    onChangeText={handleCepChange}
                  />
                  {cepLoading ? (
                    <ActivityIndicator size="small" color="#2563EB" style={styles.inputIconRight} />
                  ) : (
                    <Search size={18} color={colors.textMuted} style={styles.inputIconRight} />
                  )}
                </View>
              </View>

              {/* Rua e Número */}
              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 2.2 }]}>
                  <Text style={styles.inputLabel}>Rua / Logradouro *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Nome da rua ou avenida"
                    placeholderTextColor={colors.textMuted}
                    value={form.street}
                    onChangeText={(val) => setForm((prev) => ({ ...prev, street: val }))}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Número *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Nº"
                    placeholderTextColor={colors.textMuted}
                    value={form.number}
                    onChangeText={(val) => setForm((prev) => ({ ...prev, number: val }))}
                  />
                </View>
              </View>

              {/* Complemento */}
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Complemento (opcional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Apto 42, Bloco B, Fundos"
                  placeholderTextColor={colors.textMuted}
                  value={form.complement}
                  onChangeText={(val) => setForm((prev) => ({ ...prev, complement: val }))}
                />
              </View>

              {/* Bairro */}
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Bairro *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Bairro"
                  placeholderTextColor={colors.textMuted}
                  value={form.neighborhood}
                  onChangeText={(val) => setForm((prev) => ({ ...prev, neighborhood: val }))}
                />
              </View>

              {/* Cidade e Estado */}
              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 2.5 }]}>
                  <Text style={styles.inputLabel}>Cidade *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Cidade"
                    placeholderTextColor={colors.textMuted}
                    value={form.city}
                    onChangeText={(val) => setForm((prev) => ({ ...prev, city: val }))}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>UF *</Text>
                  <TextInput
                    style={[styles.input, { textAlign: 'center' }]}
                    placeholder="UF"
                    placeholderTextColor={colors.textMuted}
                    maxLength={2}
                    autoCapitalize="characters"
                    value={form.state}
                    onChangeText={(val) => setForm((prev) => ({ ...prev, state: val.toUpperCase() }))}
                  />
                </View>
              </View>

              {/* Mensagem de Erro */}
              {formError ? (
                <View style={styles.errorBox}>
                  <AlertCircle size={16} color="#EF4444" />
                  <Text style={styles.errorText}>{formError}</Text>
                </View>
              ) : null}
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setModalVisible(false)}
                disabled={submitting}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveAddress}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Check size={16} color="#FFFFFF" />
                    <Text style={styles.modalSaveText}>Salvar Endereço</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const getStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.backgroundAlt,
    },
    scrollContent: {
      flexGrow: 1,
    },
    content: {
      padding: 16,
      gap: 16,
    },
    topBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.card,
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
    topBannerTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    topBannerSub: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: '#2563EB',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
    },
    addBtnText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
    },
    loadingBox: {
      padding: 48,
      alignItems: 'center',
      gap: 12,
    },
    loadingText: {
      color: colors.textSecondary,
      fontSize: 14,
    },
    emptyCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 36,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
      marginTop: 8,
    },
    emptyIconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: isDark ? 'rgba(37, 99, 235, 0.16)' : '#EFF6FF',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
    },
    emptySub: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 19,
      maxWidth: 320,
    },
    emptyAddBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: '#2563EB',
      paddingHorizontal: 20,
      paddingVertical: 13,
      borderRadius: 12,
      marginTop: 10,
    },
    emptyAddBtnText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },
    addressList: {
      gap: 12,
    },
    addressCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.2 : 0.04,
      shadowRadius: 3,
      elevation: 1,
    },
    addressCardDefault: {
      borderColor: isDark ? '#3B82F6' : '#93C5FD',
      borderWidth: 1.5,
    },
    cardHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    cardTypeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    typeIconCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : colors.backgroundAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardTypeLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
    },
    defaultBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#ECFDF5',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    defaultBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: isDark ? '#34D399' : '#059669',
    },
    setDefaultBtn: {
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    setDefaultBtnText: {
      fontSize: 11,
      fontWeight: '600',
      color: isDark ? '#60A5FA' : '#2563EB',
    },
    addressBody: {
      gap: 3,
    },
    streetText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      lineHeight: 21,
    },
    cityText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    cepText: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    cardActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 16,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: 4,
    },
    actionBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    actionBtnDanger: {},

    // Modal
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'flex-end',
    },
    modalContainer: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      paddingBottom: 24,
      gap: 16,
      maxHeight: '90%',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
    },
    modalSub: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    modalCloseBtn: {
      padding: 4,
    },
    modalScrollContent: {
      gap: 14,
      paddingVertical: 8,
    },
    formGroup: {
      gap: 6,
    },
    formRow: {
      flexDirection: 'row',
      gap: 10,
    },
    inputLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text,
    },
    labelWithBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    autoCompleteBadge: {
      fontSize: 10,
      fontWeight: '600',
      color: '#2563EB',
    },
    inputWrapper: {
      position: 'relative',
      justifyContent: 'center',
    },
    input: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F8FAFC',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.text,
    },
    inputIconRight: {
      position: 'absolute',
      right: 12,
    },
    typeSelectorRow: {
      flexDirection: 'row',
      gap: 8,
    },
    typeChip: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 9,
      borderRadius: 10,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.backgroundAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    typeChipSelected: {
      backgroundColor: isDark ? '#2563EB' : '#1D4ED8',
      borderColor: isDark ? '#3B82F6' : '#1D4ED8',
    },
    typeChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    typeChipTextSelected: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
      padding: 10,
      borderRadius: 8,
    },
    errorText: {
      fontSize: 12,
      color: '#EF4444',
      flex: 1,
    },
    modalFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 10,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    modalCancelBtn: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 10,
    },
    modalCancelText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    modalSaveBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: '#2563EB',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 10,
    },
    modalSaveText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#FFFFFF',
    },
  });
