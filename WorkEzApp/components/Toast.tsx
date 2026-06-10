import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react-native';
import { View, Text } from 'react-native';

interface ToastProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onClose?: () => void;
}

export function Toast({ type, message, onClose }: ToastProps) {
  const config = {
    success: {
      icon: CheckCircle,
      bg: 'bg-[#26FFF5]',
      text: 'text-white',
    },
    error: {
      icon: XCircle,
      bg: 'bg-red-500',
      text: 'text-white',
    },
    warning: {
      icon: AlertCircle,
      bg: 'bg-[#FBBF24]',
      text: 'text-[#854D0E]',
    },
    info: {
      icon: Info,
      bg: 'bg-[#2563EB]',
      text: 'text-white',
    },
  };

  const { icon: Icon, bg, text } = config[type];

  return (
    <View
      className={`fixed top-4 left-4 right-4 ${bg} ${text} rounded-xl p-4 shadow-lg flex-row items-center gap-3 animate-in slide-in-from-top z-50`}
      onPress={onClose}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <Text className="flex-1 font-medium">{message}</Text>
    </View>
  );
}
