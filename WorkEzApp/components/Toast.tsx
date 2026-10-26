import React, { useMemo } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react-native';
import { Pressable, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../contexts/ThemeContext';

interface ToastProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onClose?: () => void;
}

export function Toast({ type, message, onClose }: ToastProps) {
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const config = {
    success: {
      icon: CheckCircle,
      bg: 'bg-[#26FFF5]',
      text: 'text-[#0F172A]',
      bgColor: '#26FFF5',
      textColor: '#0F172A',
    },
    error: {
      icon: XCircle,
      bg: 'bg-red-500',
      text: 'text-white',
      bgColor: colors.danger,
      textColor: '#FFFFFF',
    },
    warning: {
      icon: AlertCircle,
      bg: 'bg-[#FBBF24]',
      text: 'text-[#854D0E]',
      bgColor: '#FBBF24',
      textColor: '#854D0E',
    },
    info: {
      icon: Info,
      bg: 'bg-[#2563EB]',
      text: 'text-white',
      bgColor: '#2563EB',
      textColor: '#FFFFFF',
    },
  };

  const { icon: Icon, bg, text, bgColor, textColor } = config[type];

  return (
    <Pressable
      className={`fixed top-4 left-4 right-4 ${bg} ${text} rounded-xl p-4 shadow-lg flex-row items-center gap-3 animate-in slide-in-from-top z-50`}
      style={[styles.container, { backgroundColor: bgColor }]}
      onPress={onClose}
    >
      <Icon size={20} color={textColor} />
      <Text style={[styles.message, { color: textColor }]}>{message}</Text>
    </Pressable>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      top: 16,
      left: 16,
      right: 16,
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      zIndex: 50,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? colors.border : 'transparent',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.35 : 0.15,
      shadowRadius: 8,
      elevation: 6,
    },
    message: {
      flex: 1,
      fontWeight: '600',
      fontSize: 14,
    },
  });
