import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { resolveImageUrl } from '../services/api';

interface ImageViewerModalProps {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  title?: string;
  onClose: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function ImageViewerModal({
  visible,
  images,
  initialIndex = 0,
  title,
  onClose,
}: ImageViewerModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setCurrentIndex(Math.max(0, Math.min(initialIndex, images.length - 1)));
      setLoading(true);
    }
  }, [visible, initialIndex, images.length]);

  if (!visible || images.length === 0) return null;

  const currentRawUrl = images[currentIndex];
  const currentUrl = resolveImageUrl(currentRawUrl) || currentRawUrl;

  const handlePrev = () => {
    if (currentIndex > 0) {
      setLoading(true);
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      setLoading(true);
      setCurrentIndex((prev) => prev + 1);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />

        {/* Top Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            {title ? <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text> : null}
            {images.length > 1 && (
              <Text style={styles.counterText}>
                {currentIndex + 1} de {images.length}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.8}
            accessibilityLabel="Fechar visualização"
          >
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Main Image Container */}
        <View style={styles.imageWrapper}>
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
            </View>
          )}

          <Image
            source={{ uri: currentUrl }}
            style={styles.image}
            resizeMode="contain"
            onLoadEnd={() => setLoading(false)}
          />

          {/* Previous Button */}
          {images.length > 1 && currentIndex > 0 && (
            <TouchableOpacity
              style={[styles.navButton, styles.prevButton]}
              onPress={handlePrev}
              activeOpacity={0.8}
              accessibilityLabel="Foto anterior"
            >
              <ChevronLeft size={28} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          {/* Next Button */}
          {images.length > 1 && currentIndex < images.length - 1 && (
            <TouchableOpacity
              style={[styles.navButton, styles.nextButton]}
              onPress={handleNext}
              activeOpacity={0.8}
              accessibilityLabel="Próxima foto"
            >
              <ChevronRight size={28} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Bottom thumbnail strip if multiple images */}
        {images.length > 1 && (
          <View style={styles.footerThumbs}>
            {images.map((img, idx) => {
              const thumbUrl = resolveImageUrl(img) || img;
              const isSelected = idx === currentIndex;
              return (
                <TouchableOpacity
                  key={idx}
                  onPress={() => {
                    setLoading(true);
                    setCurrentIndex(idx);
                  }}
                  activeOpacity={0.8}
                  style={[styles.thumbItem, isSelected && styles.thumbItemSelected]}
                >
                  <Image source={{ uri: thumbUrl }} style={styles.thumbImage} resizeMode="cover" />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 10, 20, 0.96)',
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight || 20) + 12,
    paddingBottom: 12,
    zIndex: 10,
  },
  titleContainer: {
    flex: 1,
    paddingRight: 16,
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '600',
  },
  counterText: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 2,
    fontWeight: '500',
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  loadingContainer: {
    position: 'absolute',
    zIndex: 1,
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.75,
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  prevButton: {
    left: 16,
  },
  nextButton: {
    right: 16,
  },
  footerThumbs: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingTop: 12,
  },
  thumbItem: {
    width: 52,
    height: 52,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    opacity: 0.6,
  },
  thumbItemSelected: {
    borderColor: '#3B82F6',
    opacity: 1,
    transform: [{ scale: 1.08 }],
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
});
