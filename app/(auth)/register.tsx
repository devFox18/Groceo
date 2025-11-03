import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { AuthScreen } from '@/components/AuthScreen';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { colors, textStyles } from '@/lib/theme';
import { toast } from '@/utils/toast';

const emailPattern = /\S+@\S+\.\S+/;

export default function RegisterScreen() {
  const router = useRouter();
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

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
    if (password !== confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (error) {
      toast('Failed to sign up. Please try again.');
      return;
    }

    toast('Account created! Welcome to Groceo.');
    router.replace('/(tabs)');
  };

  return (
    <AuthScreen
      title="Create your account"
      subtitle="Set up your household hub in just a couple of taps."
      footer={
        <Text style={styles.footerText}>
          Already have an account?{' '}
          <Text
            style={styles.footerLink}
            onPress={() => router.replace('/(auth)/login')}>
            Log in
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
        placeholder="you@example.com"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        error={errors.email}
      />
      <TextField
        ref={passwordRef}
        label="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        placeholder="Create a password"
        returnKeyType="next"
        onSubmitEditing={() => confirmRef.current?.focus()}
        error={errors.password}
      />
      <TextField
        ref={confirmRef}
        label="Confirm password"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Repeat your password"
        error={errors.confirmPassword}
      />
      <View style={styles.passwordHint}>
        <View style={styles.dot} />
        <Text style={styles.passwordHintText}>
          Use at least 6 characters to keep your list secure.
        </Text>
      </View>
      <Button title="Sign up" onPress={handleSubmit} loading={loading} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  passwordHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  passwordHintText: {
    ...textStyles.caption,
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
