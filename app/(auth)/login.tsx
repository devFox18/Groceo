import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { colors, spacing, textStyles } from '@/lib/theme';
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}>
      <View style={styles.container}>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Log in to access your shared groceries.</Text>
        <View style={styles.form}>
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
          <View style={styles.forgotPassword}>
            <Text
              style={styles.forgotPasswordText}
              onPress={() => toast('Password reset will be available soon.')}>
              Forgot password?
            </Text>
          </View>
          <Button title="Log in" onPress={handleSubmit} loading={loading} />
          <Button
            title="Create an account"
            variant="ghost"
            onPress={() => router.replace('/(auth)/register')}
            disabled={loading}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.lg,
    justifyContent: 'center',
  },
  title: {
    ...textStyles.title,
    textAlign: 'center',
  },
  subtitle: {
    ...textStyles.body,
    textAlign: 'center',
    color: colors.muted,
  },
  form: {
    gap: spacing.md,
  },
  forgotPassword: {
    alignItems: 'flex-end',
  },
  forgotPasswordText: {
    color: colors.primary,
    fontWeight: '600',
  },
});
