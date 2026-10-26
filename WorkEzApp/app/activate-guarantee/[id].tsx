import React, { useState, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { Camera, AlertTriangle } from 'lucide-react-native';
import { Button } from '../../components/Button';
import { View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet } from 'react-native';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useAppTheme } from '../../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ActivateGuarantee() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const [description, setDescription] = useState('');

  return (
    <View style={styles.container}>
      <ScreenHeader title="Acionar garantia" showBack />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 96 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.warningCard}>
          <View style={styles.warningRow}>
            <AlertTriangle
              size={22}
              color={isDark ? '#FBBF24' : '#854D0E'}
              style={{ marginTop: 2 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.warningTitle}>
                Garantia da plataforma
              </Text>
              <Text style={styles.warningText}>
                Descreva o problema e nossa equipe fará a mediação entre você e o profissional.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Descreva o problema
          </Text>

          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Explique detalhadamente o que aconteceu..."
            placeholderTextColor={colors.textMuted}
            multiline={true}
            numberOfLines={6}
            textAlignVertical="top"
            style={styles.textArea}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Adicionar fotos (opcional)
          </Text>
          <TouchableOpacity style={styles.uploadBox} activeOpacity={0.7}>
            <Camera size={32} color={colors.textSecondary} />
            <Text style={styles.uploadText}>
              Toque para adicionar fotos do problema
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerText}>
            Nossa equipe analisará seu caso em até 24 horas e entrará em contato.
          </Text>
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
        <Button
          fullWidth
          onPress={() => router.push('/client')}
          disabled={!description.trim()}
        >
          Enviar solicitação
        </Button>
      </View>
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: 20,
      gap: 16,
      maxWidth: 720,
      width: '100%',
      alignSelf: 'center',
    },
    warningCard: {
      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.14)' : '#FEF3C7',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(251, 191, 36, 0.35)' : '#FDE047',
      borderRadius: 14,
      padding: 18,
    },
    warningRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    warningTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: isDark ? '#FDE68A' : '#854D0E',
      marginBottom: 4,
    },
    warningText: {
      fontSize: 13,
      color: isDark ? '#FCD34D' : '#92400E',
      lineHeight: 19,
    },
    card: {
      backgroundColor: colors.backgroundCard,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    textArea: {
      minHeight: 120,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: colors.backgroundAlt,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      color: colors.text,
      fontSize: 14,
    },
    uploadBox: {
      width: '100%',
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: colors.border,
      borderRadius: 12,
      padding: 28,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.backgroundAlt,
    },
    uploadText: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    infoBanner: {
      backgroundColor: isDark ? 'rgba(37, 99, 235, 0.16)' : '#EFF6FF',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(59, 130, 246, 0.35)' : '#BFDBFE',
      borderRadius: 12,
      padding: 14,
    },
    infoBannerText: {
      fontSize: 13,
      color: isDark ? '#93C5FD' : '#1D4ED8',
      lineHeight: 19,
    },
    footer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.backgroundCard,
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
  });
