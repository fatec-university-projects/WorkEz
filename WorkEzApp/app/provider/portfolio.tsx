import { useState, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  ArrowLeft, Plus, Trash2, Image as ImageIcon,
  Camera, Upload, X
} from 'lucide-react-native';
import {
  View, Text, TouchableOpacity, Image, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Modal, Dimensions
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { WorkEzTheme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { apiRequest } from '../../services/api';
import { imageService } from '../../services/imageService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMG_SIZE = (SCREEN_WIDTH - 48 - 12) / 2; // 2 cols, padding + gap

export default function Portfolio() {
  const router = useRouter();
  const { user } = useAuth();

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
    });

    if (result.canceled || !result.assets?.[0]?.uri) return;

    setUploading(true);
    try {
      const imageUrl = await imageService.uploadImage(result.assets[0].uri);

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

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.8}
          >
            <ArrowLeft size={22} color={WorkEzTheme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTextBlock}>
            <Text style={styles.headerTitle}>Portfólio</Text>
            <Text style={styles.headerSub}>{images.length} {images.length === 1 ? 'trabalho' : 'trabalhos'}</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Upload Button */}
        <TouchableOpacity
          style={[styles.uploadCard, uploading && styles.uploadCardDisabled]}
          onPress={handleAddImage}
          activeOpacity={0.85}
          disabled={uploading}
        >
          {uploading ? (
            <View style={styles.uploadCardInner}>
              <ActivityIndicator size="small" color={WorkEzTheme.colors.primary} />
              <Text style={styles.uploadCardText}>Enviando imagem...</Text>
            </View>
          ) : (
            <View style={styles.uploadCardInner}>
              <View style={styles.uploadIconBg}>
                <Plus size={22} color={WorkEzTheme.colors.primary} />
              </View>
              <View>
                <Text style={styles.uploadCardTitle}>Adicionar trabalho</Text>
                <Text style={styles.uploadCardHint}>Toque para selecionar da galeria</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* Content */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={WorkEzTheme.colors.primary} />
            <Text style={styles.loadingText}>Carregando portfólio...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <ImageIcon size={48} color={WorkEzTheme.colors.textSecondary} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={fetchPortfolio} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : images.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBg}>
              <Camera size={40} color={WorkEzTheme.colors.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>Portfólio vazio</Text>
            <Text style={styles.emptySubtitle}>
              Adicione fotos dos seus melhores trabalhos para atrair mais clientes.
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {images.map((img, i) => (
              <TouchableOpacity
                key={`${img}-${i}`}
                style={styles.imgWrapper}
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
              activeOpacity={0.85}
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
    backgroundColor: WorkEzTheme.colors.backgroundAlt,
  },

  // ── Header ──────────────────────────────────────────────────
  header: {
    backgroundColor: WorkEzTheme.colors.backgroundCard,
    paddingHorizontal: WorkEzTheme.spacing.lg,
    paddingTop: WorkEzTheme.spacing.lg,
    paddingBottom: WorkEzTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: WorkEzTheme.colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 8,
    backgroundColor: WorkEzTheme.colors.backgroundAlt,
    borderRadius: WorkEzTheme.borderRadius.lg,
  },
  headerTextBlock: {
    flex: 1,
  },
  headerTitle: {
    ...WorkEzTheme.typography.xl,
    fontWeight: WorkEzTheme.typography.fontWeight.bold,
    color: WorkEzTheme.colors.text,
  },
  headerSub: {
    ...WorkEzTheme.typography.xs,
    color: WorkEzTheme.colors.textSecondary,
    marginTop: 1,
  },

  // ── Content ─────────────────────────────────────────────────
  content: {
    padding: WorkEzTheme.spacing.lg,
    gap: 16,
  },

  // ── Upload Card ─────────────────────────────────────────────
  uploadCard: {
    backgroundColor: WorkEzTheme.colors.backgroundCard,
    borderRadius: WorkEzTheme.borderRadius['2xl'],
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: WorkEzTheme.colors.primary,
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
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadCardTitle: {
    ...WorkEzTheme.typography.base,
    fontWeight: WorkEzTheme.typography.fontWeight.semibold,
    color: '#0F766E',
  },
  uploadCardHint: {
    ...WorkEzTheme.typography.xs,
    color: WorkEzTheme.colors.textSecondary,
    marginTop: 2,
  },
  uploadCardText: {
    ...WorkEzTheme.typography.sm,
    color: WorkEzTheme.colors.textSecondary,
    marginLeft: 8,
  },

  // ── Grid ────────────────────────────────────────────────────
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
    backgroundColor: '#E2E8F0',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  deletingOverlay: {
    ...StyleSheet.absoluteFillObject,
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

  // ── Empty State ─────────────────────────────────────────────
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    ...WorkEzTheme.typography.lg,
    fontWeight: WorkEzTheme.typography.fontWeight.semibold,
    color: WorkEzTheme.colors.text,
  },
  emptySubtitle: {
    ...WorkEzTheme.typography.sm,
    color: WorkEzTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },

  // ── Loading / Error ─────────────────────────────────────────
  centerContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    ...WorkEzTheme.typography.sm,
    color: WorkEzTheme.colors.textSecondary,
  },
  errorText: {
    ...WorkEzTheme.typography.sm,
    color: WorkEzTheme.colors.danger,
    textAlign: 'center',
    marginTop: 8,
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: WorkEzTheme.colors.primary,
    borderRadius: WorkEzTheme.borderRadius.lg,
  },
  retryBtnText: {
    ...WorkEzTheme.typography.sm,
    color: '#FFF',
    fontWeight: WorkEzTheme.typography.fontWeight.semibold,
  },

  // ── Modal ────────────────────────────────────────────────────
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
    width: SCREEN_WIDTH - 40,
    height: SCREEN_WIDTH - 40,
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
