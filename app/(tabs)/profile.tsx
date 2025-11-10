import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { colors, radius, spacing, textStyles } from '@/lib/theme';
import { useActiveHousehold, useSession, useSessionStore } from '@/state/sessionStore';
import { logSupabaseError } from '@/utils/logging';
import { toast } from '@/utils/toast';

type Household = {
  id: string;
  name: string;
};

export default function ProfileScreen() {
  const { session } = useSession();
  const { activeHouseholdId, setActiveHouseholdId } = useActiveHousehold();
  const setSessionState = useSessionStore((state) => state.setState);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);
  const [newHouseholdName, setNewHouseholdName] = useState('');
  const [creating, setCreating] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [fullName, setFullName] = useState('');
  const [updatingName, setUpdatingName] = useState(false);

  const loadHouseholds = useCallback(async () => {
    if (!session) {
      setLoading(false);
      return;
    }
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('members')
      .select('household_id, households(id, name)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: true });

    if (error) {
      toast('Huishoudens laden is niet gelukt.');
      setHouseholds([]);
      setLoading(false);
      return;
    }

    const mapped =
      data?.flatMap((row) => {
        const household = row.households as { id: string; name: string } | null;
        return household ? [{ id: household.id, name: household.name }] : [];
      }) ?? [];

    setHouseholds(mapped);
    if (!activeHouseholdId && mapped[0]) {
      setActiveHouseholdId(mapped[0].id);
    }
    setLoading(false);
  }, [session, activeHouseholdId, setActiveHouseholdId]);

  useEffect(() => {
    void loadHouseholds();
  }, [loadHouseholds]);

  useEffect(() => {
    const active = households.find((household) => household.id === activeHouseholdId);
    setRenameValue(active?.name ?? '');
  }, [households, activeHouseholdId]);

  useEffect(() => {
    const metadataName = (session?.user?.user_metadata?.full_name as string | undefined)?.trim() ?? '';
    setFullName(metadataName);
  }, [session?.user?.user_metadata?.full_name]);

  const handleSelectHousehold = (id: string) => {
    setActiveHouseholdId(id);
    toast('Actief huishouden bijgewerkt.');
  };

  const handleCreateHousehold = async () => {
    if (!session) return;
    if (!isSupabaseConfigured || !supabase) {
      toast('Supabase is niet geconfigureerd. Voeg je gegevens toe.');
      return;
    }
    if (!newHouseholdName.trim()) {
      toast('Naam van het huishouden is verplicht.');
      return;
    }

    setCreating(true);

    const trimmedName = newHouseholdName.trim();

    const { data: createdHousehold, error: householdError } = await supabase
      .from('households')
      .insert({
        name: trimmedName,
        owner_id: session.user.id,
      })
      .select()
      .single();

    if (householdError || !createdHousehold) {
      logSupabaseError('households.insert', householdError, {
        screen: 'Profile',
        userId: session.user.id,
        householdName: trimmedName,
        hasData: Boolean(createdHousehold),
      });
      toast('Huishouden kon niet worden aangemaakt.');
      setCreating(false);
      return;
    }

    const { error: memberError } = await supabase.from('members').insert({
      user_id: session.user.id,
      household_id: createdHousehold.id,
      role: 'owner',
    });

    if (memberError) {
      logSupabaseError('members.insert', memberError, {
        screen: 'Profile',
        userId: session.user.id,
        householdId: createdHousehold.id,
      });
      toast('Lid worden van het huishouden is niet gelukt.');
      setCreating(false);
      return;
    }

    const { error: listError } = await supabase.from('lists').insert({
      household_id: createdHousehold.id,
      name: 'Hoofdlijst',
    });

    if (listError) {
      logSupabaseError('lists.insert', listError, {
        screen: 'Profile',
        userId: session.user.id,
        householdId: createdHousehold.id,
      });
      toast('Standaardlijst aanmaken is niet gelukt.');
      setCreating(false);
      return;
    }

    const nextHouseholds = [...households, { id: createdHousehold.id, name: createdHousehold.name }];
    setHouseholds(nextHouseholds);
    setActiveHouseholdId(createdHousehold.id);
    setNewHouseholdName('');
    setCreating(false);
    toast('Huishouden is aangemaakt.');
  };

  const handleRenameHousehold = async () => {
    if (!session || !activeHouseholdId) {
      toast('Selecteer eerst een huishouden.');
      return;
    }
    if (!isSupabaseConfigured || !supabase) {
      toast('Supabase is niet geconfigureerd. Voeg je gegevens toe.');
      return;
    }
    const trimmedName = renameValue.trim();
    if (!trimmedName) {
      toast('Naam van het huishouden is verplicht.');
      return;
    }

    setRenaming(true);
    console.log('[Profile] Updating household name', {
      householdId: activeHouseholdId,
      userId: session.user.id,
      nextName: trimmedName,
    });

    const { error } = await supabase
      .from('households')
      .update({ name: trimmedName })
      .eq('id', activeHouseholdId);

    if (error) {
      logSupabaseError('households.update', error, {
        screen: 'Profile',
        userId: session.user.id,
        householdId: activeHouseholdId,
      });
      toast('Naam bijwerken is niet gelukt.');
      setRenaming(false);
      return;
    }

    setHouseholds((prev) =>
      prev.map((household) =>
        household.id === activeHouseholdId ? { ...household, name: trimmedName } : household,
      ),
    );
    console.log('[Profile] Household name updated successfully', {
      householdId: activeHouseholdId,
      nextName: trimmedName,
    });
    toast('Huishouden bijgewerkt.');
    setRenaming(false);
  };

  const handleUpdateProfileName = async () => {
    if (!session) {
      toast('Log in om je naam te wijzigen.');
      return;
    }
    if (!isSupabaseConfigured || !supabase) {
      toast('Supabase is niet geconfigureerd. Voeg je gegevens toe.');
      return;
    }
    const trimmed = fullName.trim();
    if (!trimmed) {
      toast('Naam is verplicht.');
      return;
    }
    setUpdatingName(true);
    const { data, error } = await supabase.auth.updateUser({
      data: { full_name: trimmed },
    });
    if (error || !data?.user) {
      logSupabaseError('auth.updateUser', error, {
        screen: 'Profile',
        userId: session.user.id,
      });
      toast('Naam opslaan is niet gelukt.');
      setUpdatingName(false);
      return;
    }
    if (session) {
      setSessionState({
        session: {
          ...session,
          user: data.user,
        },
      });
    }
    toast('Naam opgeslagen.');
    setUpdatingName(false);
  };

  const handleSignOut = async () => {
    if (!supabase || !isSupabaseConfigured) {
      console.error('[Auth] Logout blocked: Supabase not available');
      return;
    }
    console.log('[Auth] Attempting logout', { userId: session?.user.id });
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('[Auth] Logout failed', { userId: session?.user.id, error: error.message });
      toast('Uitloggen is niet gelukt. Probeer het opnieuw.');
      return;
    }
    console.log('[Auth] Logout successful', { userId: session?.user.id });
  };

  if (!session) {
    return (
      <View style={[styles.flex, styles.center]}>
        <Text style={styles.muted}>Log in om je profiel te beheren.</Text>
      </View>
    );
  }

  if (!isSupabaseConfigured || !supabase) {
    return (
      <View style={[styles.flex, styles.center]}>
        <Text style={styles.muted}>
          Supabase is niet geconfigureerd. Voeg gegevens toe om profielopties te gebruiken.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Profiel</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account</Text>
        <Text style={styles.label}>E-mail</Text>
        <Text style={styles.value}>{session.user.email}</Text>
        <View style={styles.nameForm}>
          <TextField
            label="Naam"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Bijv. Sara Janssen"
          />
          <Button title="Naam opslaan" onPress={handleUpdateProfileName} loading={updatingName} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Huishoudens</Text>
        {loading ? (
          <Text style={styles.muted}>Huishoudens worden geladen…</Text>
        ) : households.length === 0 ? (
          <Text style={styles.muted}>Je maakt nog geen deel uit van een huishouden.</Text>
        ) : (
          <View style={styles.householdList}>
            {households.map((household) => {
              const isActive = household.id === activeHouseholdId;
              return (
                <Pressable
                  key={household.id}
                  onPress={() => handleSelectHousehold(household.id)}
                  style={[styles.householdItem, isActive && styles.householdItemActive]}>
                  <Text
                    style={[styles.householdName, isActive && styles.householdNameActive]}>
                    {household.name}
                  </Text>
                  {isActive ? <Text style={styles.activeTag}>Actief</Text> : null}
                </Pressable>
              );
            })}
          </View>
        )}
        <View style={styles.newHouseholdForm}>
          <TextField
            label="Huishouden aanmaken"
            value={newHouseholdName}
            onChangeText={setNewHouseholdName}
            placeholder="Bijv. Appartement centrum"
          />
          <Button
            title="Aanmaken"
            onPress={handleCreateHousehold}
            loading={creating}
            disabled={creating}
          />
        </View>
        {activeHouseholdId && households.length > 0 ? (
          <View style={styles.renameForm}>
            <TextField
              label="Naam aanpassen"
              value={renameValue}
              onChangeText={setRenameValue}
              placeholder="Bijv. Familie Jansen"
            />
            <Button
              title="Opslaan"
              onPress={handleRenameHousehold}
              loading={renaming}
              disabled={renaming || !renameValue.trim()}
            />
          </View>
        ) : null}
      </View>

      <Button title="Uitloggen" variant="ghost" onPress={handleSignOut} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  muted: {
    ...textStyles.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  heading: {
    ...textStyles.title,
  },
  card: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.lg,
    gap: spacing.md,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  label: {
    fontSize: 14,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  value: {
    ...textStyles.body,
  },
  householdList: {
    gap: spacing.sm,
  },
  householdItem: {
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  householdItemActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(61, 220, 132, 0.12)',
  },
  householdName: {
    fontWeight: '600',
    color: colors.textPrimary,
  },
  householdNameActive: {
    color: colors.primary,
  },
  activeTag: {
    marginTop: spacing.xs,
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  newHouseholdForm: {
    gap: spacing.sm,
  },
  renameForm: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  nameForm: {
    gap: spacing.sm,
  },
});
