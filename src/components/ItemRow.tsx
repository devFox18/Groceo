import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, textStyles } from '@/lib/theme';

export type GroceryItem = {
  id: string;
  name: string;
  quantity: number;
  checked: boolean;
  category?: string | null;
};

type ItemRowProps = {
  item: GroceryItem;
  onToggle: (item: GroceryItem) => void;
  onDelete: (item: GroceryItem) => void;
};

export function ItemRow({ item, onToggle, onDelete }: ItemRowProps) {
  return (
    <View style={[styles.container, item.checked && styles.checkedBackground]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: item.checked }}
        onPress={() => onToggle(item)}
        style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
        {item.checked ? <Feather name="check" size={16} color={colors.surface} /> : null}
      </Pressable>
      <View style={styles.content}>
        <Text style={[styles.name, item.checked && styles.nameChecked]}>{item.name}</Text>
        <Text style={styles.meta}>Qty {item.quantity}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Delete ${item.name}`}
        onPress={() => onDelete(item)}
        style={styles.delete}>
        <Feather name="trash-2" size={18} color={colors.error} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  checkedBackground: {
    backgroundColor: colors.background,
    borderColor: colors.border,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  content: {
    flex: 1,
    gap: spacing.xs,
  },
  name: {
    ...textStyles.body,
    fontWeight: '600',
  },
  nameChecked: {
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  meta: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  delete: {
    padding: spacing.xs,
  },
});
