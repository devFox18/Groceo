import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { Feather } from '@expo/vector-icons';

import { AuthScreen } from '@/components/AuthScreen';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { colors, radius, textStyles } from '@/lib/theme';
import { toast } from '@/utils/toast';

const emailPattern = /\S+@\S+\.\S+/;

type RoleOptionProps = {
  title: string;
  description: string;
  active: boolean;
  onPress: () => void;
};

export default function RegisterScreen() {
  const router = useRouter();
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [role, setRole] = useState<'owner' | 'member'>('owner');
  const [householdName, setHouseholdName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [errors, setErrors] = useState<{
    email?: string;
    fullName?: string;
    password?: string;
    confirmPassword?: string;
    householdName?: string;
    inviteCode?: string;
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

    if (!fullName.trim()) {
      nextErrors.fullName = 'Vul je naam in.';
    } else if (fullName.trim().length < 2) {
      nextErrors.fullName = 'Naam is te kort.';
    }
    if (!emailPattern.test(trimmedEmail)) {
      nextErrors.email = 'Vul een geldig e-mailadres in.';
    }
    if (password.length < 6) {
      nextErrors.password = 'Het wachtwoord moet minimaal 6 tekens hebben.';
    }
    if (password !== confirmPassword) {
      nextErrors.confirmPassword = 'Wachtwoorden komen niet overeen.';
    }
    if (role === 'owner' && householdName.trim().length < 3) {
      nextErrors.householdName = 'Geef je huishouden een naam (minimaal 3 tekens).';
    }
    if (role === 'member' && inviteCode.trim().length < 4) {
      nextErrors.inviteCode = 'Vul de gezin-code of uitnodiging in.';
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
      options: {
        data: {
          full_name: fullName.trim(),
        },
      },
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
        label="Naam"
        value={fullName}
        onChangeText={setFullName}
        placeholder="Bijv. Sara Janssen"
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
        error={errors.fullName}
      />
      <TextField
        ref={emailRef}
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
      <View style={styles.roleGrid}>
        <RoleOption
          title="Ik start een nieuw huishouden"
          description="Ik beheer Groceo en nodig mijn gezin later uit."
          active={role === 'owner'}
          onPress={() => setRole('owner')}
        />
        <RoleOption
          title="Ik sluit me aan bij een gezin"
          description="Ik heb al een uitnodiging of code om mee te doen."
          active={role === 'member'}
          onPress={() => setRole('member')}
        />
      </View>
      {role === 'owner' ? (
        <TextField
          label="Naam van je huishouden"
          value={householdName}
          onChangeText={setHouseholdName}
          placeholder="Bijv. Familie Janssen"
          error={errors.householdName}
        />
      ) : (
        <TextField
          label="Gezin-code of uitnodiging"
          value={inviteCode}
          onChangeText={setInviteCode}
          placeholder="Bijv. GROCEO-TEAM"
          error={errors.inviteCode}
        />
      )}
      <Button title="Registreren" onPress={handleSubmit} loading={loading} />
    </AuthScreen>
  );
}

function RoleOption({ title, description, active, onPress }: RoleOptionProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.roleOption,
        active && styles.roleOptionActive,
        pressed && styles.roleOptionPressed,
      ]}>
      <View style={styles.roleOptionDot} />
      <View style={styles.roleOptionCopy}>
        <Text style={[styles.roleOptionTitle, active && styles.roleOptionTitleActive]}>{title}</Text>
        <Text style={styles.roleOptionDescription}>{description}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  roleGrid: {
    gap: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  roleOptionActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(61,220,132,0.12)',
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  roleOptionPressed: {
    opacity: 0.9,
  },
  roleOptionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  roleOptionCopy: {
    flex: 1,
    gap: 4,
  },
  roleOptionTitle: {
    ...textStyles.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  roleOptionTitleActive: {
    color: colors.primaryDark,
  },
  roleOptionDescription: {
    ...textStyles.caption,
    color: colors.textSecondary,
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
