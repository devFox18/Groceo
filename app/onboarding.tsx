import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useRef, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  View,
  ViewToken,
  useWindowDimensions,
  StatusBar,
} from 'react-native';

import { OnboardingSlide, type OnboardingIllustration } from '@/components/OnboardingSlide';
import { colors, spacing } from '@/lib/theme';

type SlideContent = {
  key: string;
  title: string;
  subtitle: string;
  illustration: OnboardingIllustration;
};

const viewabilityConfig = {
  viewAreaCoveragePercentThreshold: 60,
};

export default function OnboardingScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<SlideContent>>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const slides = useMemo<SlideContent[]>(
    () => [
      {
        key: 'plan',
        title: 'Plan smarter together',
        subtitle: 'Share one family list and keep everyone in sync before the next grocery run.',
        illustration: 'plan',
      },
      {
        key: 'shop',
        title: 'Shop faster in-store',
        subtitle: 'Check items off in real time so you can get in, out, and back to what matters.',
        illustration: 'shop',
      },
      {
        key: 'remember',
        title: 'Never forget a staple',
        subtitle: 'Groceo keeps an eye on pantry essentials and nudges you before they run low.',
        illustration: 'remember',
      },
      {
        key: 'start',
        title: 'Ready to get started?',
        subtitle: 'Create your Groceo household and start simplifying the weekly shop.',
        illustration: 'start',
      },
    ],
    []
  );

  const handleGetStarted = () => {
    router.replace('/(auth)/register');
  };

  const handleGoToLogin = () => {
    router.replace('/(auth)/login');
  };

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    }
  );

  return (
    <LinearGradient colors={['#F6F9FF', '#FFFFFF']} style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        renderItem={({ item, index }) => (
          <View style={[styles.slideContainer, { width }]}>
            <OnboardingSlide
              title={item.title}
              subtitle={item.subtitle}
              primaryLabel={index === slides.length - 1 ? 'Create an account' : undefined}
              onPrimary={index === slides.length - 1 ? handleGetStarted : undefined}
              secondaryLabel={index === slides.length - 1 ? 'I already have an account' : undefined}
              onSecondary={index === slides.length - 1 ? handleGoToLogin : undefined}
              illustration={item.illustration}
              isLast={index === slides.length - 1}
            />
          </View>
        )}
      />
      <View style={styles.dots}>
        {slides.map((slide, index) => (
          <View
            key={slide.key}
            style={[styles.dot, index === activeIndex && styles.dotActive]}
          />
        ))}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  slideContainer: {
    flex: 1,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingBottom: spacing.lg,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(148, 163, 184, 0.4)',
  },
  dotActive: {
    width: 28,
    backgroundColor: colors.primary,
  },
});
