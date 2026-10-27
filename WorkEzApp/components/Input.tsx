import { forwardRef, ComponentRef } from 'react';
import { View, Text, TextInput, TextInputProps, StyleSheet } from 'react-native';
import { WorkEzTheme } from '../constants/theme';
import { useAppTheme } from '../contexts/ThemeContext';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export const Input = forwardRef<ComponentRef<typeof TextInput>, InputProps>(
  ({ label, error, style, ...props }, ref) => {
    const { colors } = useAppTheme();

    return (
      <View style={styles.container}>
        {label ? (
          <Text style={[styles.label, { color: colors.text }]}>
            {label}
          </Text>
        ) : null}
        <TextInput
          ref={ref}
          style={[
            styles.input,
            {
              backgroundColor: colors.backgroundCard,
              borderColor: error ? colors.danger : colors.border,
              color: colors.text,
            },
            style,
          ]}
          placeholderTextColor={colors.textSecondary}
          {...props}
        />
        {error ? (
          <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
        ) : null}
      </View>
    );
  }
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    display: 'flex',
    ...WorkEzTheme.typography.sm,
    fontWeight: WorkEzTheme.typography.fontWeight.medium,
    marginBottom: WorkEzTheme.spacing.xs,
  },
  input: {
    width: '100%',
    paddingHorizontal: WorkEzTheme.spacing.md,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: WorkEzTheme.borderRadius.md,
    ...WorkEzTheme.typography.base,
  },
  errorText: {
    marginTop: WorkEzTheme.spacing.xs,
    ...WorkEzTheme.typography.sm,
  },
});
