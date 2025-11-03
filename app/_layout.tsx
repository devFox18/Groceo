import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SUPABASE_WARNING_MESSAGE, isSupabaseConfigured } from '@/lib/supabase';
import { colors, spacing } from '@/lib/theme';
import { SessionProvider, useSession } from '@/state/sessionStore';

function SupabaseBanner() {
  if (isSupabaseConfigured) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <Text style={styles.bannerText}>{SUPABASE_WARNING_MESSAGE}</Text>
    </View>
  );
}

function LoadingScreen() {
  return (
    <View style={styles.loader}>
      <ActivityIndicator size="small" color={colors.primary} />
      <Text style={styles.loaderText}>Loading Groceo…</Text>
    </View>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const firstSegment = segments[0];
    const inAuthStack = firstSegment === '(auth)';
    const isOnboarding = firstSegment === 'onboarding';
    const inTabs = firstSegment === '(tabs)';

    if (!session) {
      if (!inAuthStack && !isOnboarding) {
        router.replace('/onboarding');
      }
      return;
    }

    if (!inTabs) {
      router.replace('/(tabs)');
    }
  }, [isLoading, session, segments, router]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <SessionProvider>
          <StatusBar style={Platform.OS === 'ios' ? 'dark' : 'auto'} />
          <AuthGate>
            <View style={styles.flex}>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="onboarding" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
              </Stack>
              <SupabaseBanner />
            </View>
          </AuthGate>
        </SessionProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  banner: {
    backgroundColor: colors.secondary,
    padding: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: {
    color: colors.dark,
    fontWeight: '600',
    textAlign: 'center',
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background,
  },
  loaderText: {
    color: colors.muted,
  },
});
