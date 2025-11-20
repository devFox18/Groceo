import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';

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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [newHouseholdName, setNewHouseholdName] = useState('');
  const [creating, setCreating] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [fullName, setFullName] = useState('');
  const [updatingName, setUpdatingName] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const displayName = useMemo(() => {
    const clean = fullName.trim();
    if (clean) return clean.split(' ')[0];
    const metaName =
      (session?.user?.user_metadata?.full_name as string | undefined)?.trim() ?? '';
    if (metaName) return metaName.split(' ')[0];
    const emailName = session?.user?.email?.split('@')[0];
    return emailName ?? 'familie';
  }, [fullName, session?.user?.user_metadata?.full_name, session?.user?.email]);

  const activeHouseholdName = useMemo(
    () => households.find((household) => household.id === activeHouseholdId)?.name ?? null,
    [households, activeHouseholdId],
  );

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
    setLoadError(null);
    const { data, error } = await supabase
      .from('members')
      .select('household_id, households(id, name)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: true });

    if (error) {
      toast('Huishoudens laden is niet gelukt.');
      setHouseholds([]);
      setLoading(false);
      setLoadError(error.message);
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
    setSigningOut(true);
    console.log('[Auth] Attempting logout', { userId: session?.user.id });
    const { error } = await supabase.auth.signOut();
    setSigningOut(false);
    if (error) {
      console.error('[Auth] Logout failed', { userId: session?.user.id, error: error.message });
      toast('Uitloggen is niet gelukt. Probeer het opnieuw.');
      return;
    }
    console.log('[Auth] Logout successful', { userId: session?.user.id });
  };

  if (!session) {
    return (
      <SafeAreaView style={[styles.flex, styles.center]}>
        <Text style={styles.muted}>Log in om je profiel te beheren.</Text>
      </SafeAreaView>
    );
  }

  if (!isSupabaseConfigured || !supabase) {
    return (
      <SafeAreaView style={[styles.flex, styles.center]}>
        <Text style={styles.muted}>
          Supabase is niet geconfigureerd. Voeg gegevens toe om profielopties te gebruiken.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await loadHouseholds();
              setRefreshing(false);
            }}
            tintColor={colors.primary}
          />
        }>
        <LinearGradient colors={['#1B5E20', '#0F3815']} style={styles.hero}>
          <View style={styles.heroChipRow}>
            <View style={styles.heroChip}>
              <Feather name="user" color={colors.surface} size={14} />
              <Text style={styles.heroChipText}>{displayName}</Text>
            </View>
            <View style={styles.heroChip}>
              <Feather name="mail" color={colors.surface} size={14} />
              <Text style={styles.heroChipText} numberOfLines={1}>
                {session.user.email}
              </Text>
            </View>
            {activeHouseholdName ? (
              <View style={styles.heroChip}>
                <Feather name="home" color={colors.surface} size={14} />
                <Text style={styles.heroChipText} numberOfLines={1}>
                  {activeHouseholdName}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.heroEyebrow}>Profiel</Text>
          <Text style={styles.heroTitle}>Welkom terug, {displayName} 👋</Text>
          <Text style={styles.heroSubtitle}>Beheer je account, huishouden en toegang.</Text>
          <View style={styles.heroMiniGrid}>
            <View style={styles.heroMiniCard}>
              <Text style={styles.heroMiniLabel}>Huishoudens</Text>
              <Text style={styles.heroMiniValue}>
                {loading ? '…' : households.length || '—'}
              </Text>
              <Text style={styles.heroMiniDetail}>
                {households.length ? 'Gekoppelde huishoudens' : 'Nog geen huishoudens'}
              </Text>
            </View>
            <View style={styles.heroMiniCard}>
              <Text style={styles.heroMiniLabel}>Actief</Text>
              <Text style={styles.heroMiniValue}>{loading ? '…' : activeHouseholdName ?? 'Geen'}</Text>
              <Text style={styles.heroMiniDetail}>Gebruik de lijst en taken in dit huishouden</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Huishouden</Text>
            <Text style={styles.sectionHint}>Kies, hernoem of maak een huishouden aan</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Jouw huishoudens</Text>
            {loading ? (
              <Text style={styles.muted}>Huishoudens worden geladen…</Text>
            ) : loadError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>
                  Laden mislukt. Controleer je verbinding of probeer opnieuw.
                </Text>
                <Button title="Opnieuw laden" onPress={loadHouseholds} variant="ghost" />
              </View>
            ) : households.length === 0 ? (
              <Text style={styles.muted}>Je maakt nog geen deel uit van een huishouden.</Text>
            ) : (
              <View style={styles.householdList}>
                {households.map((household) => {
                  const isActive = household.id === activeHouseholdId;
                  return (
                    <Pressable
                      key={household.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Selecteer huishouden ${household.name}`}
                      onPress={() => handleSelectHousehold(household.id)}
                      style={[styles.householdItem, isActive && styles.householdItemActive]}>
                      <View style={styles.householdRow}>
                        <View style={styles.householdTextCol}>
                          <Text
                            style={[styles.householdName, isActive && styles.householdNameActive]}>
                            {household.name}
                          </Text>
                          <Text style={styles.householdMeta}>
                            {isActive ? 'Actief' : 'Tik om actief te maken'}
                          </Text>
                        </View>
                        {isActive ? <Feather name="check-circle" size={18} color={colors.primary} /> : <Feather name="circle" size={18} color={colors.border} />}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
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
            <View style={styles.inlineDivider} />
            <View style={styles.newHouseholdForm}>
              <TextField
                label="Nieuw huishouden"
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
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Account</Text>
            <Text style={styles.sectionHint}>Naam en e-mail beheren</Text>
          </View>
          <View style={styles.card}>
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
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Acties</Text>
            <Text style={styles.sectionHint}>Beveiliging en sessie</Text>
          </View>
          <View style={styles.card}>
            <Button title="Uitloggen" variant="ghost" onPress={handleSignOut} loading={signingOut} disabled={signingOut} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
    gap: spacing.xl,
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
  hero: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  heroChipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    flexShrink: 1,
  },
  heroChipText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 140,
  },
  heroEyebrow: {
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 12,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.surface,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 16,
    lineHeight: 22,
  },
  heroMiniGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  heroMiniCard: {
    flex: 1,
    minWidth: 140,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.12)',
    padding: spacing.md,
    gap: spacing.xs / 2,
  },
  heroMiniLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },
  heroMiniValue: {
    color: colors.surface,
    fontSize: 18,
    fontWeight: '700',
  },
  heroMiniDetail: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
  },
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  sectionTitle: {
    ...textStyles.subtitle,
    fontSize: 20,
    fontWeight: '700',
  },
  sectionHint: {
    ...textStyles.caption,
    textAlign: 'right',
    flex: 1,
    flexShrink: 1,
  },
  card: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.lg,
    gap: spacing.md,
    shadowColor: '#00000012',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
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
  householdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  householdTextCol: {
    gap: spacing.xs / 2,
  },
  householdName: {
    fontWeight: '600',
    color: colors.textPrimary,
  },
  householdNameActive: {
    color: colors.primary,
  },
  householdMeta: {
    color: colors.textSecondary,
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
  inlineDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginVertical: spacing.sm,
  },
  errorBox: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255, 92, 92, 0.08)',
    gap: spacing.sm,
  },
  errorText: {
    color: colors.error,
    ...textStyles.body,
  },
});
