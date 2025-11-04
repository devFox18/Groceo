import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { colors, radius, spacing, textStyles } from '@/lib/theme';

type Props = {
  title: string;
  description?: string;
  ctaLabel?: string;
  onPressCta?: () => void;
};

export function EmptyState({ title, description, ctaLabel, onPressCta }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {ctaLabel && onPressCta ? (
        <Button title={ctaLabel} onPress={onPressCta} variant="primary" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  title: {
    ...textStyles.title,
    textAlign: 'center',
  },
  description: {
    ...textStyles.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
