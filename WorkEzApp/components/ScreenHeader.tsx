import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { WorkEzTheme } from '../constants/theme';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightElement?: React.ReactNode;
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
  style,
  titleStyle,
  subtitleStyle,
  children,
}: ScreenHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

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
    <View style={[styles.header, { paddingTop }, style]}>
      <View style={styles.headerRow}>
        {showBack && (
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Voltar"
          >
            <ArrowLeft size={22} color={WorkEzTheme.colors.text} />
          </TouchableOpacity>
        )}
        <View style={styles.titleContainer}>
          <Text style={[styles.title, titleStyle]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, subtitleStyle]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {rightElement ? <View style={styles.rightContainer}>{rightElement}</View> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: WorkEzTheme.header.container.backgroundColor,
    borderBottomWidth: WorkEzTheme.header.container.borderBottomWidth,
    borderBottomColor: WorkEzTheme.header.container.borderBottomColor,
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
    backgroundColor: WorkEzTheme.header.backButton.backgroundColor,
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
    color: WorkEzTheme.header.title.color,
    letterSpacing: WorkEzTheme.header.title.letterSpacing,
  },
  subtitle: {
    fontSize: WorkEzTheme.header.subtitle.fontSize,
    lineHeight: WorkEzTheme.header.subtitle.lineHeight,
    fontWeight: WorkEzTheme.header.subtitle.fontWeight,
    color: WorkEzTheme.header.subtitle.color,
    marginTop: WorkEzTheme.header.subtitle.marginTop,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
