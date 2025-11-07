import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { Feather } from '@expo/vector-icons';

import { AuthScreen } from '@/components/AuthScreen';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { colors, radius, textStyles } from '@/lib/theme';
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const handleSubmit = async () => {
    if (!isSupabaseConfigured || !supabase) {
      console.error('[Auth] Sign up blocked: Supabase credentials missing');
      toast('Supabase is not configured. Please add your credentials.');
      return;
    }

    const trimmedEmail = email.trim();
    console.log('[Auth] Attempting sign up', { email: trimmedEmail });

    const nextErrors: typeof errors = {};

    if (!emailPattern.test(trimmedEmail)) {
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
      console.warn('[Auth] Sign up validation failed', nextErrors);
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
    });
    setLoading(false);

    if (error) {
      console.error('[Auth] Sign up failed', { email: trimmedEmail, error: error.message });
      toast('Failed to sign up. Please try again.');
      return;
    }

    console.log('[Auth] Sign up successful', { email: trimmedEmail });
    toast('Account created! Welcome to Groceo.');
    router.replace('/(tabs)');
  };

  return (
    <AuthScreen
      title="Create your account"
      subtitle="Set up your household hub in just a couple of taps."
      learnLabel="How Groceo works"
      onPressLearn={() => router.replace('/onboarding')}
      footer={
        <View style={styles.footerCta}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <TouchableOpacity
            style={styles.footerButton}
            onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.footerButtonText}>Log in</Text>
          </TouchableOpacity>
        </View>
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
        secureTextEntry={!showPassword}
        value={password}
        onChangeText={setPassword}
        placeholder="Create a password"
        returnKeyType="next"
        onSubmitEditing={() => confirmRef.current?.focus()}
        error={errors.password}
        rightAccessory={
          <TouchableOpacity
            onPress={() => setShowPassword(prev => !prev)}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}>
            <Feather
              name={showPassword ? 'eye-off' : 'eye'}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        }
      />
      <TextField
        ref={confirmRef}
        label="Confirm password"
        secureTextEntry={!showConfirm}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Repeat your password"
        error={errors.confirmPassword}
        rightAccessory={
          <TouchableOpacity
            onPress={() => setShowConfirm(prev => !prev)}
            accessibilityRole="button"
            accessibilityLabel={showConfirm ? 'Hide password' : 'Show password'}>
            <Feather
              name={showConfirm ? 'eye-off' : 'eye'}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        }
      />
      <Button title="Sign up" onPress={handleSubmit} loading={loading} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  footerCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  footerText: {
    ...textStyles.body,
    color: colors.surface,
    fontWeight: '500',
  },
  footerButton: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 12,
    elevation: 6,
  },
  footerButtonText: {
    ...textStyles.body,
    fontWeight: '700',
    color: colors.primaryDark,
  },
});
