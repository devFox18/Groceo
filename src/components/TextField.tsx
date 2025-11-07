import type { ReactNode } from 'react';
import { forwardRef } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';

import { colors, radius, spacing, textStyles } from '@/lib/theme';

type Props = TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
  rightAccessory?: ReactNode;
};

export const TextField = forwardRef<TextInput, Props>(
  ({ label, error, hint, style, rightAccessory, ...rest }, ref) => {
    const shouldShowHint = !error && hint;

    return (
      <View style={styles.container}>
        <Text style={styles.label}>{label}</Text>
        <View
          style={[
            styles.inputWrapper,
            error && styles.inputWrapperError,
            shouldShowHint && styles.inputWrapperHint,
          ]}>
          <TextInput
            ref={ref}
            style={[styles.input, style]}
            placeholderTextColor={colors.textSecondary}
            {...rest}
          />
          {rightAccessory ? <View style={styles.accessory}>{rightAccessory}</View> : null}
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {shouldShowHint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
    );
  },
);

TextField.displayName = 'TextField';

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    ...textStyles.body,
    fontWeight: '600',
  },
  inputWrapper: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  inputWrapperError: {
    borderColor: colors.error,
  },
  inputWrapperHint: {
    borderColor: colors.primary,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.textPrimary,
  },
  accessory: {
    marginLeft: spacing.sm,
  },
  error: {
    color: colors.error,
    fontSize: 13,
  },
  hint: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
