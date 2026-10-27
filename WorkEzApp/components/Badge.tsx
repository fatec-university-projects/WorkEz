import React, { useMemo } from 'react';
import { Check, Shield, ShieldCheck } from 'lucide-react-native';
import { View, Text, StyleSheet } from 'react-native';
import { WorkEzTheme } from '../constants/theme';
import { useAppTheme } from '../contexts/ThemeContext';

interface BadgeProps {
  variant: 'verified' | 'secure-payment' | 'active-guarantee';
  size?: 'sm' | 'md';
}

export function Badge({ variant, size = 'md' }: BadgeProps) {
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const isSm = size === 'sm';

  const getIcon = () => {
    switch (variant) {
      case 'verified':
        return <Check size={14} color={colors.primary} />;
      case 'secure-payment':
        return <Shield size={14} color={isDark ? '#60A5FA' : '#2563EB'} />;
      case 'active-guarantee':
        return <ShieldCheck size={14} color={colors.primary} />;
    }
  };

  const getLabel = () => {
    switch (variant) {
      case 'verified': return 'Verificado';
      case 'secure-payment': return 'Pagamento seguro';
      case 'active-guarantee': return 'Garantia ativa';
    }
  };

  const isVerifiedOrGuarantee = variant === 'verified' || variant === 'active-guarantee';
  const isSecurePayment = variant === 'secure-payment';

  return (
    <View
      style={[
        styles.badgeContainer,
        isSm ? styles.sizeSm : styles.sizeMd,
        isVerifiedOrGuarantee && styles.bgCyan,
        isSecurePayment && styles.bgBlue,
      ]}
    >
      {getIcon()}
      <Text
        style={[
          styles.badgeText,
          isVerifiedOrGuarantee && styles.textCyan,
          isSecurePayment && styles.textBlue,
        ]}
      >
        {getLabel()}
      </Text>
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    badgeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderRadius: WorkEzTheme.borderRadius.full,
    },
    sizeSm: {
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    sizeMd: {
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    bgCyan: {
      backgroundColor: isDark ? 'rgba(38, 255, 245, 0.16)' : 'rgba(38, 255, 245, 0.1)',
    },
    bgBlue: {
      backgroundColor: isDark ? 'rgba(37, 99, 235, 0.2)' : 'rgba(37, 99, 235, 0.1)',
    },
    badgeText: {
      ...WorkEzTheme.typography.xs,
      fontWeight: WorkEzTheme.typography.fontWeight.medium,
    },
    textCyan: {
      color: colors.primaryText,
    },
    textBlue: {
      color: isDark ? '#60A5FA' : '#2563EB',
    },
  });
