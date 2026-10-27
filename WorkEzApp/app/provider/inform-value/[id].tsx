import { useState, useEffect, useMemo } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, CheckCircle2, DollarSign, User, Wrench, AlertCircle, Camera, Plus, Trash2 } from 'lucide-react-native';
import { 
  View, 
  Text, 
  TextInput, 
  ActivityIndicator, 
  Alert, 
  StyleSheet, 
  TouchableOpacity, 
  Platform, 
  ScrollView,
  Image 
} from 'react-native';
import { WorkEzTheme } from '../../../constants/theme';
import { useAppTheme } from '../../../contexts/ThemeContext';
import { useFetch } from '../../../hooks/useFetch';
import { apiRequest, uploadChecklistPhotos } from '../../../services/api';
import { imageService } from '../../../services/imageService';
import * as ImagePicker from 'expo-image-picker';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { ImageViewerModal } from '../../../components/ImageViewerModal';

export default function InformValue() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  // Vistoria de Conclusão: até 3 fotos do serviço finalizado (Branch 5)
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  // Busca dados do serviço para pré-preencher o valor acordado
  const { data: service, loading } = useFetch<any>(
    id ? `/api/Services/${id}` : null
  );

  useEffect(() => {
    if (service && service.price && !value) {
      setValue(Number(service.price).toFixed(2));
    }
  }, [service]);

  const pickPhoto = async () => {
    if (photos.length >= 3) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('Você pode anexar no máximo 3 fotos de conclusão.');
      } else {
        Alert.alert('Limite atingido', 'Você pode anexar no máximo 3 fotos de conclusão.');
      }
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert('Precisamos de permissão para acessar a galeria ou fotos!');
        } else {
          Alert.alert('Permissão necessária', 'Precisamos de permissão para acessar a galeria ou fotos!');
        }
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
        setUploadingPhoto(true);
        try {
          const url = await imageService.uploadImage(asset.uri, asset.base64);
          setPhotos(prev => [...prev, url].slice(0, 3));
        } catch (e) {
          console.error(e);
          Alert.alert('Erro', 'Falha ao processar a imagem selecionada.');
        } finally {
          setUploadingPhoto(false);
        }
      }
    } catch (err) {
      console.warn('Erro ao selecionar foto:', err);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push(`/provider/in-progress/${id}` as any);
    }
  };

  const handleConfirmValue = async () => {
    if (!id) return;
    const cleanVal = value.replace(/\s/g, '').replace(',', '.');
    const priceNum = parseFloat(cleanVal);
    
    if (isNaN(priceNum) || priceNum <= 0) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('Por favor, insira um valor válido maior que zero.');
      } else {
        Alert.alert('Valor inválido', 'Por favor, insira um valor válido maior que zero.');
      }
      return;
    }

    setSaving(true);
    try {
      // 1. Salva fotos de conclusão (Vistoria Depois) com timestamp se houver fotos anexadas
      if (photos.length > 0) {
        await uploadChecklistPhotos(id, 'after', photos);
      }

      // 2. Finaliza serviço e registra o valor final
      const res = await apiRequest<any>(`/api/Services/${id}/complete?price=${priceNum}`, {
        method: 'POST'
      });

      if (res.error) {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert(`Erro ao concluir: ${res.error}`);
        } else {
          Alert.alert('Erro', res.error);
        }
      } else {
        router.push(`/provider/waiting-payment/${id}` as any);
      }
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || 'Não foi possível se conectar ao servidor.';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(`Erro: ${msg}`);
      } else {
        Alert.alert('Erro', msg);
      }
    } finally {
      setSaving(false);
    }
  };

  const dynamicStyles = useMemo(() => {
    return StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: colors.background,
      },
      scrollContent: {
        padding: 20,
        maxWidth: 600,
        width: '100%',
        alignSelf: 'center',
        gap: 16,
      },
      serviceCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDark ? 0.25 : 0.04,
        shadowRadius: 3,
        elevation: 1,
      },
      serviceHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      },
      iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: isDark ? 'rgba(37, 99, 235, 0.2)' : '#EFF6FF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: isDark ? 'rgba(37, 99, 235, 0.4)' : '#DBEAFE',
      },
      serviceCategory: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
      },
      serviceClient: {
        fontSize: 13,
        color: colors.textSecondary,
      },
      priceEstimateRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.surface,
        padding: 10,
        borderRadius: 10,
        marginTop: 12,
        borderWidth: 1,
        borderColor: colors.border,
      },
      priceEstimateLabel: {
        fontSize: 12,
        color: colors.textSecondary,
      },
      priceEstimateValue: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.secondary,
      },
      inputCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDark ? 0.25 : 0.04,
        shadowRadius: 3,
        elevation: 1,
      },
      cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 4,
      },
      cardSubtitle: {
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 18,
        marginBottom: 16,
      },
      inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.primary,
        borderRadius: 12,
        backgroundColor: colors.surface,
        paddingHorizontal: 16,
        marginBottom: 14,
      },
      currencyPrefix: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.primary,
        marginRight: 8,
      },
      textInput: {
        flex: 1,
        fontSize: 22,
        fontWeight: '700',
        color: colors.text,
        paddingVertical: 14,
      },
      hintBox: {
        flexDirection: 'row',
        gap: 8,
        backgroundColor: colors.surface,
        borderRadius: 10,
        padding: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: colors.border,
      },
      hintText: {
        flex: 1,
        fontSize: 12,
        color: colors.textSecondary,
        lineHeight: 17,
      },
      btnConfirm: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: colors.primary,
        paddingVertical: 14,
        borderRadius: 12,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 2,
      },
      btnConfirmText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
      },
      btnDisabled: {
        opacity: 0.65,
      },
      photoCountBadge: {
        backgroundColor: isDark ? 'rgba(37, 99, 235, 0.15)' : '#EFF6FF',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(37, 99, 235, 0.3)' : '#BFDBFE',
      },
      photoCountBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.primary,
      },
      photosGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 10,
      },
      photoThumbWrapper: {
        position: 'relative',
        width: 100,
        height: 100,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
      },
      photoThumbImg: {
        width: '100%',
        height: '100%',
      },
      photoRemoveBtn: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: 'rgba(220, 38, 38, 0.85)',
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
      },
      photoIndexBadge: {
        position: 'absolute',
        bottom: 4,
        left: 4,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
      },
      photoIndexText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '700',
      },
      addPhotoCardBtn: {
        width: 100,
        height: 100,
        borderRadius: 12,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: colors.primary,
        backgroundColor: isDark ? 'rgba(37, 99, 235, 0.15)' : '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 6,
      },
      addPhotoIconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: isDark ? 'rgba(37, 99, 235, 0.3)' : '#DBEAFE',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
      },
      addPhotoBtnText: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.primary,
      },
      addPhotoBtnSub: {
        fontSize: 9,
        color: colors.textSecondary,
        marginTop: 1,
      },
    });
  }, [colors, isDark]);

  return (
    <View style={dynamicStyles.container}>
      {/* Top Header */}
      <ScreenHeader
        title="Informar Valor Final"
        subtitle="Conclusão do atendimento"
        showBack
        onBack={handleBack}
      />

      <ScrollView contentContainerStyle={dynamicStyles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Card do Chamado */}
        {service && (
          <View style={dynamicStyles.serviceCard}>
            <View style={dynamicStyles.serviceHeaderRow}>
              <View style={dynamicStyles.iconCircle}>
                <Wrench size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={dynamicStyles.serviceCategory}>{service.category || 'Serviço Prestado'}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <User size={13} color={colors.textSecondary} />
                  <Text style={dynamicStyles.serviceClient}>{service.clientName || 'Cliente'}</Text>
                </View>
              </View>
            </View>

            {service.price ? (
              <View style={dynamicStyles.priceEstimateRow}>
                <Text style={dynamicStyles.priceEstimateLabel}>Valor acordado na proposta:</Text>
                <Text style={dynamicStyles.priceEstimateValue}>
                  R$ {Number(service.price).toFixed(2).replace('.', ',')}
                </Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Card de Fotos da Vistoria de Conclusão (Branch 5) */}
        <View style={dynamicStyles.inputCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Camera size={18} color={colors.primary} />
              <Text style={dynamicStyles.cardTitle}>Vistoria do Serviço Finalizado</Text>
            </View>
            <View style={dynamicStyles.photoCountBadge}>
              <Text style={dynamicStyles.photoCountBadgeText}>{photos.length}/3 fotos</Text>
            </View>
          </View>
          <Text style={dynamicStyles.cardSubtitle}>
            Anexe até 3 fotos do serviço pronto como comprovação para o cliente visualizar antes de pagar.
          </Text>

          {/* Grid de fotos anexadas */}
          <View style={dynamicStyles.photosGrid}>
            {photos.map((uri, index) => (
              <View key={index} style={dynamicStyles.photoThumbWrapper}>
                <TouchableOpacity
                  onPress={() => {
                    setViewerIndex(index);
                    setViewerVisible(true);
                  }}
                  activeOpacity={0.85}
                >
                  <Image source={{ uri }} style={dynamicStyles.photoThumbImg} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={dynamicStyles.photoRemoveBtn}
                  onPress={() => removePhoto(index)}
                  activeOpacity={0.7}
                >
                  <Trash2 size={13} color="#FFFFFF" />
                </TouchableOpacity>
                <View style={dynamicStyles.photoIndexBadge}>
                  <Text style={dynamicStyles.photoIndexText}>{index + 1}</Text>
                </View>
              </View>
            ))}

            {photos.length < 3 && (
              <TouchableOpacity
                style={dynamicStyles.addPhotoCardBtn}
                onPress={pickPhoto}
                disabled={uploadingPhoto}
                activeOpacity={0.75}
              >
                {uploadingPhoto ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <View style={dynamicStyles.addPhotoIconCircle}>
                      <Plus size={20} color={colors.primary} />
                    </View>
                    <Text style={dynamicStyles.addPhotoBtnText}>Adicionar Foto</Text>
                    <Text style={dynamicStyles.addPhotoBtnSub}>Câmera ou Galeria</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Card do Input de Valor */}
        <View style={dynamicStyles.inputCard}>
          <Text style={dynamicStyles.cardTitle}>Valor Final do Serviço</Text>
          <Text style={dynamicStyles.cardSubtitle}>
            Confirme ou ajuste o valor a ser cobrado do cliente para liberar o pagamento.
          </Text>

          <View style={dynamicStyles.inputWrapper}>
            <Text style={dynamicStyles.currencyPrefix}>R$</Text>
            <TextInput
              style={dynamicStyles.textInput}
              keyboardType="decimal-pad"
              placeholder="0,00"
              placeholderTextColor={colors.textSecondary}
              value={value}
              onChangeText={setValue}
            />
          </View>

          <View style={dynamicStyles.hintBox}>
            <AlertCircle size={16} color={colors.textSecondary} style={{ marginTop: 2 }} />
            <Text style={dynamicStyles.hintText}>
              Este valor será cobrado diretamente do cliente na tela de pagamento.
            </Text>
          </View>

          <TouchableOpacity
            style={[dynamicStyles.btnConfirm, saving && dynamicStyles.btnDisabled]}
            onPress={handleConfirmValue}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <CheckCircle2 size={20} color="#FFFFFF" />
                <Text style={dynamicStyles.btnConfirmText}>Confirmar Valor e Finalizar</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Visualizador de Fotos */}
      <ImageViewerModal
        visible={viewerVisible}
        images={photos}
        initialIndex={viewerIndex}
        title="Fotos da Conclusão"
        onClose={() => setViewerVisible(false)}
      />
    </View>
  );
}
