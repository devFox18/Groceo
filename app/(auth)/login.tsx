import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Feather } from '@expo/vector-icons';

import { AuthScreen } from '@/components/AuthScreen';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { colors, radius, textStyles } from '@/lib/theme';
import { toast } from '@/utils/toast';

const emailPattern = /\S+@\S+\.\S+/;

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const handleSubmit = async () => {
    if (!isSupabaseConfigured || !supabase) {
      console.error('[Auth] Login blocked: Supabase credentials missing');
      toast('Supabase is niet geconfigureerd. Voeg je gegevens toe.');
      return;
    }

    const trimmedEmail = email.trim();
    console.log('[Auth] Attempting login', { email: trimmedEmail });

    const nextErrors: typeof errors = {};
    if (!emailPattern.test(trimmedEmail)) {
      nextErrors.email = 'Vul een geldig e-mailadres in.';
    }
    if (password.length < 6) {
      nextErrors.password = 'Het wachtwoord moet minimaal 6 tekens hebben.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      console.warn('[Auth] Login validation failed', nextErrors);
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });
    setLoading(false);

    if (error) {
      console.warn('[Auth] Login failed', { email: trimmedEmail, error: error.message });
      toast('Inloggen is niet gelukt. Controleer je gegevens.');
      return;
    }

    console.log('[Auth] Login successful', { email: trimmedEmail });
    toast('Welkom terug bij Groceo!');
    router.replace('/(tabs)');
  };

  return (
    <AuthScreen
      title="Welkom terug"
      subtitle="Log in om te zien wat je huishouden nodig heeft."
      learnLabel="Zo werkt Groceo"
      onPressLearn={() => router.replace('/onboarding')}
      footer={
        <View style={styles.footerCta}>
          <Text style={styles.footerText}>Nog geen account?</Text>
          <TouchableOpacity
            style={styles.footerButton}
            onPress={() => router.replace('/(auth)/register')}>
            <Text style={styles.footerButtonText}>Maak er een</Text>
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
        error={errors.email}
        placeholder="jij@example.com"
      />
      <TextField
        label="Wachtwoord"
        secureTextEntry={!showPassword}
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        placeholder="Je wachtwoord"
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
      <View style={styles.helperRow}>
        <TouchableOpacity onPress={() => toast('Wachtwoord herstellen kan binnenkort.')}>
          <Text style={styles.helperLink}>Wachtwoord vergeten?</Text>
        </TouchableOpacity>
      </View>
      <Button title="Inloggen" onPress={handleSubmit} loading={loading} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  helperRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  helperLink: {
    color: colors.primary,
    fontWeight: '600',
  },
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
