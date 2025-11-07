import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SUPABASE_WARNING_MESSAGE, isSupabaseConfigured, supabase } from '@/lib/supabase';
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
  const bootLoggedRef = useRef(false);

  useEffect(() => {
    if (isLoading || bootLoggedRef.current) {
      return;
    }
    bootLoggedRef.current = true;
    console.log('✅ [App] Groceo boot complete', {
      hasSession: Boolean(session),
      platform: Platform.OS,
    });

    if (!isSupabaseConfigured || !supabase) {
      console.info('[Supabase] Connectivity check skipped: client not configured.');
      return;
    }

    console.log('🔍 [Supabase] Checking connectivity…');
    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error('[Supabase] Connectivity check failed', {
          message: error.message,
          code: error.code,
        });
        return;
      }
      console.log('📡 [Supabase] Connectivity confirmed', {
        authenticated: Boolean(data.session),
        userId: data.session?.user?.id ?? null,
      });
    });
  }, [isLoading, session]);

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
    backgroundColor: colors.accent,
    padding: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: {
    color: colors.textPrimary,
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
    color: colors.textSecondary,
  },
});
