import React, { useMemo } from 'react';
import { Check } from 'lucide-react-native';
import { Logo } from '../components/Logo';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { ScreenHeader } from '../components/ScreenHeader';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useAppTheme } from '../contexts/ThemeContext';

export default function ColorPalette() {
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const swatches = [
    {
      name: 'Azul Principal',
      hex: '#2563EB',
      use: 'Botões primários, ações principais',
    },
    {
      name: 'Turquesa/Ciano',
      hex: '#26FFF5',
      use: 'Verificação, sucesso, status online',
    },
    {
      name: 'Azul Escuro',
      hex: '#0F172A',
      use: 'Textos principais, títulos',
      border: isDark,
    },
    {
      name: 'Fundo Claro',
      hex: '#F8FAFC',
      use: 'Backgrounds, cards',
      border: true,
    },
    {
      name: 'Texto Secundário',
      hex: '#94A3B8',
      use: 'Textos secundários, placeholders',
    },
  ];

  return (
    <View style={styles.container}>
      <ScreenHeader title="Paleta de Cores" subtitle="WorkEz Design System" showBack />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.contentWrap}>
          {/* Logo Section */}
          <View style={[styles.card, { alignItems: 'center', padding: 28 }]}>
            <Logo size="xl" />
            <Text style={styles.brandTitle}>WorkEz</Text>
            <Text style={styles.brandSubtitle}>
              Serviços profissionais, quando você precisar.
            </Text>
          </View>

          {/* Color Swatches */}
          <View style={{ gap: 12 }}>
            {swatches.map((swatch) => (
              <View key={swatch.hex} style={styles.swatchCard}>
                <View style={styles.swatchRow}>
                  <View
                    style={[
                      styles.swatchBox,
                      { backgroundColor: swatch.hex },
                      swatch.border && { borderWidth: 2, borderColor: colors.border },
                    ]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.swatchName}>{swatch.name}</Text>
                    <Text style={styles.swatchHex}>{swatch.hex}</Text>
                    <Text style={styles.swatchUse}>{swatch.use}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* Components Demo */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Componentes</Text>

            <View style={{ gap: 16 }}>
              <View>
                <Text style={styles.subLabel}>Badges</Text>
                <View style={styles.rowWrap}>
                  <Badge variant="verified" />
                  <Badge variant="secure-payment" />
                  <Badge variant="active-guarantee" />
                </View>
              </View>

              <View>
                <Text style={styles.subLabel}>Botões</Text>
                <View style={styles.rowWrap}>
                  <Button>Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="ghost">Ghost</Button>
                </View>
              </View>

              <View>
                <Text style={styles.subLabel}>Status</Text>
                <View style={{ gap: 8 }}>
                  <View style={styles.statusRow}>
                    <View style={[styles.statusDot, { backgroundColor: '#26FFF5' }]} />
                    <Text style={[styles.statusText, { color: colors.primaryText }]}>
                      Online / Verificado
                    </Text>
                  </View>
                  <View style={styles.statusRow}>
                    <View style={[styles.statusDot, { backgroundColor: '#2563EB' }]} />
                    <Text style={[styles.statusText, { color: isDark ? '#60A5FA' : '#2563EB' }]}>
                      Em andamento
                    </Text>
                  </View>
                  <View style={styles.statusRow}>
                    <View style={[styles.statusDot, { backgroundColor: '#FBBF24' }]} />
                    <Text style={[styles.statusText, { color: '#FBBF24' }]}>
                      Aguardando
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Gradient Examples */}
          <View style={{ gap: 12 }}>
            <View style={[styles.gradientCard, { backgroundColor: '#2563EB' }]}>
              <Text style={styles.gradientTitle}>Gradiente Azul</Text>
              <Text style={styles.gradientSubtitle}>Splash Screen</Text>
            </View>

            <View style={[styles.gradientCard, { backgroundColor: '#0F766E' }]}>
              <Text style={styles.gradientTitle}>Gradiente Turquesa</Text>
              <Text style={styles.gradientSubtitle}>Status Online do Prestador</Text>
            </View>
          </View>

          {/* Success Message */}
          <View style={styles.successBanner}>
            <View style={styles.successRow}>
              <View style={styles.successIconCircle}>
                <Check size={14} color="#0F172A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.successTitle}>
                  Paleta Atualizada com Sucesso
                </Text>
                <Text style={styles.successDesc}>
                  WorkEz agora usa turquesa (#26FFF5) para transmitir confiança e modernidade.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
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
      paddingBottom: 40,
    },
    contentWrap: {
      gap: 20,
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
    brandTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
      marginTop: 14,
      marginBottom: 6,
    },
    brandSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    swatchCard: {
      backgroundColor: colors.backgroundCard,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    swatchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    swatchBox: {
      width: 72,
      height: 72,
      borderRadius: 12,
    },
    swatchName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    swatchHex: {
      fontSize: 13,
      fontWeight: '600',
      color: isDark ? '#60A5FA' : '#2563EB',
      marginTop: 4,
    },
    swatchUse: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 4,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 14,
    },
    subLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    rowWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    statusDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    statusText: {
      fontSize: 14,
      fontWeight: '500',
    },
    gradientCard: {
      borderRadius: 16,
      padding: 22,
      alignItems: 'center',
    },
    gradientTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
      marginBottom: 4,
    },
    gradientSubtitle: {
      fontSize: 13,
      color: 'rgba(255, 255, 255, 0.85)',
    },
    successBanner: {
      backgroundColor: isDark ? 'rgba(38, 255, 245, 0.12)' : 'rgba(38, 255, 245, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(38, 255, 245, 0.35)',
      borderRadius: 14,
      padding: 16,
    },
    successRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    successIconCircle: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#26FFF5',
      alignItems: 'center',
      justifyContent: 'center',
    },
    successTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    successDesc: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
  });
