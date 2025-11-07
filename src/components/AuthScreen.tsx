import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';

import { colors, radius, spacing, textStyles } from '@/lib/theme';

type AuthScreenProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  learnLabel?: string;
  onPressLearn?: () => void;
};

export function AuthScreen({
  title,
  subtitle,
  children,
  footer,
  learnLabel,
  onPressLearn,
}: AuthScreenProps) {
  return (
    <LinearGradient
      colors={['#10291D', colors.primaryDark, colors.primary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled">
            {learnLabel && onPressLearn ? (
              <TouchableOpacity
                style={styles.learnLink}
                onPress={onPressLearn}
                accessibilityRole="link">
                <Text style={styles.learnLinkText}>{learnLabel}</Text>
              </TouchableOpacity>
            ) : null}

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Image
                  source={LOGO_FULL}
                  style={styles.cardLogo}
                  contentFit="contain"
                  accessibilityLabel="Groceo"
                />
                <View style={styles.cardTitleGroup}>
                  <Text style={styles.title}>{title}</Text>
                  <Text style={styles.subtitle}>{subtitle}</Text>
                </View>
              </View>
              <View style={styles.form}>{children}</View>
            </View>

            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const LOGO_FULL = require('../../assets/images/logogroceo.png');

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
  },
  learnLink: {
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
  },
  learnLinkText: {
    ...textStyles.body,
    color: colors.surface,
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'stretch',
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 20 },
    shadowRadius: 32,
    elevation: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cardLogo: {
    width: 56,
    height: 56,
  },
  cardTitleGroup: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  title: {
    ...textStyles.title,
    textAlign: 'left',
  },
  subtitle: {
    ...textStyles.body,
    color: colors.textSecondary,
  },
  form: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  footer: {
    alignItems: 'center',
    gap: spacing.sm,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'stretch',
  },
});
