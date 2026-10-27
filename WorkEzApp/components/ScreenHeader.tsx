import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Moon, Sun } from 'lucide-react-native';
import { WorkEzTheme } from '../constants/theme';
import { useAppTheme } from '../contexts/ThemeContext';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightElement?: React.ReactNode;
  showThemeToggle?: boolean;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  subtitleStyle?: StyleProp<TextStyle>;
  children?: React.ReactNode;
}

export function ScreenHeader({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightElement,
  showThemeToggle = false,
  style,
  titleStyle,
  subtitleStyle,
  children,
}: ScreenHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark, colors, toggleTheme } = useAppTheme();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    }
  };

  // Garante espaço seguro para o notch/ilha dinâmica em qualquer dispositivo
  const paddingTop = insets.top > 0 ? insets.top + 8 : 16;

  return (
    <View
      style={[
        styles.header,
        {
          paddingTop,
          backgroundColor: colors.backgroundCard,
          borderBottomColor: colors.border,
        },
        style,
      ]}
    >
      <View style={styles.headerRow}>
        {showBack && (
          <TouchableOpacity
            onPress={handleBack}
            style={[styles.backButton, { backgroundColor: colors.backgroundAlt }]}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Voltar"
          >
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
        )}
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: colors.text }, titleStyle]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: colors.textSecondary }, subtitleStyle]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.rightContainer}>
          {rightElement}
          {showThemeToggle && (
            <TouchableOpacity
              onPress={toggleTheme}
              activeOpacity={0.75}
              style={[
                styles.themeButton,
                {
                  backgroundColor: isDark ? 'rgba(59, 130, 246, 0.16)' : '#F1F5F9',
                  borderColor: colors.border,
                },
              ]}
              accessibilityLabel={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
            >
              {isDark ? (
                <Sun size={18} color="#FBBF24" />
              ) : (
                <Moon size={18} color="#334155" />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    borderBottomWidth: WorkEzTheme.header.container.borderBottomWidth,
    paddingHorizontal: WorkEzTheme.header.container.paddingHorizontal,
    paddingBottom: WorkEzTheme.header.container.paddingBottom,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: WorkEzTheme.header.backButton.width,
    height: WorkEzTheme.header.backButton.height,
    borderRadius: WorkEzTheme.header.backButton.borderRadius,
    alignItems: WorkEzTheme.header.backButton.alignItems,
    justifyContent: WorkEzTheme.header.backButton.justifyContent,
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: WorkEzTheme.header.title.fontSize,
    lineHeight: WorkEzTheme.header.title.lineHeight,
    fontWeight: WorkEzTheme.header.title.fontWeight,
    letterSpacing: WorkEzTheme.header.title.letterSpacing,
  },
  subtitle: {
    fontSize: WorkEzTheme.header.subtitle.fontSize,
    lineHeight: WorkEzTheme.header.subtitle.lineHeight,
    fontWeight: WorkEzTheme.header.subtitle.fontWeight,
    marginTop: WorkEzTheme.header.subtitle.marginTop,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  themeButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
