import { Check, Shield, ShieldCheck } from 'lucide-react-native';
import { Text } from 'react-native';

interface BadgeProps {
  variant: 'verified' | 'secure-payment' | 'active-guarantee';
  size?: 'sm' | 'md';
}

export function Badge({ variant, size = 'md' }: BadgeProps) {
  const sizeClasses = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
  };

  const variants = {
    verified: {
      bg: 'bg-[#26FFF5]/10',
      text: 'text-[#26FFF5]',
      icon: <Check className="w-3.5 h-3.5" />,
      label: 'Verificado',
    },
    'secure-payment': {
      bg: 'bg-[#2563EB]/10',
      text: 'text-[#2563EB]',
      icon: <Shield className="w-3.5 h-3.5" />,
      label: 'Pagamento seguro',
    },
    'active-guarantee': {
      bg: 'bg-[#26FFF5]/10',
      text: 'text-[#26FFF5]',
      icon: <ShieldCheck className="w-3.5 h-3.5" />,
      label: 'Garantia ativa',
    },
  };

  const config = variants[variant];

  return (
    <Text className={`inline-flex items-center gap-1.5 ${config.bg} ${config.text} ${sizeClasses[size]} rounded-full font-medium`}>
      {config.icon}
      {config.label}
    </Text>
  );
}
