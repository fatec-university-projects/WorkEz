import { useState, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  ArrowLeft, Plus, Trash2, Image as ImageIcon,
  Camera, Upload, X
} from 'lucide-react-native';
import {
  View, Text, TouchableOpacity, Image, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Modal, Dimensions, Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { WorkEzTheme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useAppTheme } from '../../contexts/ThemeContext';
import { apiRequest } from '../../services/api';
import { imageService } from '../../services/imageService';
import { ScreenHeader } from '../../components/ScreenHeader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMG_SIZE = (SCREEN_WIDTH - 48 - 12) / 2; // 2 cols, padding + gap

export default function Portfolio() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, isDark } = useAppTheme();

  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null);

  // ─── Fetch portfolio ────────────────────────────────────────────────────────

  const fetchPortfolio = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    const result = await apiRequest<string[]>(`/api/ServiceProviders/${user.id}/portfolio`);
    if (result.status === 404 || (result.data && result.data.length === 0)) {
      setImages([]);
    } else if (result.error && result.status !== 404) {
      setError(result.error);
    } else {
      setImages(result.data ?? []);
    }
    setLoading(false);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchPortfolio();
    }, [fetchPortfolio])
  );

  // ─── Upload ─────────────────────────────────────────────────────────────────

  const handleAddImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso às suas fotos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
      base64: true,
    });

    if (result.canceled || !result.assets?.[0]?.uri) return;

    setUploading(true);
    try {
      const asset = result.assets[0];
      const imageUrl = await imageService.uploadImage(asset.uri, asset.base64);

      const apiResult = await apiRequest<string[]>(
        `/api/ServiceProviders/${user!.id}/portfolio`,
        { method: 'POST', body: JSON.stringify({ imageUrl }) }
      );

      if (apiResult.error) {
        Alert.alert('Erro', apiResult.error);
      } else {
        setImages(apiResult.data ?? []);
      }
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Não foi possível enviar a imagem.');
    } finally {
      setUploading(false);
    }
  };

  // ─── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = (imageUrl: string) => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Tem certeza que deseja remover esta imagem do portfólio?')) {
        confirmDelete(imageUrl);
      }
      return;
    }

    Alert.alert(
      'Remover imagem',
      'Tem certeza que deseja remover esta imagem do portfólio?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover', style: 'destructive',
          onPress: () => confirmDelete(imageUrl)
        }
      ]
    );
  };

  const confirmDelete = async (imageUrl: string) => {
    setDeletingUrl(imageUrl);
    setSelectedImage(null);
    try {
      const result = await apiRequest<string[]>(
        `/api/ServiceProviders/${user!.id}/portfolio`,
        { method: 'DELETE', body: JSON.stringify({ imageUrl }) }
      );
      if (result.error) {
        Alert.alert('Erro', result.error);
      } else {
        setImages(result.data ?? []);
      }
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Não foi possível remover a imagem.');
    } finally {
      setDeletingUrl(null);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundAlt }]}>
      <ScreenHeader
        title="Portfólio"
        subtitle={`${images.length} ${images.length === 1 ? 'trabalho' : 'trabalhos'}`}
        showBack
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Upload Button */}
        <TouchableOpacity
          style={[styles.uploadCard, { backgroundColor: colors.backgroundCard, borderColor: colors.primary }, uploading && styles.uploadCardDisabled]}
          onPress={handleAddImage}
          activeOpacity={0.85}
          disabled={uploading}
        >
          {uploading ? (
            <View style={styles.uploadCardInner}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.uploadCardText, { color: colors.textSecondary }]}>Enviando imagem...</Text>
            </View>
          ) : (
            <View style={styles.uploadCardInner}>
              <View style={[styles.uploadIconBg, { backgroundColor: isDark ? 'rgba(37,99,235,0.18)' : '#EFF6FF' }]}>
                <Plus size={22} color={colors.primaryText} />
              </View>
              <View>
                <Text style={[styles.uploadCardTitle, { color: colors.primaryText }]}>Adicionar trabalho</Text>
                <Text style={[styles.uploadCardHint, { color: colors.textSecondary }]}>Toque para selecionar da galeria</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* Content */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Carregando portfólio...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <ImageIcon size={48} color={colors.textSecondary} />
            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
            <TouchableOpacity onPress={fetchPortfolio} style={[styles.retryBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.retryBtnText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : images.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconBg, { backgroundColor: colors.backgroundCard }]}>
              <Camera size={40} color={colors.textSecondary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Portfólio vazio</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Adicione fotos dos seus melhores trabalhos para atrair mais clientes.
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {images.map((img, i) => (
              <TouchableOpacity
                key={`${img}-${i}`}
                style={[styles.imgWrapper, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
                onPress={() => setSelectedImage(img)}
                activeOpacity={0.9}
              >
                <Image source={{ uri: img }} style={styles.image} />
                {deletingUrl === img && (
                  <View style={styles.deletingOverlay}>
                    <ActivityIndicator color="#FFF" />
                  </View>
                )}
                <View style={styles.imgOverlay}>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(img)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Trash2 size={16} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Image Preview Modal */}
      <Modal
        visible={!!selectedImage}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalClose}
            onPress={() => setSelectedImage(null)}
          >
            <X size={24} color="#FFF" />
          </TouchableOpacity>
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          )}
          {selectedImage && (
            <TouchableOpacity
              style={styles.modalDeleteBtn}
              onPress={() => handleDelete(selectedImage)}
            >
              <Trash2 size={18} color="#FFF" />
              <Text style={styles.modalDeleteText}>Remover do portfólio</Text>
            </TouchableOpacity>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: WorkEzTheme.spacing.lg,
    gap: 16,
  },
  uploadCard: {
    borderRadius: WorkEzTheme.borderRadius['2xl'],
    borderWidth: 1.5,
    borderStyle: 'dashed',
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  uploadCardDisabled: {
    opacity: 0.7,
  },
  uploadCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  uploadIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadCardTitle: {
    ...WorkEzTheme.typography.base,
    fontWeight: WorkEzTheme.typography.fontWeight.semibold,
  },
  uploadCardHint: {
    ...WorkEzTheme.typography.xs,
    marginTop: 2,
  },
  uploadCardText: {
    ...WorkEzTheme.typography.sm,
    marginLeft: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  imgWrapper: {
    width: IMG_SIZE,
    height: IMG_SIZE,
    borderRadius: WorkEzTheme.borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  deletingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imgOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(239,68,68,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    ...WorkEzTheme.typography.lg,
    fontWeight: WorkEzTheme.typography.fontWeight.semibold,
  },
  emptySubtitle: {
    ...WorkEzTheme.typography.sm,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  centerContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    ...WorkEzTheme.typography.sm,
  },
  errorText: {
    ...WorkEzTheme.typography.sm,
    textAlign: 'center',
    marginTop: 8,
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: WorkEzTheme.borderRadius.lg,
  },
  retryBtnText: {
    ...WorkEzTheme.typography.sm,
    color: '#FFF',
    fontWeight: WorkEzTheme.typography.fontWeight.semibold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalClose: {
    position: 'absolute',
    top: 52,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  modalImage: {
    width: '100%',
    height: '80%',
    resizeMode: 'contain',
    borderRadius: WorkEzTheme.borderRadius.xl,
  },
  modalDeleteBtn: {
    position: 'absolute',
    bottom: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239,68,68,0.9)',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: WorkEzTheme.borderRadius.full,
  },
  modalDeleteText: {
    ...WorkEzTheme.typography.sm,
    fontWeight: WorkEzTheme.typography.fontWeight.semibold,
    color: '#FFF',
  },
});
