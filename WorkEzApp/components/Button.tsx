import React, { Children, isValidElement } from 'react';
import { TouchableOpacity, TouchableOpacityProps, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

interface ButtonProps extends Omit<TouchableOpacityProps, 'style' | 'children'> {
  variant?: 'primary' | 'secondary' | 'ghost';
  fullWidth?: boolean;
  style?: ViewStyle | ViewStyle[];
  children?: React.ReactNode;
}

function renderChildren(children: React.ReactNode, textStyle: TextStyle): React.ReactNode {
  return Children.map(children, (child) => {
    if (child === null || child === undefined || typeof child === 'boolean') return null;
    if (typeof child === 'string' || typeof child === 'number') {
      return <Text style={textStyle}>{child}</Text>;
    }
    if (isValidElement(child) && child.type === React.Fragment) {
      return renderChildren((child.props as any).children, textStyle);
    }
    return child;
  });
}

export function Button({
  variant = 'primary',
  fullWidth = false,
  children,
  style,
  disabled,
  ...props
}: ButtonProps) {
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';
  const isGhost = variant === 'ghost';

  const defaultTextStyle: TextStyle = isPrimary
    ? styles.primaryText
    : isSecondary
    ? styles.secondaryText
    : styles.ghostText;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.8}
      disabled={disabled}
      style={[
        styles.baseButton,
        isPrimary && styles.primaryButton,
        isSecondary && styles.secondaryButton,
        isGhost && styles.ghostButton,
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        style as any,
      ]}
      {...props}
    >
      {renderChildren(children, defaultTextStyle)}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  baseButton: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  primaryButton: {
    backgroundColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  secondaryButton: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  ghostButton: {
    backgroundColor: 'transparent',
  },
  primaryText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryText: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    color: '#2563EB',
  },
  ghostText: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    color: '#2563EB',
  },
});
