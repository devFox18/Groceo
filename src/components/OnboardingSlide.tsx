import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentProps, ReactNode } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';

import { Button } from '@/components/Button';
import { colors, radius, spacing, textStyles } from '@/lib/theme';

export type OnboardingIllustration = 'plan' | 'shop' | 'remember' | 'start';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export type IllustrationConfig = {
  gradient: [string, string];
  icon: IconName;
  accents: Array<{ icon: IconName; label: string }>;
  // Set this to a require(...) when bespoke onboarding art is ready.
  image?: ImageSourcePropType;
};

export const illustrationConfig: Record<OnboardingIllustration, IllustrationConfig> = {
  plan: {
    gradient: ['#FEEBC8', '#FBD38D'],
    icon: 'clipboard-text-outline',
    accents: [
      { icon: 'account-group', label: 'Family list' },
      { icon: 'plus-circle-outline', label: 'Add together' },
    ],
    image: require('../../assets/images/onboarding/plan.png'),
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
      { icon: 'account-heart-outline', label: 'Invite your family' },
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

type OnboardingHeroProps = {
  illustration: OnboardingIllustration;
  accentContent?: ReactNode | null;
  imageOverride?: ImageSourcePropType;
};

export function OnboardingHero({ illustration, accentContent, imageOverride }: OnboardingHeroProps) {
  const config = illustrationConfig[illustration];
  const artwork = imageOverride ?? config.image;
  const accentContentToRender =
    accentContent === undefined
      ? config.accents.map((accent) => (
          <HeroAccentPill key={accent.label} icon={accent.icon} label={accent.label} />
        ))
      : accentContent;

  return (
    <View style={styles.heroWrapper}>
      <LinearGradient
        colors={config.gradient}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[styles.heroBackdrop, styles.heroBackdropTop]}
        pointerEvents="none"
      />
      <LinearGradient
        colors={config.gradient}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={[styles.heroBackdrop, styles.heroBackdropBottom]}
        pointerEvents="none"
      />
      <LinearGradient
        colors={config.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroGlow}
      />
      <View style={styles.heroCard}>
        <LinearGradient
          colors={[config.gradient[0], config.gradient[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCardGradient}
          pointerEvents="none"
        />
        {artwork ? (
          <View style={styles.heroImageContainer}>
            <LinearGradient
              colors={[config.gradient[0], config.gradient[1]]}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={[styles.heroImageAura, styles.heroImageAuraPrimary]}
              pointerEvents="none"
            />
            <LinearGradient
              colors={[colors.surface, 'rgba(255,255,255,0)']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={[styles.heroImageAura, styles.heroImageAuraSecondary]}
              pointerEvents="none"
            />
            <LinearGradient
              colors={['rgba(0,0,0,0.16)', 'rgba(0,0,0,0)']}
              start={{ x: 0.5, y: 1 }}
              end={{ x: 0.5, y: 0 }}
              style={styles.heroImageShadow}
              pointerEvents="none"
            />
            <Image source={artwork} style={styles.heroImage} resizeMode="contain" />
          </View>
        ) : (
          <LinearGradient
            colors={config.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroIcon}>
            <MaterialCommunityIcons name={config.icon} size={60} color={colors.textPrimary} />
          </LinearGradient>
        )}
        {accentContentToRender ? <View style={styles.heroAccents}>{accentContentToRender}</View> : null}
      </View>
    </View>
  );
}

type HeroAccentPillProps = {
  icon: IconName;
  label: string;
};

export function HeroAccentPill({ icon, label }: HeroAccentPillProps) {
  return (
    <LinearGradient
      colors={['rgba(255,255,255,0.92)', 'rgba(255,255,255,0.74)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.accentPill}>
      <MaterialCommunityIcons name={icon} size={18} color={colors.textPrimary} />
      <Text style={styles.accentText}>{label}</Text>
    </LinearGradient>
  );
}

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
  return (
    <View style={styles.slide}>
      <OnboardingHero illustration={illustration} />

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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg * 1.2,
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
  heroBackdrop: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    opacity: 0.18,
    transform: [{ rotate: '18deg' }, { scaleX: 1.2 }],
  },
  heroBackdropTop: {
    top: -40,
    right: spacing.xl,
  },
  heroBackdropBottom: {
    bottom: -36,
    left: spacing.lg,
    transform: [{ rotate: '-22deg' }, { scaleX: 1.35 }],
  },
  heroCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.87)',
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 14 },
    elevation: 4,
    overflow: 'hidden',
  },
  heroCardGradient: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.18,
  },
  heroIcon: {
    width: '100%',
    borderRadius: radius.md,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImageContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  heroImageAura: {
    position: 'absolute',
    width: '90%',
    height: '82%',
    borderRadius: radius.lg * 1.8,
    opacity: 0.38,
  },
  heroImageAuraPrimary: {
    transform: [{ rotate: '-6deg' }],
  },
  heroImageAuraSecondary: {
    opacity: 0.5,
    transform: [{ rotate: '11deg' }],
  },
  heroImageShadow: {
    position: 'absolute',
    bottom: spacing.md * -0.15,
    width: '74%',
    height: '24%',
    borderRadius: 120,
    transform: [{ scaleX: 1.4 }],
  },
  heroImage: {
    width: '94%',
    height: '94%',
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs * 1.5,
    borderRadius: radius.lg,
    shadowColor: '#6B7280',
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  accentText: {
    ...textStyles.caption,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  copy: {
    gap: spacing.xs,
    alignItems: 'center',
  },
  title: {
    ...textStyles.title,
    textAlign: 'center',
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.3,
  },
  subtitle: {
    ...textStyles.body,
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 22,
  },
  actions: {
    gap: spacing.sm,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  secondaryHint: {
    ...textStyles.caption,
    textAlign: 'center',
    color: colors.textSecondary,
  },
});
