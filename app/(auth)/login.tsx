import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthScreen } from '@/components/AuthScreen';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { colors, textStyles } from '@/lib/theme';
import { toast } from '@/utils/toast';

const emailPattern = /\S+@\S+\.\S+/;

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const handleSubmit = async () => {
    if (!isSupabaseConfigured || !supabase) {
      toast('Supabase is not configured. Please add your credentials.');
      return;
    }

    const nextErrors: typeof errors = {};
    if (!emailPattern.test(email.trim())) {
      nextErrors.email = 'Enter a valid email address.';
    }
    if (password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (error) {
      toast('Failed to sign in. Please check your credentials.');
      return;
    }

    toast('Welcome back to Groceo!');
    router.replace('/(tabs)');
  };

  return (
    <AuthScreen
      title="Welcome back"
      subtitle="Log in to see what the household needs next."
      footer={
        <Text style={styles.footerText}>
          Need an account?{' '}
          <Text
            style={styles.footerLink}
            onPress={() => router.replace('/(auth)/register')}>
            Create one
          </Text>
        </Text>
      }>
      <TextField
        label="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        placeholder="you@example.com"
      />
      <TextField
        label="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        placeholder="Your password"
      />
      <View style={styles.inlineActions}>
        <Text
          style={styles.inlineLink}
          onPress={() => toast('Password reset will be available soon.')}>
          Forgot password?
        </Text>
        <Text style={styles.inlineLink} onPress={() => toast('Magic link coming soon!')}>
          Email me a magic link
        </Text>
      </View>
      <Button title="Log in" onPress={handleSubmit} loading={loading} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  inlineActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  inlineLink: {
    color: colors.primary,
    fontWeight: '600',
  },
  footerText: {
    ...textStyles.body,
    color: colors.muted,
  },
  footerLink: {
    color: colors.primary,
    fontWeight: '700',
  },
});
