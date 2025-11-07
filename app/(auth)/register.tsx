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
      toast('Supabase is niet geconfigureerd. Voeg je gegevens toe.');
      return;
    }

    const trimmedEmail = email.trim();
    console.log('[Auth] Attempting sign up', { email: trimmedEmail });

    const nextErrors: typeof errors = {};

    if (!emailPattern.test(trimmedEmail)) {
      nextErrors.email = 'Vul een geldig e-mailadres in.';
    }
    if (password.length < 6) {
      nextErrors.password = 'Het wachtwoord moet minimaal 6 tekens hebben.';
    }
    if (password !== confirmPassword) {
      nextErrors.confirmPassword = 'Wachtwoorden komen niet overeen.';
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
      toast('Registreren is niet gelukt. Probeer het opnieuw.');
      return;
    }

    console.log('[Auth] Sign up successful', { email: trimmedEmail });
    toast('Account aangemaakt! Welkom bij Groceo.');
    router.replace('/(tabs)');
  };

  return (
    <AuthScreen
      title="Maak je account aan"
      subtitle="Zet je huishoudhub klaar in slechts een paar tikken."
      learnLabel="Zo werkt Groceo"
      onPressLearn={() => router.replace('/onboarding')}
      footer={
        <View style={styles.footerCta}>
          <Text style={styles.footerText}>Heb je al een account?</Text>
          <TouchableOpacity
            style={styles.footerButton}
            onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.footerButtonText}>Inloggen</Text>
          </TouchableOpacity>
        </View>
      }>
      <TextField
        label="E-mail"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        value={email}
        onChangeText={setEmail}
        placeholder="jij@example.com"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        error={errors.email}
      />
      <TextField
        ref={passwordRef}
        label="Wachtwoord"
        secureTextEntry={!showPassword}
        value={password}
        onChangeText={setPassword}
        placeholder="Kies een wachtwoord"
        returnKeyType="next"
        onSubmitEditing={() => confirmRef.current?.focus()}
        error={errors.password}
        rightAccessory={
          <TouchableOpacity
            onPress={() => setShowPassword(prev => !prev)}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Wachtwoord verbergen' : 'Wachtwoord tonen'}>
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
        label="Bevestig wachtwoord"
        secureTextEntry={!showConfirm}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Herhaal je wachtwoord"
        error={errors.confirmPassword}
        rightAccessory={
          <TouchableOpacity
            onPress={() => setShowConfirm(prev => !prev)}
            accessibilityRole="button"
            accessibilityLabel={showConfirm ? 'Wachtwoord verbergen' : 'Wachtwoord tonen'}>
            <Feather
              name={showConfirm ? 'eye-off' : 'eye'}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        }
      />
      <Button title="Registreren" onPress={handleSubmit} loading={loading} />
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
