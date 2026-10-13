import { Platform } from 'react-native';

export const WorkEzTheme = {
  colors: {
    primary: '#2563EB', // Electric Sapphire Blue
    primaryDark: '#1E3A8A', // Deep Royal Blue
    primaryLight: '#EFF6FF', // Soft Ice Blue tint
    accent: '#F59E0B', // Warm Amber Accent for Negotiation & Prices
    accentLight: '#FEF3C7',
    background: '#F8FAFC', // Slate Pearl Neutral Background
    backgroundAlt: '#F1F5F9', // slate-100
    backgroundCard: '#FFFFFF',
    text: '#0F172A', // slate-900
    textSecondary: '#64748B', // slate-500
    textMuted: '#94A3B8', // slate-400
    border: '#E2E8F0', // slate-200
    borderFocus: '#93C5FD',
    warning: '#F59E0B', // amber-500
    danger: '#EF4444', // red-500
    success: '#10B981', // emerald-500
    successLight: '#DCFCE7',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
  },
  borderRadius: {
    sm: 6,
    md: 10,
    lg: 14,
    xl: 18,
    '2xl': 24,
    full: 9999,
  },
  shadows: {
    sm: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 3,
      elevation: 1,
    },
    md: {
      shadowColor: '#1E3A8A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
    },
    lg: {
      shadowColor: '#2563EB',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 20,
      elevation: 6,
    },
  },
  typography: {
    xs: { fontSize: 12, lineHeight: 16 },
    sm: { fontSize: 14, lineHeight: 20 },
    base: { fontSize: 16, lineHeight: 24 },
    lg: { fontSize: 18, lineHeight: 28 },
    xl: { fontSize: 20, lineHeight: 28 },
    '2xl': { fontSize: 24, lineHeight: 32 },
    '3xl': { fontSize: 30, lineHeight: 36 },
    fontWeight: {
      normal: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
      extrabold: '800' as const,
    }
  }
};

const tintColorLight = '#2563EB';
const tintColorDark = '#60A5FA';

export const Colors = {
  light: {
    text: WorkEzTheme.colors.text,
    background: WorkEzTheme.colors.background,
    tint: tintColorLight,
    icon: WorkEzTheme.colors.textSecondary,
    tabIconDefault: WorkEzTheme.colors.textMuted,
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#F8FAFC',
    background: '#0F172A',
    tint: tintColorDark,
    icon: '#94A3B8',
    tabIconDefault: '#64748B',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'System',
    serif: 'Georgia',
    rounded: 'ui-rounded',
    mono: 'Menlo',
  },
  default: {
    sans: 'Roboto, sans-serif',
    serif: 'serif',
    rounded: 'sans-serif-rounded',
    mono: 'monospace',
  },
});
