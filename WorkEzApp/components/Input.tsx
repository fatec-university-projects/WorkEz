import { InputHTMLAttributes, forwardRef } from 'react';
import { View, Text, TextInput } from 'react-native';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <View className="w-full">
        {label && (
          <Text className="block text-sm font-medium text-[#0F172A] mb-2">
            {label}
          </Text>
        )}
        <TextInput
          ref={ref}
          className={`w-full px-4 py-3.5 bg-white border-2 border-[#E2E8F0] rounded-xl
            text-[#0F172A] placeholder:text-[#94A3B8]
            focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10
            transition-all duration-200 ${error ? 'border-red-500' : ''} ${className}`}
          {...props}
        />
        {error && (
          <Text className="mt-2 text-sm text-red-500">{error}</Text>
        )}
      </View>
    );
  }
);

Input.displayName = 'Input';
