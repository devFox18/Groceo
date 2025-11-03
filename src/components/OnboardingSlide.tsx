import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Button } from '@/components/Button';
import { colors, radius, spacing, textStyles } from '@/lib/theme';

export type OnboardingIllustration = 'plan' | 'shop' | 'remember' | 'start';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type IllustrationConfig = {
  gradient: [string, string];
  icon: IconName;
  accents: Array<{ icon: IconName; label: string }>;
};

const illustrationConfig: Record<OnboardingIllustration, IllustrationConfig> = {
  plan: {
    gradient: ['#FEEBC8', '#FBD38D'],
    icon: 'clipboard-text-outline',
    accents: [
      { icon: 'account-group', label: 'Family list' },
      { icon: 'plus-circle-outline', label: 'Add together' },
    ],
  },
  shop: {
    gradient: ['#C6F6D5', '#9AE6B4'],
    icon: 'cart-outline',
    accents: [
      { icon: 'clock-outline', label: 'Save time' },
      { icon: 'map-marker-radius', label: 'One trip' },
    ],
  },
  remember: {
    gradient: ['#E9D8FD', '#D6BCFA'],
    icon: 'bell-outline',
    accents: [
      { icon: 'package-variant', label: 'Pantry check' },
      { icon: 'lightbulb-on-outline', label: 'Smart nudge' },
    ],
  },
  start: {
    gradient: ['#BEE3F8', '#90CDF4'],
    icon: 'rocket-launch-outline',
    accents: [
      { icon: 'account-heart-outline', label: 'Invite fam' },
      { icon: 'fire', label: 'Get cooking' },
    ],
  },
};

type OnboardingSlideProps = {
  title: string;
  subtitle: string;
  primaryLabel?: string;
  onPrimary?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  illustration: OnboardingIllustration;
  isLast: boolean;
};

export function OnboardingSlide({
  title,
  subtitle,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  illustration,
  isLast,
}: OnboardingSlideProps) {
  const config = illustrationConfig[illustration];

  return (
    <View style={styles.slide}>
      <View style={styles.heroWrapper}>
        <LinearGradient
          colors={config.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroGlow}
        />
        <View style={styles.heroCard}>
          <LinearGradient
            colors={config.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroIcon}>
            <MaterialCommunityIcons name={config.icon} size={60} color={colors.dark} />
          </LinearGradient>
          <View style={styles.heroAccents}>
            {config.accents.map((accent) => (
              <View key={accent.label} style={styles.accentPill}>
                <MaterialCommunityIcons name={accent.icon} size={18} color={colors.dark} />
                <Text style={styles.accentText}>{accent.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <View style={styles.actions}>
        {!isLast ? (
          <Text style={styles.secondaryHint}>Swipe to explore more</Text>
        ) : (
          <>
            {primaryLabel && onPrimary ? (
              <Button title={primaryLabel} onPress={onPrimary} />
            ) : null}
            {secondaryLabel && onSecondary ? (
              <Button title={secondaryLabel} onPress={onSecondary} variant="ghost" />
            ) : null}
            <Text style={styles.secondaryHint}>You can always switch households later</Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  slide: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl * 1.2,
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  heroWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroGlow: {
    position: 'absolute',
    width: '65%',
    height: 180,
    borderRadius: radius.lg * 1.5,
    opacity: 0.35,
    transform: [{ rotate: '-6deg' }],
  },
  heroCard: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  heroIcon: {
    width: '100%',
    borderRadius: radius.md,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAccents: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  accentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  accentText: {
    ...textStyles.caption,
    color: colors.dark,
    fontWeight: '600',
  },
  copy: {
    gap: spacing.sm,
  },
  title: {
    ...textStyles.title,
    textAlign: 'left',
  },
  subtitle: {
    ...textStyles.body,
    color: colors.muted,
  },
  actions: {
    gap: spacing.sm,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  secondaryHint: {
    ...textStyles.caption,
    textAlign: 'center',
    color: colors.muted,
  },
});
