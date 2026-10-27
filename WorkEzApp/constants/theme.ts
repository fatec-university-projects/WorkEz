import { Platform } from 'react-native';

export const LightColors = {
  primary: '#26FFF5', // Accent cyan (para fundos, badges, detalhes visuais)
  primaryText: '#0F766E', // Versão com alto contraste para textos e lances
  primaryDark: '#1E3A8A', // Deep Royal Blue
  primaryLight: '#EFF6FF', // Soft Ice Blue tint
  accent: '#F59E0B', // Warm Amber Accent for Negotiation & Prices
  accentLight: '#FEF3C7',
  background: '#FFFFFF',
  backgroundAlt: '#F1F5F9', // slate-100
  backgroundCard: '#FFFFFF',
  card: '#FFFFFF',
  surface: '#F8FAFC',
  secondary: '#16A34A',
  text: '#0F172A', // slate-900
  textSecondary: '#64748B', // slate-500
  textMuted: '#94A3B8', // slate-400
  border: '#E2E8F0', // slate-200
  borderFocus: '#93C5FD',
  warning: '#F59E0B', // amber-500
  danger: '#EF4444', // red-500
  success: '#10B981', // emerald-500
  successLight: '#DCFCE7',
};

export const DarkColors: typeof LightColors = {
  primary: '#26FFF5',
  primaryText: '#2DD4BF',
  primaryDark: '#60A5FA',
  primaryLight: '#1E293B',
  accent: '#FBBF24',
  accentLight: '#3B2F13',
  background: '#0B1120', // Deep Midnight Slate
  backgroundAlt: '#090E1A', // Abyssal Slate Canvas
  backgroundCard: '#131C31', // Elevated Navy-Slate Surface
  card: '#131C31',
  surface: '#1E293B',
  secondary: '#34D399',
  text: '#F8FAFC', // slate-50
  textSecondary: '#94A3B8', // slate-400
  textMuted: '#64748B', // slate-500
  border: '#1E293B', // slate-800
  borderFocus: '#3B82F6',
  warning: '#FBBF24',
  danger: '#F87171',
  success: '#34D399',
  successLight: '#064E3B',
};

export const WorkEzTheme = {
  colors: { ...LightColors },
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
  },
  header: {
    container: {
      backgroundColor: '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: '#E2E8F0',
      paddingHorizontal: 20,
      paddingBottom: 14,
    },
    title: {
      fontSize: 20,
      lineHeight: 28,
      fontWeight: '700' as const,
      color: '#0F172A',
      letterSpacing: -0.3,
    },
    subtitle: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '400' as const,
      color: '#64748B',
      marginTop: 2,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: '#F1F5F9',
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
  }
};

export function applyWorkEzThemePalette(isDark: boolean) {
  const palette = isDark ? DarkColors : LightColors;
  Object.assign(WorkEzTheme.colors, palette);
  WorkEzTheme.header.container.backgroundColor = palette.backgroundCard;
  WorkEzTheme.header.container.borderBottomColor = palette.border;
  WorkEzTheme.header.title.color = palette.text;
  WorkEzTheme.header.subtitle.color = palette.textSecondary;
  WorkEzTheme.header.backButton.backgroundColor = palette.backgroundAlt;
}

const tintColorLight = '#2563EB';
const tintColorDark = '#60A5FA';

export const Colors = {
  light: {
    text: LightColors.text,
    background: LightColors.background,
    tint: tintColorLight,
    icon: LightColors.textSecondary,
    tabIconDefault: LightColors.textMuted,
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: DarkColors.text,
    background: DarkColors.background,
    tint: tintColorDark,
    icon: DarkColors.textSecondary,
    tabIconDefault: DarkColors.textMuted,
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
