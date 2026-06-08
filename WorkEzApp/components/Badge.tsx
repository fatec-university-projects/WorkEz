import { Check, Shield, ShieldCheck } from 'lucide-react-native';
import { View, Text, StyleSheet } from 'react-native';
import { AntigravityTheme } from '../constants/theme';

interface BadgeProps {
  variant: 'verified' | 'secure-payment' | 'active-guarantee';
  size?: 'sm' | 'md';
}

export function Badge({ variant, size = 'md' }: BadgeProps) {
  const isSm = size === 'sm';

  const getIcon = () => {
    switch (variant) {
      case 'verified':
        return <Check size={14} color={AntigravityTheme.colors.primary} />;
      case 'secure-payment':
        return <Shield size={14} color="#2563EB" />;
      case 'active-guarantee':
        return <ShieldCheck size={14} color={AntigravityTheme.colors.primary} />;
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

const styles = StyleSheet.create({
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: AntigravityTheme.borderRadius.full,
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
    backgroundColor: 'rgba(38, 255, 245, 0.1)',
  },
  bgBlue: {
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
  },
  badgeText: {
    ...AntigravityTheme.typography.xs,
    fontWeight: AntigravityTheme.typography.fontWeight.medium,
  },
  textCyan: {
    color: AntigravityTheme.colors.primary,
  },
  textBlue: {
    color: '#2563EB',
  },
});
