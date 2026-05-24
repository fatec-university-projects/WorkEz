import { TouchableOpacity, TouchableOpacityProps, Text } from 'react-native';

interface ButtonProps extends TouchableOpacityProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  fullWidth = false,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const baseClasses = 'px-6 py-3.5 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-[#2563EB] text-white hover:bg-[#1d4ed8] active:scale-95 shadow-sm',
    secondary: 'bg-white text-[#0F172A] border-2 border-[#E2E8F0] hover:border-[#2563EB] hover:text-[#2563EB] active:scale-95',
    ghost: 'text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F1F5F9]',
  };

  const widthClass = fullWidth ? 'w-full' : '';

  const textVariants = {
    primary: 'text-white text-center font-semibold',
    secondary: 'text-[#0F172A] text-center font-semibold',
    ghost: 'text-[#94A3B8] text-center font-semibold',
  };

  return (
    <TouchableOpacity
      className={`${baseClasses} ${variants[variant]} ${widthClass} ${className}`}
      {...props}
    >
      {typeof children === 'string' ? (
        <Text className={textVariants[variant]}>{children}</Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}
