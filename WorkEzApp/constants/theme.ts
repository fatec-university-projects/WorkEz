import { Platform } from 'react-native';

export const AntigravityTheme = {
  colors: {
    primary: '#26FFF5', // Accent cyan
    background: '#FFFFFF',
    backgroundAlt: '#F1F5F9', // slate-100
    backgroundCard: '#FFFFFF',
    text: '#0F172A', // slate-900
    textSecondary: '#94A3B8', // slate-400
    border: '#E2E8F0', // slate-200
    warning: '#FBBF24', // amber-400
    danger: '#EF4444', // red-500
    success: '#10B981', // emerald-500
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  typography: {
    xs: { fontSize: 12, lineHeight: 16 },
    sm: { fontSize: 14, lineHeight: 20 },
    base: { fontSize: 16, lineHeight: 24 },
    lg: { fontSize: 18, lineHeight: 28 },
    xl: { fontSize: 20, lineHeight: 28 },
    fontWeight: {
      normal: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
    }
  }
};

const tintColorLight = '#26FFF5';
const tintColorDark = '#26FFF5';

export const Colors = {
  light: {
    text: AntigravityTheme.colors.text,
    background: AntigravityTheme.colors.background,
    tint: tintColorLight,
    icon: AntigravityTheme.colors.textSecondary,
    tabIconDefault: AntigravityTheme.colors.textSecondary,
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#F8FAFC',
    background: '#0F172A',
    tint: tintColorDark,
    icon: '#94A3B8',
    tabIconDefault: '#94A3B8',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
});
