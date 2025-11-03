import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Button } from '@/components/Button';
import { colors, radius, spacing, textStyles } from '@/lib/theme';

type Slide = {
  key: string;
  title: string;
  description?: string;
  gradient: [string, string];
  accent?: string;
  variant?: 'cta';
  illustration: 'collab' | 'inventory' | 'automation' | 'cta';
  points?: string[];
};

export default function OnboardingScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [activeSlide, setActiveSlide] = useState(0);

  const slides: Slide[] = useMemo(
    () => [
      {
        key: 'plan',
        title: 'Plan groceries as one family',
        description:
          'Everyone sees the same list, so whoever is at the store knows exactly what the family needs.',
        gradient: ['#4466FF', '#724BFF'],
        accent: 'Family lists',
        illustration: 'collab',
        points: ['Assign chores to parents or kids', 'No more double-buying snacks', 'Add notes for special cravings'],
      },
      {
        key: 'inventory',
        title: 'Keep the kitchen stocked for everyone',
        description:
          'Track staples, school lunch essentials, and party treats so the cupboards stay ready for family moments.',
        gradient: ['#FF8C68', '#FF5F87'],
        accent: 'Kitchen pulse',
        illustration: 'inventory',
        points: ['Spot low-stock breakfast items early', 'Celebrate empty-shelf wins together', 'One shared view of pantry favorites'],
      },
      {
        key: 'automate',
        title: 'Smart help for busy families',
        description:
          'Upcoming automations will remember everyone’s favorites and keep the weekly routine calm.',
        gradient: ['#29C4A5', '#71E58A'],
        accent: 'Coming soon',
        illustration: 'automation',
        points: ['Suggestions that remember picky eaters', 'Receipt scanning after big family shops', 'Gentle reminders before game night'],
      },
      {
        key: 'start',
        title: 'Ready to feed the family smarter?',
        description: 'Create a free Groceo account and keep every family grocery run in sync.',
        gradient: ['#141E30', '#243B55'],
        variant: 'cta',
        illustration: 'cta',
        points: ['Shared lists for the whole household', 'Kitchen clarity at a glance', 'Smart assistance on the way'],
      },
    ],
    []
  );

  const handleMomentumScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setActiveSlide(index);
  };

  const renderIllustration = (variant: Slide['illustration']) => {
    switch (variant) {
      case 'collab':
        return (
          <LinearGradient
            colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.05)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.illustrationCard}>
            <View style={styles.familyAvatars}>
              {['#FFD166', '#EF476F', '#06D6A0', '#118AB2'].map((color, index) => (
                <View key={color} style={[styles.avatar, { marginLeft: index === 0 ? 0 : -18 }]}>
                  <LinearGradient
                    colors={[color, `${color}DD`]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.avatarGradient}>
                    <MaterialCommunityIcons
                      name={index % 2 === 0 ? 'account-heart' : 'account-child'}
                      size={28}
                      color="#FFFFFF"
                    />
                  </LinearGradient>
                </View>
              ))}
            </View>
            <View style={styles.chatBubbles}>
              <View style={[styles.chatBubble, styles.chatBubblePrimary]}>
                <MaterialCommunityIcons name="message-text" size={16} color="#ffffff" />
                <Text style={styles.chatBubbleText}>Milk run?</Text>
              </View>
              <View style={[styles.chatBubble, styles.chatBubbleSecondary]}>
                <MaterialCommunityIcons name="message-reply" size={16} color="#ffffff" />
                <Text style={styles.chatBubbleText}>I'll grab it!</Text>
              </View>
            </View>
            <View style={styles.calendarRow}>
              <View style={styles.calendarBadge}>
                <Text style={styles.calendarDay}>Fri</Text>
                <Text style={styles.calendarDate}>18</Text>
              </View>
              <View style={styles.calendarContent}>
                <Text style={styles.calendarTitle}>Family dinner plan</Text>
                <Text style={styles.calendarSubtitle}>Add veggies & dessert</Text>
              </View>
            </View>
          </LinearGradient>
        );
      case 'inventory':
        return (
          <LinearGradient
            colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.04)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.illustrationCard}>
            <View style={styles.shelf}>
              <View style={[styles.shelfJar, styles.shelfJarOne]}>
                <MaterialCommunityIcons name="silverware-fork-knife" size={22} color="#ffffff" />
                <Text style={styles.shelfLabel}>Dinner</Text>
              </View>
              <View style={[styles.shelfJar, styles.shelfJarTwo]}>
                <MaterialCommunityIcons name="fruit-grapes-outline" size={22} color="#ffffff" />
                <Text style={styles.shelfLabel}>Snacks</Text>
              </View>
              <View style={[styles.shelfJar, styles.shelfJarThree]}>
                <MaterialCommunityIcons name="cup-water" size={22} color="#ffffff" />
                <Text style={styles.shelfLabel}>Drinks</Text>
              </View>
            </View>
            <View style={styles.stockBars}>
              <View style={styles.stockRow}>
                <Text style={styles.stockLabel}>Breakfast staples</Text>
                <View style={styles.stockBar}>
                  <View style={[styles.stockFill, { width: '80%', backgroundColor: '#FFD166' }]} />
                </View>
              </View>
              <View style={styles.stockRow}>
                <Text style={styles.stockLabel}>Lunch boxes</Text>
                <View style={styles.stockBar}>
                  <View style={[styles.stockFill, { width: '45%', backgroundColor: '#06D6A0' }]} />
                </View>
              </View>
              <View style={styles.stockRow}>
                <Text style={styles.stockLabel}>Weekend treats</Text>
                <View style={styles.stockBar}>
                  <View style={[styles.stockFill, { width: '65%', backgroundColor: '#EF476F' }]} />
                </View>
              </View>
            </View>
          </LinearGradient>
        );
      case 'automation':
        return (
          <LinearGradient
            colors={['rgba(0,0,0,0.25)', 'rgba(0,0,0,0.1)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.illustrationCard}>
            <View style={styles.timeline}>
              <View style={styles.timelinePoint}>
                <MaterialCommunityIcons name="lightbulb-on" size={28} color="#71E58A" />
                <View>
                  <Text style={styles.timelineTitle}>Smart suggestions</Text>
                  <Text style={styles.timelineSubtitle}>Groceo remembers the family faves.</Text>
                </View>
              </View>
              <View style={styles.timelinePoint}>
                <MaterialCommunityIcons name="receipt" size={28} color="#71E58A" />
                <View>
                  <Text style={styles.timelineTitle}>Snap receipts</Text>
                  <Text style={styles.timelineSubtitle}>Scan the big shop once, auto-add the rest.</Text>
                </View>
              </View>
              <View style={styles.timelinePoint}>
                <MaterialCommunityIcons name="calendar-heart" size={28} color="#71E58A" />
                <View>
                  <Text style={styles.timelineTitle}>Family reminders</Text>
                  <Text style={styles.timelineSubtitle}>Gentle nudges before the weekend rush.</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        );
      case 'cta':
        return (
          <LinearGradient
            colors={['rgba(0,0,0,0.26)', 'rgba(0,0,0,0.12)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.illustrationCard, styles.illustrationCardCTA]}>
            <View style={styles.ctaIcons}>
              <View style={[styles.ctaIconBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <MaterialCommunityIcons name="cart-heart" size={30} color="#ffffff" />
              </View>
              <View style={[styles.ctaIconBadge, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
                <MaterialCommunityIcons name="home-heart" size={30} color="#ffffff" />
              </View>
              <View style={[styles.ctaIconBadge, { backgroundColor: 'rgba(255,255,255,0.16)' }]}>
                <MaterialCommunityIcons name="bell-ring-outline" size={30} color="#ffffff" />
              </View>
            </View>
            <View style={styles.ctaCaption}>
              <MaterialCommunityIcons name="sparkles" size={18} color="#ffffff" />
              <Text style={styles.ctaCaptionText}>Built to make family food runs easy</Text>
            </View>
          </LinearGradient>
        );
      default:
        return null;
    }
  };
  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        horizontal
        pagingEnabled
        ref={scrollRef}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScroll}
        style={styles.carousel}
        contentContainerStyle={styles.carouselContent}>
        {slides.map((slide) => (
          <LinearGradient
            key={slide.key}
            colors={slide.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.slide, { width }]}>
            <View style={styles.slideHeader}>
              <View style={styles.progressPill}>
                {slides.map((progressSlide, index) => {
                  const isActive = index === activeSlide;
                  return (
                    <View
                      key={progressSlide.key}
                      style={[styles.progressDot, isActive && styles.progressDotActive]}
                    />
                  );
                })}
              </View>
            </View>
            {renderIllustration(slide.illustration)}
            <View style={styles.textGroup}>
              {slide.accent ? (
                <View style={styles.accentPill}>
                  <Text style={styles.accentText}>{slide.accent}</Text>
                </View>
              ) : null}
              <Text style={styles.title}>{slide.title}</Text>
              {slide.description ? (
                <Text style={styles.description}>{slide.description}</Text>
              ) : null}
              {slide.points ? (
                <View style={styles.pointList}>
                  {slide.points.map((point) => (
                    <View key={point} style={styles.pointRow}>
                      <MaterialCommunityIcons
                        name="check-circle-outline"
                        size={18}
                        color="rgba(255,255,255,0.9)"
                      />
                      <Text style={styles.pointText}>{point}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {slide.variant === 'cta' ? (
                <View style={styles.ctaStack}>
                  <Button title="Create a free account" onPress={() => router.push('/(auth)/register')} />
                  <Button
                    title="I already have an account"
                    variant="ghost"
                    onPress={() => router.push('/(auth)/login')}
                  />
                </View>
              ) : null}
            </View>
          </LinearGradient>
        ))}
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  carousel: {
    flex: 1,
  },
  carouselContent: {
    flexGrow: 1,
  },
  slide: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    justifyContent: 'space-between',
  },
  slideHeader: {
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  progressPill: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
    gap: spacing.xs,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  progressDotActive: {
    width: 18,
    backgroundColor: '#FFFFFF',
  },
  illustrationCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  familyAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatBubbles: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chatBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chatBubblePrimary: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  chatBubbleSecondary: {
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  chatBubbleText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  calendarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  calendarBadge: {
    width: 60,
    borderRadius: radius.md,
    backgroundColor: 'rgba(0,0,0,0.18)',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  calendarDay: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  calendarDate: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  calendarContent: {
    flex: 1,
    gap: 2,
  },
  calendarTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  calendarSubtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
  },
  shelf: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  shelfJar: {
    flex: 1,
    marginHorizontal: spacing.xs,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  shelfJarOne: {
    backgroundColor: 'rgba(255,209,102,0.28)',
  },
  shelfJarTwo: {
    backgroundColor: 'rgba(239,71,111,0.28)',
  },
  shelfJarThree: {
    backgroundColor: 'rgba(17,138,178,0.28)',
  },
  shelfLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  stockBars: {
    gap: spacing.sm,
  },
  stockRow: {
    gap: spacing.xs,
  },
  stockLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
  },
  stockBar: {
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  stockFill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  timeline: {
    gap: spacing.md,
  },
  timelinePoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  timelineTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  timelineSubtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
  },
  ctaIcons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  ctaIconBadge: {
    flex: 1,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  ctaCaption: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ctaCaptionText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  textGroup: {
    gap: spacing.md,
  },
  accentPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  accentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  title: {
    ...textStyles.title,
    color: '#FFFFFF',
    textAlign: 'left',
    fontSize: 30,
    lineHeight: 36,
  },
  description: {
    ...textStyles.body,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 17,
  },
  pointList: {
    gap: spacing.xs,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pointText: {
    ...textStyles.body,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
  },
  ctaStack: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
});
