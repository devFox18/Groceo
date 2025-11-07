import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { colors, radius, spacing, textStyles } from '@/lib/theme';
import { useActiveHousehold, useSession } from '@/state/sessionStore';
import { logSupabaseError } from '@/utils/logging';
import { toast } from '@/utils/toast';

type Household = {
  id: string;
  name: string;
};

export default function ProfileScreen() {
  const { session } = useSession();
  const { activeHouseholdId, setActiveHouseholdId } = useActiveHousehold();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);
  const [newHouseholdName, setNewHouseholdName] = useState('');
  const [creating, setCreating] = useState(false);

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
      toast('Unable to load households.');
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

  const handleSelectHousehold = (id: string) => {
    setActiveHouseholdId(id);
    toast('Active household updated.');
  };

  const handleCreateHousehold = async () => {
    if (!session) return;
    if (!isSupabaseConfigured || !supabase) {
      toast('Supabase is not configured. Please add your credentials.');
      return;
    }
    if (!newHouseholdName.trim()) {
      toast('Household name is required.');
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
      toast('Failed to create household.');
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
      toast('Failed to join household.');
      setCreating(false);
      return;
    }

    const { error: listError } = await supabase.from('lists').insert({
      household_id: createdHousehold.id,
      name: 'Main list',
    });

    if (listError) {
      logSupabaseError('lists.insert', listError, {
        screen: 'Profile',
        userId: session.user.id,
        householdId: createdHousehold.id,
      });
      toast('Failed to create default list.');
      setCreating(false);
      return;
    }

    const nextHouseholds = [...households, { id: createdHousehold.id, name: createdHousehold.name }];
    setHouseholds(nextHouseholds);
    setActiveHouseholdId(createdHousehold.id);
    setNewHouseholdName('');
    setCreating(false);
    toast('Household created successfully.');
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
      toast('Failed to sign out. Please try again.');
      return;
    }
    console.log('[Auth] Logout successful', { userId: session?.user.id });
  };

  if (!session) {
    return (
      <View style={[styles.flex, styles.center]}>
        <Text style={styles.muted}>Sign in to manage your profile.</Text>
      </View>
    );
  }

  if (!isSupabaseConfigured || !supabase) {
    return (
      <View style={[styles.flex, styles.center]}>
        <Text style={styles.muted}>
          Supabase is not configured. Add credentials to enable profile features.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Profile</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account</Text>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{session.user.email}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Households</Text>
        {loading ? (
          <Text style={styles.muted}>Loading households…</Text>
        ) : households.length === 0 ? (
          <Text style={styles.muted}>You are not part of any household yet.</Text>
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
                  {isActive ? <Text style={styles.activeTag}>Active</Text> : null}
                </Pressable>
              );
            })}
          </View>
        )}
        <View style={styles.newHouseholdForm}>
          <TextField
            label="Create household"
            value={newHouseholdName}
            onChangeText={setNewHouseholdName}
            placeholder="E.g. Downtown loft"
          />
          <Button
            title="Create"
            onPress={handleCreateHousehold}
            loading={creating}
            disabled={creating}
          />
        </View>
      </View>

      <Button title="Log out" variant="ghost" onPress={handleSignOut} />
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
});
