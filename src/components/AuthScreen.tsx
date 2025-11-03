import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, spacing, textStyles } from '@/lib/theme';

type AuthScreenProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthScreen({ title, subtitle, children, footer }: AuthScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <View style={styles.brandBadge}>
              <Text style={styles.brandInitial}>G</Text>
            </View>
            <Text style={styles.heroTitle}>Groceo</Text>
            <Text style={styles.heroSubtitle}>
              Smart groceries for every household.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
            <View style={styles.form}>{children}</View>
          </View>

          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl * 2,
    gap: spacing.lg,
  },
  hero: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandBadge: {
    backgroundColor: colors.primary,
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandInitial: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.background,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.dark,
  },
  heroSubtitle: {
    ...textStyles.body,
    color: colors.muted,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 10,
  },
  title: {
    ...textStyles.title,
    textAlign: 'left',
  },
  subtitle: {
    ...textStyles.body,
    color: colors.muted,
  },
  form: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  footer: {
    alignItems: 'center',
    gap: spacing.sm,
  },
});
