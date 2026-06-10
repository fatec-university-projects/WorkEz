import { forwardRef } from 'react';
import { View, Text, TextInput, TextInputProps, StyleSheet } from 'react-native';
import { WorkEzTheme } from '../constants/theme';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, style, ...props }, ref) => {
    return (
      <View style={styles.container}>
        {label && (
          <Text style={styles.label}>
            {label}
          </Text>
        )}
        <TextInput
          ref={ref}
          style={[
            styles.input,
            error ? styles.inputError : null,
            style
          ]}
          placeholderTextColor={WorkEzTheme.colors.textSecondary}
          {...props}
        />
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}
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
    ...WorkEzTheme.typography.sm,
    fontWeight: WorkEzTheme.typography.fontWeight.medium,
    color: WorkEzTheme.colors.text,
    marginBottom: 8,
  },
  input: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: WorkEzTheme.colors.border,
    borderRadius: WorkEzTheme.borderRadius.xl,
    color: WorkEzTheme.colors.text,
    ...WorkEzTheme.typography.base,
  },
  inputError: {
    borderColor: WorkEzTheme.colors.danger,
  },
  errorText: {
    marginTop: 8,
    ...WorkEzTheme.typography.sm,
    color: WorkEzTheme.colors.danger,
  },
});
