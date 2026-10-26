import React, { useState, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { Button } from '../../components/Button';
import { View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet } from 'react-native';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useAppTheme } from '../../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CancelCall() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const [reason, setReason] = useState('');
  const [otherReason, setOtherReason] = useState('');

  const reasons = [
    'Resolvi de outra forma',
    'Não preciso mais do serviço',
    'Demora para encontrar profissional',
    'Outro motivo',
  ];

  return (
    <View style={styles.container}>
      <ScreenHeader title="Cancelar chamado" showBack />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 150 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Por que você está cancelando?
          </Text>

          <View style={styles.reasonsList}>
            {reasons.map((r) => {
              const isSelected = reason === r;
              return (
                <TouchableOpacity
                  key={r}
                  onPress={() => setReason(r)}
                  style={[
                    styles.reasonButton,
                    isSelected && styles.reasonButtonSelected,
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.reasonText,
                      isSelected && styles.reasonTextSelected,
                    ]}
                  >
                    {r}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {reason === 'Outro motivo' && (
            <TextInput
              value={otherReason}
              onChangeText={setOtherReason}
              placeholder="Conte-nos o motivo..."
              placeholderTextColor={colors.textMuted}
              multiline={true}
              numberOfLines={3}
              textAlignVertical="top"
              style={styles.otherInput}
            />
          )}
        </View>

        <View style={styles.dangerBanner}>
          <Text style={styles.dangerBannerText}>
            <Text style={{ fontWeight: '700' }}>Atenção:</Text> Cancelamentos frequentes podem afetar sua conta.
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
          disabled={!reason}
        >
          Confirmar cancelamento
        </Button>
        <Button variant="secondary" fullWidth onPress={() => router.back()}>
          Voltar
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
    card: {
      backgroundColor: colors.backgroundCard,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 14,
    },
    reasonsList: {
      gap: 10,
    },
    reasonButton: {
      width: '100%',
      padding: 14,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.backgroundAlt,
    },
    reasonButtonSelected: {
      borderColor: '#2563EB',
      backgroundColor: isDark ? 'rgba(37, 99, 235, 0.18)' : 'rgba(37, 99, 235, 0.08)',
    },
    reasonText: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '500',
    },
    reasonTextSelected: {
      color: isDark ? '#60A5FA' : '#2563EB',
      fontWeight: '600',
    },
    otherInput: {
      minHeight: 88,
      marginTop: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: colors.backgroundAlt,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      color: colors.text,
      fontSize: 14,
    },
    dangerBanner: {
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(248, 113, 113, 0.35)' : '#FECACA',
      borderRadius: 12,
      padding: 14,
    },
    dangerBannerText: {
      fontSize: 13,
      color: isDark ? '#FCA5A5' : '#991B1B',
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
      gap: 10,
    },
  });
