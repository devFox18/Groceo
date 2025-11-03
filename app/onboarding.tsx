import { useRouter } from 'expo-router';
import { Image, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { colors, radius, spacing, textStyles } from '@/lib/theme';

export default function OnboardingScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>G</Text>
        </View>
        <Text style={styles.title}>Groceo</Text>
        <Text style={styles.subtitle}>Your groceries, simplified.</Text>
      </View>
      <View style={styles.actions}>
        <Button title="Log in" onPress={() => router.push('/(auth)/login')} />
        <Button
          title="Sign up"
          onPress={() => router.push('/(auth)/register')}
          variant="ghost"
        />
      </View>
      <Image
        source={require('@/assets/images/partial-react-logo.png')}
        style={styles.backgroundGraphic}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'space-between',
    backgroundColor: colors.background,
  },
  hero: {
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  title: {
    ...textStyles.title,
    textAlign: 'center',
  },
  subtitle: {
    ...textStyles.subtitle,
    textAlign: 'center',
    color: colors.muted,
  },
  actions: {
    gap: spacing.sm,
  },
  backgroundGraphic: {
    alignSelf: 'center',
    width: 160,
    height: 120,
    opacity: 0.1,
    marginBottom: spacing.xl,
    transform: [{ rotate: '-8deg' }],
  },
});
