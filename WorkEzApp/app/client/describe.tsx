import { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Camera, MapPin } from 'lucide-react-native';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import {
  View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView,
  ActivityIndicator, Image, Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WorkEzTheme } from '../../constants/theme';
import { API_BASE_URL, apiRequest } from '../../services/api';
import { imageService } from '../../services/imageService';

export default function DescribeService() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { category, categoryId } = useLocalSearchParams<{ category: string; categoryId: string }>();
  const categoryName = category || 'Encanador';
  const defaultCategoryId = '11111111-1111-1111-1111-111111111111'; // Encanador Guid
  const selectedCategoryId = categoryId || defaultCategoryId;

  const [description, setDescription] = useState('');
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [cepLoading, setCepLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // Consulta CEP na API ViaCEP
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
          setStreet(json.logradouro || '');
          setNeighborhood(json.bairro || '');
          setCity(json.localidade || '');
          setState(json.uf || '');
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

  // Seleciona e envia imagem para o ImgBB
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
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const selectedUri = result.assets[0].uri;
      setUploading(true);

      try {
        const imageUrl = await imageService.uploadImage(selectedUri);
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.8}
          >
            <ArrowLeft size={24} color={WorkEzTheme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            Descreva o serviço
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Categoria */}
        <View style={styles.section}>
          <Text style={styles.label}>Categoria Selecionada</Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{categoryName}</Text>
          </View>
        </View>

        {/* Descrição */}
        <View style={styles.section}>
          <Text style={styles.label}>O que você precisa?</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Descreva detalhadamente o problema ou serviço que precisa..."
            multiline={true}
            numberOfLines={4}
            textAlignVertical="top"
            style={styles.textInput}
            placeholderTextColor="#94A3B8"
          />
        </View>

        {/* Fotos */}
        <View style={styles.section}>
          <Text style={styles.label}>Adicionar fotos (opcional)</Text>
          <TouchableOpacity
            onPress={pickImage}
            disabled={uploading}
            style={styles.photoUploadBtn}
            activeOpacity={0.8}
          >
            {uploading ? (
              <ActivityIndicator color={WorkEzTheme.colors.primary} />
            ) : (
              <>
                <Camera size={32} color="#64748B" />
                <Text style={styles.photoUploadText}>Toque para adicionar fotos</Text>
              </>
            )}
          </TouchableOpacity>

          {images.length > 0 && (
            <View style={styles.imagesGrid}>
              {images.map((imgUrl, idx) => (
                <View key={idx} style={styles.imageWrapper}>
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

        {/* CEP e Endereço */}
        <View style={styles.section}>
          <Text style={styles.label}>CEP do serviço</Text>
          <Input
            value={cep}
            onChangeText={handleCepChange}
            placeholder="Digite o CEP (Ex: 09441-550)"
            keyboardType="numeric"
            maxLength={9}
          />
          {cepLoading && (
            <ActivityIndicator size="small" color={WorkEzTheme.colors.primary} style={{ marginTop: 8, alignSelf: 'flex-start' }} />
          )}
        </View>

        {street ? (
          <View style={[styles.section, { backgroundColor: '#EFF6FF', padding: 16, borderRadius: 12, gap: 4 }]}>
            <Text style={[styles.label, { color: '#1D4ED8' }]}>Endereço encontrado:</Text>
            <Text style={{ fontSize: 16, color: '#0F172A', fontWeight: '500' }}>
              {street}, {neighborhood}
            </Text>
            <Text style={{ fontSize: 14, color: '#64748B' }}>
              {city}/{state}
            </Text>
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={[styles.section, { flex: 1 }]}>
            <Text style={styles.label}>Número</Text>
            <Input
              value={number}
              onChangeText={setNumber}
              placeholder="Ex: 123"
              keyboardType="numeric"
            />
          </View>

          <View style={[styles.section, { flex: 2 }]}>
            <Text style={styles.label}>Complemento</Text>
            <Input
              value={complement}
              onChangeText={setComplement}
              placeholder="Ex: Apto 4"
            />
          </View>
        </View>

        <View style={styles.dicaBanner}>
          <Text style={styles.dicaText}>
            💡 <Text style={styles.dicaBold}>Dica:</Text> Quanto mais detalhes você fornecer, mais rápido o profissional poderá entender e resolver seu problema.
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
        <Button
          fullWidth
          onPress={() => router.push({
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
              images: JSON.stringify(images)
            }
          } as any)}
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
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  headerTitle: {
    ...WorkEzTheme.typography.lg,
    fontWeight: WorkEzTheme.typography.fontWeight.semibold,
    color: '#0F172A',
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
    ...WorkEzTheme.typography.sm,
    fontWeight: WorkEzTheme.typography.fontWeight.medium,
    color: '#0F172A',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  categoryBadgeText: {
    ...WorkEzTheme.typography.sm,
    fontWeight: WorkEzTheme.typography.fontWeight.medium,
    color: '#1D4ED8',
  },
  textInput: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    fontSize: 16,
    color: '#0F172A',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  photoUploadBtn: {
    width: '100%',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  photoUploadText: {
    ...WorkEzTheme.typography.sm,
    color: '#64748B',
  },
  inputContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
    zIndex: 1,
  },
  inputWithIcon: {
    paddingLeft: 48,
  },
  dicaBanner: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 16,
  },
  dicaText: {
    ...WorkEzTheme.typography.sm,
    color: '#1D4ED8',
    lineHeight: 20,
  },
  dicaBold: {
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
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
    borderColor: '#E2E8F0',
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
});
