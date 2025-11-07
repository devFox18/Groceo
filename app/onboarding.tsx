import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';

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

type MilestoneKey = 'crew' | 'rhythm' | 'setup';

type StepBase = {
  key: string;
  milestone: MilestoneKey;
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

const milestoneMeta: Record<
  MilestoneKey,
  { label: string; description: string; icon: IconName }
> = {
  crew: {
    label: 'Jouw team',
    description: 'Vertel wie er mee boodschappen doet, dan heten we ze meteen welkom.',
    icon: 'account-group-outline',
  },
  rhythm: {
    label: 'Jouw ritme',
    description: 'Deel je boodschappen-tempo zodat herinneringen precies op tijd komen.',
    icon: 'clock-outline',
  },
  setup: {
    label: 'Jouw start',
    description: 'We laten zien welke extra hulpjes we klaarzetten voor wat jij belangrijk vindt.',
    icon: 'rocket-launch-outline',
  },
};

function stepHasAnswer(step: OnboardingStep, answers: Answers): boolean {
  if (step.type !== 'quiz') {
    return true;
  }

  const value = answers[step.key];
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return typeof value === 'string' && value.length > 0;
}

export default function OnboardingScreen() {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({ household: [] });

  const steps = useMemo<OnboardingStep[]>(
    () => [
      {
        key: 'intro',
        milestone: 'crew',
        illustration: 'plan',
        type: 'intro',
        title: 'Laten we boodschappen eenvoudig maken',
        subtitle: 'Een paar korte vragen zorgen ervoor dat Groceo perfect bij jouw huishouden past.',
        primaryLabel: 'Start de setup van 1 minuut',
        secondaryAction: 'login',
        secondaryLabel: 'Toch inloggen',
      },
      {
        key: 'household',
        milestone: 'crew',
        illustration: 'shop',
        type: 'quiz',
        title: 'Wie doet meestal boodschappen met jou?',
        subtitle: 'Nodig de mensen uit die items toevoegen, samen koken of de koelkast gevuld houden.',
        options: [
          {
            id: 'partner',
            label: 'Partner of echtgenoot',
            description: 'We werken samen aan dezelfde lijst',
            icon: 'account-heart-outline',
          },
          {
            id: 'roommates',
            label: 'Huisgenoten',
            description: 'We delen pantry-succesjes en klussen',
            icon: 'account-multiple-outline',
          },
          {
            id: 'kids',
            label: 'Kinderen of tieners',
            description: 'Zij voegen toe waar ze trek in hebben',
            icon: 'account-child-outline',
          },
          {
            id: 'caregiver',
            label: 'Grootouder of verzorger',
            description: 'Ze helpen de basisvoorraad aanvullen',
            icon: 'hand-heart',
          },
          {
            id: 'just-me',
            label: 'Voor nu alleen ik',
            description: 'Ik neem de boodschappenmissie op me',
            icon: 'account-circle-outline',
          },
        ],
        multi: true,
        primaryLabel: 'Opslaan & verder',
        secondaryLabel: 'Ik nodig ze later uit',
        secondaryAction: 'skip',
      },
      {
        key: 'cadence',
        milestone: 'rhythm',
        illustration: 'remember',
        type: 'quiz',
        title: 'Hoe verlopen jullie boodschappenrondes meestal?',
        subtitle: 'We geven je een seintje vóór het koelkaststress wordt en houden het juiste tempo aan.',
        options: [
          {
            id: 'weekly',
            label: 'Wekelijks ritme',
            description: 'We gaan één of twee keer per week op pad',
            icon: 'calendar-week',
          },
          {
            id: 'biweekly',
            label: 'Om de week',
            description: 'Grotere rondes om de paar weken',
            icon: 'calendar-range',
          },
          {
            id: 'monthly',
            label: 'Maandelijkse voorraadronde',
            description: 'Bulkbezoeken om de voorraad blij te houden',
            icon: 'calendar-month',
          },
          {
            id: 'as-needed',
            label: 'Wanneer de koelkast leeg oogt',
            description: 'We sprinten zodra de lijst lang wordt',
            icon: 'calendar-question',
          },
        ],
        primaryLabel: 'Opslaan & verder',
        secondaryLabel: 'Dit stel ik later in',
        secondaryAction: 'skip',
      },
      {
        key: 'focus',
        milestone: 'setup',
        illustration: 'start',
        type: 'quiz',
        title: 'Wat zou boodschappen doen makkelijker maken?',
        subtitle: 'Kies welke magie Groceo naar jouw huishouden moet brengen.',
        options: [
          {
            id: 'never-miss',
            label: 'Nooit misgrijpen',
            description: 'Vriendelijke pantry-herinneringen vóór favorieten op zijn',
            icon: 'bell-outline',
          },
          {
            id: 'faster-trips',
            label: 'Snellere supermarktbezoeken',
            description: 'Slimme looproutes en checklists in real time',
            icon: 'clock-outline',
          },
          {
            id: 'shared-planning',
            label: 'Minder lijstjes-gedoe',
            description: 'Maaltijdideeën en taken in één knusse hub',
            icon: 'clipboard-text-outline',
          },
          {
            id: 'budget',
            label: 'Binnen budget blijven',
            description: 'Uitgaven volgen en de weekwins binnenhalen',
            icon: 'currency-usd',
          },
        ],
        primaryLabel: 'Laat mijn Groceo-plan zien',
        secondaryLabel: 'We kiezen dit later',
        secondaryAction: 'skip',
      },
      {
        key: 'summary',
        milestone: 'setup',
        illustration: 'plan',
        type: 'summary',
        title: 'Je Groceo-thuis is klaar',
        subtitle: 'We hebben een boodschappenritme klaarstaan dat past bij de mensen voor wie je zorgt.',
        primaryLabel: 'Maak je huishouden aan',
        secondaryLabel: 'Antwoorden bekijken',
        secondaryAction: 'back',
      },
    ],
    []
  );

  const milestones = useMemo(() => {
    const groups: Array<{
      key: MilestoneKey;
      label: string;
      description: string;
      icon: IconName;
      startIndex: number;
      endIndex: number;
    }> = [];

    steps.forEach((step, index) => {
      const existing = groups.find((group) => group.key === step.milestone);
      if (existing) {
        existing.endIndex = index;
      } else {
        const meta = milestoneMeta[step.milestone];
        groups.push({
          key: step.milestone,
          label: meta.label,
          description: meta.description,
          icon: meta.icon,
          startIndex: index,
          endIndex: index,
        });
      }
    });

    return groups;
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
        label: isSolo
          ? 'Groceo houdt jouw persoonlijke lijst soepel draaiende'
          : 'Gedeelde lijst klaar voor je hele team',
      });
    } else {
      highlights.push({
        icon: 'clipboard-check-outline',
        label: 'We stellen een paar basisproducten voor om te starten',
      });
    }

    if (typeof cadenceAnswer === 'string' && cadenceAnswer.length > 0) {
      const cadenceTextMap: Record<string, string> = {
        weekly: 'Wekelijkse zachte reminders vóór de koelkast leeg raakt',
        biweekly: 'Seintjes om de week, precies in jouw tempo',
        monthly: 'Maandelijkse voorraadplanning zodat de planken blij blijven',
        'as-needed': 'Meteen een melding zodra favorieten bijna op zijn',
      };
      highlights.push({
        icon: 'calendar-check',
        label: cadenceTextMap[cadenceAnswer] ?? 'Persoonlijk boodschappenritme',
      });
    }

    if (typeof focusAnswer === 'string' && focusAnswer.length > 0) {
      const focusTextMap: Record<string, { icon: IconName; label: string }> = {
        'never-miss': { icon: 'bell-ring-outline', label: 'Pantry-bewaker houdt favorieten op voorraad' },
        'faster-trips': { icon: 'map-marker-radius', label: 'Winkel-slimme lijsten voor snellere trips' },
        'shared-planning': { icon: 'clipboard-plus-outline', label: 'Gezamenlijke planning binnen handbereik' },
        budget: { icon: 'chart-areaspline', label: 'Budgetvriendelijke inzichten vooraan' },
      };
      highlights.push(
        focusTextMap[focusAnswer] ?? { icon: 'star-outline', label: 'Favoriete features krijgen prioriteit' },
      );
    } else {
      highlights.push({
        icon: 'lightbulb-on-outline',
        label: 'Handige tips verschijnen terwijl je verkent',
      });
    }

    return highlights.slice(0, 3);
  }, [answers]);

  const currentStep = steps[activeIndex];
  const accentContent = resolveHeroAccents(currentStep);
  const stepCompletionStatus = steps.map((step, index) => {
    if (index < activeIndex) {
      return true;
    }

    if (index > activeIndex) {
      return false;
    }

    if (step.type === 'summary') {
      return true;
    }

    if (step.type === 'quiz') {
      return stepHasAnswer(step, answers);
    }

    return false;
  });

  const milestoneProgress = milestones.map((milestone) => {
    const totalCount = milestone.endIndex - milestone.startIndex + 1;
    const stepStatuses = stepCompletionStatus.slice(milestone.startIndex, milestone.endIndex + 1);
    const completedCount = stepStatuses.filter(Boolean).length;
    const isCompleted = activeIndex > milestone.endIndex;
    const isActive = activeIndex >= milestone.startIndex && activeIndex <= milestone.endIndex;
    const fraction = isCompleted ? 1 : Math.min(1, completedCount / totalCount);

    return {
      ...milestone,
      totalCount,
      completedCount,
      progressFraction: fraction,
      isCompleted,
      isActive,
    };
  });

  const activeMilestone = milestoneProgress.find((milestone) => milestone.isActive) ?? milestoneProgress[0];
  const totalSteps = steps.length;

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

  const goNext = () => {
    setActiveIndex((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const goBack = () => {
    setActiveIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleJumpTo = (targetIndex: number) => {
    setActiveIndex((prev) => (targetIndex < prev ? Math.max(targetIndex, 0) : prev));
  };

  const handlePrimary = () => {
    if (currentStep.type === 'summary') {
      router.replace('/(auth)/register');
      return;
    }

    if (currentStep.type === 'quiz' && !stepHasAnswer(currentStep, answers)) {
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

  const primaryDisabled = currentStep.type === 'quiz' && !stepHasAnswer(currentStep, answers);

  return (
    <LinearGradient colors={['#F6F9FF', '#FFFFFF']} style={styles.screen}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.heroSection} pointerEvents="none">
        <View style={styles.heroContent}>
          <OnboardingHero
            illustration={currentStep.illustration}
            accentContent={accentContent}
          />
        </View>
      </View>

      <View style={styles.bottomCard}>
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <View style={styles.progressTrack}>
              {milestoneProgress.map((milestone, index) => (
                <Pressable
                  key={milestone.key}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !milestone.isCompleted }}
                  disabled={!milestone.isCompleted}
                  onPress={() => handleJumpTo(milestone.startIndex)}
                  style={[
                    styles.progressSegment,
                    index !== milestoneProgress.length - 1 && styles.progressSegmentSpacing,
                  ]}>
                  <View
                    style={[
                      styles.progressSegmentFill,
                      {
                        width: `${milestone.progressFraction * 100}%`,
                        opacity: milestone.isCompleted ? 1 : 0.95,
                      },
                    ]}
                  />
                </Pressable>
              ))}
            </View>
          </View>
          <View style={styles.milestoneRow}>
            {milestoneProgress.map((milestone) => (
              <View key={milestone.key} style={styles.milestoneItem}>
                <View
                  style={[
                    styles.milestoneStatus,
                    milestone.isCompleted && styles.milestoneStatusCompleted,
                    milestone.isActive && styles.milestoneStatusActive,
                  ]}>
                  <MaterialCommunityIcons
                    name={milestone.isCompleted ? 'check' : milestone.icon}
                    size={14}
                    color={milestone.isCompleted ? colors.surface : colors.primary}
                  />
                </View>
                <Text
                  style={[
                    styles.milestoneLabel,
                    milestone.isActive && styles.milestoneLabelActive,
                  ]}>
                  {milestone.label}
                </Text>
                <View style={styles.milestoneDotRow}>
                  {Array.from({ length: milestone.totalCount }).map((_, dotIndex) => {
                    const isFilled = dotIndex < milestone.completedCount;
                    return <View key={dotIndex} style={[styles.milestoneDot, isFilled && styles.milestoneDotFilled]} />;
                  })}
                </View>
              </View>
            ))}
          </View>
          {activeMilestone?.description ? (
            <Text style={styles.milestoneDescription}>{activeMilestone.description}</Text>
          ) : null}
        </View>

        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={styles.contentScrollInner}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
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
        </ScrollView>

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
        <HeroAccentPill icon="clock-check-outline" label="Snelle gezinssetup" />
        <HeroAccentPill icon="star-circle-outline" label="Op maat voor jouw huishouden" />
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
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  heroSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  heroContent: {
    transform: [{ scale: 0.9 }],
  },
  bottomCard: {
    flex: 1,
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
  contentScroll: {
    flex: 1,
  },
  contentScrollInner: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  progressContainer: {
    gap: spacing.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressTrack: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs * 0.75,
  },
  progressSegment: {
    flex: 1,
    height: 6,
    borderRadius: radius.md,
    backgroundColor: 'rgba(148,163,184,0.2)',
    overflow: 'hidden',
  },
  progressSegmentSpacing: {
    marginRight: 0,
  },
  progressSegmentFill: {
    height: '100%',
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  milestoneRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  milestoneItem: {
    width: '32%',
    alignItems: 'center',
    gap: spacing.xs * 0.5,
  },
  milestoneStatus: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(79,70,229,0.08)',
  },
  milestoneStatusActive: {
    backgroundColor: 'rgba(79,70,229,0.18)',
  },
  milestoneStatusCompleted: {
    backgroundColor: colors.primary,
  },
  milestoneLabel: {
    ...textStyles.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  milestoneLabelActive: {
    color: colors.primaryDark,
  },
  milestoneDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs * 0.5,
  },
  milestoneDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
  },
  milestoneDotFilled: {
    backgroundColor: colors.primary,
  },
  milestoneDescription: {
    ...textStyles.caption,
    color: colors.textSecondary,
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
