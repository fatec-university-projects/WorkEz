import React, { Children } from 'react';
import { Pressable, PressableProps, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { AntigravityTheme } from '../constants/theme';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  variant?: 'primary' | 'secondary' | 'ghost';
  fullWidth?: boolean;
  style?: ViewStyle | ViewStyle[];
}

export function Button({
  variant = 'primary',
  fullWidth = false,
  children,
  style,
  ...props
}: ButtonProps) {
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';
  const isGhost = variant === 'ghost';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.baseButton,
        isPrimary && styles.primaryButton,
        isSecondary && styles.secondaryButton,
        isGhost && styles.ghostButton,
        fullWidth && styles.fullWidth,
        pressed && styles.pressed,
        props.disabled && styles.disabled,
        style,
      ]}
      {...props}
    >
      {Children.map(children, (child) => {
        if (child === null || child === undefined || typeof child === 'boolean') return null;
        if (typeof child === 'string' || typeof child === 'number') {
          return (
            <Text
              style={[
                styles.baseText,
                isPrimary && styles.primaryText,
                isSecondary && styles.secondaryText,
                isGhost && styles.ghostText,
              ]}
            >
              {child}
            </Text>
          );
        }
        return child;
      })}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  baseButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: AntigravityTheme.borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AntigravityTheme.spacing.sm,
  },
  fullWidth: {
    width: '100%',
  },
  pressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
  primaryButton: {
    backgroundColor: '#2563EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  secondaryButton: {
    backgroundColor: AntigravityTheme.colors.background,
    borderWidth: 2,
    borderColor: AntigravityTheme.colors.border,
  },
  ghostButton: {
    backgroundColor: 'transparent',
  },
  baseText: {
    textAlign: 'center',
    ...AntigravityTheme.typography.base,
    fontWeight: AntigravityTheme.typography.fontWeight.semibold,
  },
  primaryText: {
    color: '#FFFFFF',
  },
  secondaryText: {
    color: AntigravityTheme.colors.text,
  },
  ghostText: {
    color: AntigravityTheme.colors.textSecondary,
  },
});
