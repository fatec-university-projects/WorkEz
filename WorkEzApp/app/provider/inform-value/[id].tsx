import { useState, useEffect } from 'react';
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
import { useFetch } from '../../../hooks/useFetch';
import { apiRequest, uploadChecklistPhotos } from '../../../services/api';
import { imageService } from '../../../services/imageService';
import * as ImagePicker from 'expo-image-picker';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { ImageViewerModal } from '../../../components/ImageViewerModal';

export default function InformValue() {
  const router = useRouter();
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

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <ScreenHeader
        title="Informar Valor Final"
        subtitle="Conclusão do atendimento"
        showBack
        onBack={handleBack}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Card do Chamado */}
        {service && (
          <View style={styles.serviceCard}>
            <View style={styles.serviceHeaderRow}>
              <View style={styles.iconCircle}>
                <Wrench size={20} color="#2563EB" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.serviceCategory}>{service.category || 'Serviço Prestado'}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <User size={13} color="#64748B" />
                  <Text style={styles.serviceClient}>{service.clientName || 'Cliente'}</Text>
                </View>
              </View>
            </View>

            {service.price ? (
              <View style={styles.priceEstimateRow}>
                <Text style={styles.priceEstimateLabel}>Valor acordado na proposta:</Text>
                <Text style={styles.priceEstimateValue}>
                  R$ {Number(service.price).toFixed(2).replace('.', ',')}
                </Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Card de Fotos da Vistoria de Conclusão (Branch 5) */}
        <View style={styles.inputCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Camera size={18} color="#2563EB" />
              <Text style={styles.cardTitle}>Vistoria do Serviço Finalizado</Text>
            </View>
            <View style={styles.photoCountBadge}>
              <Text style={styles.photoCountBadgeText}>{photos.length}/3 fotos</Text>
            </View>
          </View>
          <Text style={styles.cardSubtitle}>
            Anexe até 3 fotos do serviço pronto como comprovação para o cliente visualizar antes de pagar.
          </Text>

          {/* Grid de fotos anexadas */}
          <View style={styles.photosGrid}>
            {photos.map((uri, index) => (
              <View key={index} style={styles.photoThumbWrapper}>
                <TouchableOpacity
                  onPress={() => {
                    setViewerIndex(index);
                    setViewerVisible(true);
                  }}
                  activeOpacity={0.85}
                >
                  <Image source={{ uri }} style={styles.photoThumbImg} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.photoRemoveBtn}
                  onPress={() => removePhoto(index)}
                  activeOpacity={0.7}
                >
                  <Trash2 size={13} color="#FFFFFF" />
                </TouchableOpacity>
                <View style={styles.photoIndexBadge}>
                  <Text style={styles.photoIndexText}>{index + 1}</Text>
                </View>
              </View>
            ))}

            {photos.length < 3 && (
              <TouchableOpacity
                style={styles.addPhotoCardBtn}
                onPress={pickPhoto}
                disabled={uploadingPhoto}
                activeOpacity={0.75}
              >
                {uploadingPhoto ? (
                  <ActivityIndicator size="small" color="#2563EB" />
                ) : (
                  <>
                    <View style={styles.addPhotoIconCircle}>
                      <Plus size={20} color="#2563EB" />
                    </View>
                    <Text style={styles.addPhotoBtnText}>Adicionar Foto</Text>
                    <Text style={styles.addPhotoBtnSub}>Câmera ou Galeria</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Card do Input de Valor */}
        <View style={styles.inputCard}>
          <Text style={styles.cardTitle}>Valor Final do Serviço</Text>
          <Text style={styles.cardSubtitle}>
            Confirme ou ajuste o valor a ser cobrado do cliente para liberar o pagamento.
          </Text>

          <View style={styles.inputWrapper}>
            <Text style={styles.currencyPrefix}>R$</Text>
            <TextInput
              style={styles.textInput}
              keyboardType="decimal-pad"
              placeholder="0,00"
              placeholderTextColor="#94A3B8"
              value={value}
              onChangeText={setValue}
            />
          </View>

          <View style={styles.hintBox}>
            <AlertCircle size={16} color="#64748B" style={{ marginTop: 2 }} />
            <Text style={styles.hintText}>
              Este valor será cobrado diretamente do cliente na tela de pagamento.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.btnConfirm, saving && styles.btnDisabled]}
            onPress={handleConfirmValue}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <CheckCircle2 size={20} color="#FFFFFF" />
                <Text style={styles.btnConfirmText}>Confirmar Valor e Finalizar</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 1,
  },
  scrollContent: {
    padding: 20,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
    gap: 16,
  },
  serviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
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
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  serviceCategory: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  serviceClient: {
    fontSize: 13,
    color: '#64748B',
  },
  priceEstimateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  priceEstimateLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  priceEstimateValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#15803D',
  },
  inputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2563EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  currencyPrefix: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2563EB',
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    paddingVertical: 14,
  },
  hintBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  hintText: {
    flex: 1,
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
  btnConfirm: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#2563EB',
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
  // ─── Estilos de Fotos e Vistoria (Branch 5) ──────────────────────────
  photoCountBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  photoCountBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
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
    borderColor: '#CBD5E1',
    backgroundColor: '#0F172A',
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
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  addPhotoIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  addPhotoBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  addPhotoBtnSub: {
    fontSize: 9,
    color: '#60A5FA',
    marginTop: 1,
  },
});
