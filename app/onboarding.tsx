import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { useMemo, useState } from 'react';
import {
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from '@/components/Button';
import { HeroAccentPill, OnboardingHero, type OnboardingIllustration } from '@/components/OnboardingSlide';
import { colors, radius, spacing, textStyles } from '@/lib/theme';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type QuizOption = {
  id: string;
  label: string;
  description?: string;
  icon?: IconName;
};

type StepBase = {
  key: string;
  milestone: string;
  illustration: OnboardingIllustration;
  title: string;
  subtitle: string;
  primaryLabel: string;
  secondaryLabel?: string;
  secondaryAction?: 'login' | 'skip' | 'back';
};

type IntroStep = StepBase & {
  type: 'intro';
};

type QuizStep = StepBase & {
  type: 'quiz';
  options: QuizOption[];
  multi?: boolean;
};

type SummaryStep = StepBase & {
  type: 'summary';
};

type OnboardingStep = IntroStep | QuizStep | SummaryStep;

type Answers = Record<string, string | string[]>;

export default function OnboardingScreen() {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({ household: [] });

  const steps = useMemo<OnboardingStep[]>(
    () => [
      {
        key: 'intro',
        milestone: 'Plan',
        illustration: 'plan',
        type: 'intro',
        title: 'Plan smarter together',
        subtitle: 'Groceo builds one smart list for the whole household. Let’s tailor it in a few taps.',
        primaryLabel: 'Getting started',
        secondaryAction: 'login',
        secondaryLabel: 'Log in instead',
      },
      {
        key: 'household',
        milestone: 'Sync',
        illustration: 'shop',
        type: 'quiz',
        title: 'Who’s sharing this list?',
        subtitle: 'Pick everyone who usually shops or cooks with you.',
        options: [
          { id: 'partner', label: 'Partner', description: 'We plan trips together', icon: 'account-heart-outline' },
          { id: 'roommates', label: 'Roommates', description: 'We split the essentials', icon: 'account-multiple-outline' },
          { id: 'kids', label: 'Kids or teens', description: 'They add what they need', icon: 'account-child-outline' },
          { id: 'caregiver', label: 'Caregiver', description: 'Helps restock staples', icon: 'hand-heart' },
          { id: 'just-me', label: 'Just me', description: 'I’m flying solo', icon: 'account-circle-outline' },
        ],
        multi: true,
        primaryLabel: 'Next',
        secondaryLabel: 'Skip question',
        secondaryAction: 'skip',
      },
      {
        key: 'cadence',
        milestone: 'Sync',
        illustration: 'remember',
        type: 'quiz',
        title: 'How often do you shop?',
        subtitle: 'We’ll time nudges and restock reminders around your rhythm.',
        options: [
          { id: 'weekly', label: 'Every week', description: 'Same day or two each week', icon: 'calendar-week' },
          { id: 'biweekly', label: 'Every other week', description: 'Bigger hauls, less often', icon: 'calendar-range' },
          { id: 'monthly', label: 'Monthly stock-up', description: 'Bulk runs and pantry refills', icon: 'calendar-month' },
          { id: 'as-needed', label: 'Whenever needed', description: 'We go when the list fills up', icon: 'calendar-question' },
        ],
        primaryLabel: 'Next',
        secondaryLabel: 'Skip question',
        secondaryAction: 'skip',
      },
      {
        key: 'focus',
        milestone: 'Start',
        illustration: 'start',
        type: 'quiz',
        title: 'What do you want help with most?',
        subtitle: 'We’ll spotlight features tuned to your priorities.',
        options: [
          { id: 'never-miss', label: 'Never miss a staple', description: 'Smarter pantry reminders', icon: 'bell-outline' },
          { id: 'faster-trips', label: 'Speed through trips', description: 'Sorted store views & Smart Check', icon: 'clock-outline' },
          { id: 'shared-planning', label: 'Shared planning', description: 'Assign items and meal ideas', icon: 'clipboard-text-outline' },
          { id: 'budget', label: 'Stay on budget', description: 'Track spend and promos', icon: 'currency-usd' },
        ],
        primaryLabel: 'See my setup',
        secondaryLabel: 'Skip question',
        secondaryAction: 'skip',
      },
      {
        key: 'summary',
        milestone: 'Start',
        illustration: 'plan',
        type: 'summary',
        title: 'Ready for your Groceo household',
        subtitle: 'Here’s what we’ll line up so you can hit the ground running.',
        primaryLabel: 'Create household',
        secondaryLabel: 'Go back',
        secondaryAction: 'back',
      },
    ],
    []
  );

  const milestones = useMemo(() => {
    const seen = new Set<string>();
    return steps.reduce<Array<{ label: string; index: number }>>((acc, step, index) => {
      if (!seen.has(step.milestone)) {
        seen.add(step.milestone);
        acc.push({ label: step.milestone, index });
      }
      return acc;
    }, []);
  }, [steps]);

  const summaryHighlights = useMemo(() => {
    const highlights: Array<{ icon: IconName; label: string }> = [];
    const householdAnswer = answers.household;
    const cadenceAnswer = answers.cadence;
    const focusAnswer = answers.focus;

    if (Array.isArray(householdAnswer) && householdAnswer.length > 0) {
      const isSolo = householdAnswer.length === 1 && householdAnswer[0] === 'just-me';
      highlights.push({
        icon: isSolo ? 'account-circle-outline' : 'account-group',
        label: isSolo ? 'Solo list tuned to you' : 'Shared list set up for your crew',
      });
    } else {
      highlights.push({
        icon: 'clipboard-check-outline',
        label: 'Smart suggestions ready out of the box',
      });
    }

    if (typeof cadenceAnswer === 'string' && cadenceAnswer.length > 0) {
      const cadenceTextMap: Record<string, string> = {
        weekly: 'Weekly rhythm reminders at the right time',
        biweekly: 'Bi-weekly planning nudges queued up',
        monthly: 'Monthly stock-up planning insights',
        'as-needed': 'On-demand alerts when staples run low',
      };
      highlights.push({
        icon: 'calendar-check',
        label: cadenceTextMap[cadenceAnswer] ?? 'Personalized shopping cadence',
      });
    }

    if (typeof focusAnswer === 'string' && focusAnswer.length > 0) {
      const focusTextMap: Record<string, { icon: IconName; label: string }> = {
        'never-miss': { icon: 'bell-ring-outline', label: 'Pantry guard keeps staples covered' },
        'faster-trips': { icon: 'map-marker-radius', label: 'Store-aware list speeds up trips' },
        'shared-planning': { icon: 'clipboard-plus-outline', label: 'Shared planning tools highlighted' },
        budget: { icon: 'chart-areaspline', label: 'Budget-friendly tips in focus' },
      };
      highlights.push(focusTextMap[focusAnswer] ?? { icon: 'star-outline', label: 'Favorite features prioritized' });
    } else {
      highlights.push({
        icon: 'lightbulb-on-outline',
        label: 'Feature tips tailored as you explore',
      });
    }

    return highlights.slice(0, 3);
  }, [answers]);

  const currentStep = steps[activeIndex];
  const progressRatio = steps.length > 1 ? activeIndex / (steps.length - 1) : 0;

  const handleSelectOption = (optionId: string, step: QuizStep) => {
    setAnswers((prev) => {
      const previousValue = prev[step.key];
      if (step.multi) {
        const current = Array.isArray(previousValue) ? previousValue : [];
        let next = current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId];

        if (optionId === 'just-me') {
          next = current.includes('just-me') ? current.filter((id) => id !== 'just-me') : ['just-me'];
        } else {
          next = next.filter((id) => id !== 'just-me');
        }

        return { ...prev, [step.key]: next };
      }

      return { ...prev, [step.key]: optionId };
    });
  };

  const hasAnswerForStep = (step: OnboardingStep) => {
    const value = answers[step.key];
    if (step.type !== 'quiz') {
      return true;
    }
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return typeof value === 'string' && value.length > 0;
  };

  const goNext = () => {
    setActiveIndex((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const goBack = () => {
    setActiveIndex((prev) => Math.max(prev - 1, 0));
  };

  const handlePrimary = () => {
    if (currentStep.type === 'summary') {
      router.replace('/(auth)/register');
      return;
    }

    if (currentStep.type === 'quiz' && !hasAnswerForStep(currentStep)) {
      return;
    }

    goNext();
  };

  const handleSecondary = () => {
    switch (currentStep.secondaryAction) {
      case 'login':
        router.replace('/(auth)/login');
        break;
      case 'skip':
        goNext();
        break;
      case 'back':
        goBack();
        break;
      default:
        break;
    }
  };

  const handleHeaderLogin = () => {
    router.replace('/(auth)/login');
  };

  const handleHeaderSkip = () => {
    router.replace('/(auth)/register');
  };

  const primaryDisabled = currentStep.type === 'quiz' && !hasAnswerForStep(currentStep);

  return (
    <LinearGradient colors={['#F6F9FF', '#FFFFFF']} style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={handleHeaderLogin} hitSlop={8}>
          <Text style={styles.headerLink}>Log in</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={handleHeaderSkip} hitSlop={8}>
          <Text style={styles.headerLink}>Skip</Text>
        </Pressable>
      </View>

      <View style={styles.heroSection}>
        <OnboardingHero
          illustration={currentStep.illustration}
          accentContent={resolveHeroAccents(currentStep)}
        />
      </View>

      <View style={styles.bottomCard}>
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressRatio * 100}%` }]} />
          </View>
          <View style={styles.milestoneRow}>
            {milestones.map((milestone) => {
              const isActive = activeIndex >= milestone.index;
              return (
                <Text
                  key={milestone.label}
                  style={[styles.milestoneLabel, isActive && styles.milestoneLabelActive]}>
                  {milestone.label}
                </Text>
              );
            })}
          </View>
        </View>

        <View style={styles.copy}>
          <Text style={styles.title}>{currentStep.title}</Text>
          <Text style={styles.subtitle}>{currentStep.subtitle}</Text>
        </View>

        {currentStep.type === 'quiz' ? (
          <View style={styles.optionList}>
            {currentStep.options.map((option) => {
              const answerForStep = answers[currentStep.key];
              const selected = Array.isArray(answerForStep)
                ? answerForStep.includes(option.id)
                : answerForStep === option.id;
              return (
                <OptionCard
                  key={option.id}
                  option={option}
                  multi={!!currentStep.multi}
                  selected={selected}
                  onPress={() => handleSelectOption(option.id, currentStep)}
                />
              );
            })}
          </View>
        ) : null}

        {currentStep.type === 'summary' ? (
          <View style={styles.summaryList}>
            {summaryHighlights.map((item) => (
              <View key={item.label} style={styles.summaryItem}>
                <View style={styles.summaryIconBadge}>
                  <MaterialCommunityIcons name={item.icon} size={18} color={colors.primary} />
                </View>
                <Text style={styles.summaryText}>{item.label}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.ctaBar}>
          <Button title={currentStep.primaryLabel} onPress={handlePrimary} disabled={primaryDisabled} />
          {currentStep.secondaryLabel ? (
            <Button
              title={currentStep.secondaryLabel}
              onPress={handleSecondary}
              variant="ghost"
            />
          ) : null}
        </View>
      </View>
    </LinearGradient>
  );
}

function resolveHeroAccents(step: OnboardingStep) {
  if (step.type === 'quiz') {
    return null;
  }

  if (step.key === 'intro') {
    return (
      <>
        <HeroAccentPill icon="clock-check-outline" label="2-minute setup" />
        <HeroAccentPill icon="star-circle-outline" label="Personalized tips" />
      </>
    );
  }

  return undefined;
}

type OptionCardProps = {
  option: QuizOption;
  selected: boolean;
  multi: boolean;
  onPress: () => void;
};

function OptionCard({ option, selected, multi, onPress }: OptionCardProps) {
  const trailingIcon = multi
    ? selected
      ? 'check-circle'
      : 'checkbox-blank-circle-outline'
    : selected
      ? 'radiobox-marked'
      : 'radiobox-blank';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionCard,
        selected && styles.optionCardSelected,
        pressed && styles.optionCardPressed,
      ]}>
      <View style={[styles.optionIconBadge, selected && styles.optionIconBadgeActive]}>
        {option.icon ? (
          <MaterialCommunityIcons
            name={option.icon}
            size={18}
            color={selected ? colors.surface : colors.primary}
          />
        ) : null}
      </View>
      <View style={styles.optionText}>
        <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{option.label}</Text>
        {option.description ? (
          <Text style={styles.optionDescription}>{option.description}</Text>
        ) : null}
      </View>
      <MaterialCommunityIcons
        name={trailingIcon}
        size={22}
        color={selected ? colors.primary : 'rgba(148,163,184,0.7)'}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    zIndex: 1,
  },
  headerLink: {
    ...textStyles.caption,
    fontWeight: '600',
    color: colors.primary,
    letterSpacing: 0.2,
  },
  heroSection: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  bottomCard: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    marginHorizontal: spacing.lg,
    borderRadius: radius.lg * 1.1,
    padding: spacing.lg,
    gap: spacing.md,
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 20 },
    elevation: 12,
  },
  progressContainer: {
    gap: spacing.xs,
  },
  progressTrack: {
    height: 6,
    borderRadius: radius.md,
    backgroundColor: 'rgba(148,163,184,0.2)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  milestoneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  milestoneLabel: {
    ...textStyles.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  milestoneLabelActive: {
    color: colors.primaryDark,
  },
  copy: {
    gap: spacing.xs,
  },
  title: {
    ...textStyles.title,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.3,
  },
  subtitle: {
    ...textStyles.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  optionList: {
    gap: spacing.sm,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: radius.md * 1.2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
  },
  optionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(79, 70, 229, 0.08)',
    shadowColor: '#4C51BF',
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  optionCardPressed: {
    transform: [{ scale: 0.98 }],
  },
  optionIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(59,130,246,0.08)',
  },
  optionIconBadgeActive: {
    backgroundColor: colors.primary,
  },
  optionText: {
    flex: 1,
    gap: spacing.xs * 0.75,
  },
  optionLabel: {
    ...textStyles.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  optionLabelSelected: {
    color: colors.primaryDark,
  },
  optionDescription: {
    ...textStyles.caption,
    color: colors.textSecondary,
  },
  summaryList: {
    gap: spacing.sm,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  summaryIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryText: {
    ...textStyles.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  ctaBar: {
    gap: spacing.sm,
  },
});
