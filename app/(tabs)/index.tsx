import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { GroceryItem, ItemRow } from '@/components/ItemRow';
import { TextField } from '@/components/TextField';
import { useRealtimeList } from '@/hooks/useRealtimeList';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { colors, radius, spacing, textStyles } from '@/lib/theme';
import { useActiveHousehold, useSession } from '@/state/sessionStore';
import { toast } from '@/utils/toast';

type Household = {
  id: string;
  name: string;
};

type List = {
  id: string;
  name: string;
};

export default function HomeScreen() {
  const { session } = useSession();
  const { activeHouseholdId, setActiveHouseholdId } = useActiveHousehold();
  const [loadingContext, setLoadingContext] = useState(true);
  const [household, setHousehold] = useState<Household | null>(null);
  const [list, setList] = useState<List | null>(null);
  const [householdName, setHouseholdName] = useState('');
  const [creatingHousehold, setCreatingHousehold] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemQuantity, setItemQuantity] = useState('1');
  const [submittingItem, setSubmittingItem] = useState(false);

  const { items, isLoading: itemsLoading, error: realtimeError, refetch } = useRealtimeList(
    list?.id ?? null
  );

  const loadContext = useCallback(async () => {
    if (!session) {
      setLoadingContext(false);
      return;
    }
    if (!isSupabaseConfigured || !supabase) {
      setLoadingContext(false);
      return;
    }

    setLoadingContext(true);
    const { data: memberships, error } = await supabase
      .from('members')
      .select('household_id, households(id, name)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: true });

    if (error) {
      toast('Failed to load household information.');
      setLoadingContext(false);
      return;
    }

    const membershipsWithHouseholds =
      memberships?.filter((member) => member.households) ?? [];

    if (membershipsWithHouseholds.length === 0) {
      setHousehold(null);
      setList(null);
      setActiveHouseholdId(null);
      setLoadingContext(false);
      return;
    }

    const selectedMembership =
      membershipsWithHouseholds.find(
        (member) => (member.households as { id: string }).id === activeHouseholdId
      ) ?? membershipsWithHouseholds[0];

    const householdData = selectedMembership.households as { id: string; name: string } | null;
    if (!householdData) {
      setHousehold(null);
      setList(null);
      setActiveHouseholdId(null);
      setLoadingContext(false);
      return;
    }

    setActiveHouseholdId(householdData.id);
    setHousehold({ id: householdData.id, name: householdData.name });

    const { data: lists, error: listError } = await supabase
      .from('lists')
      .select('id, name')
      .eq('household_id', householdData.id)
      .order('created_at', { ascending: true });

    if (listError) {
      toast('Failed to load grocery lists.');
      setList(null);
      setLoadingContext(false);
      return;
    }

    if (!lists || lists.length === 0) {
      const { data: createdList, error: createListError } = await supabase
        .from('lists')
        .insert({ household_id: householdData.id, name: 'Main list' })
        .select()
        .single();

      if (createListError || !createdList) {
        toast('Failed to create the default list.');
        setList(null);
        setLoadingContext(false);
        return;
      }

      setList({ id: createdList.id, name: createdList.name });
    } else {
      setList({ id: lists[0].id, name: lists[0].name });
    }

    setLoadingContext(false);
  }, [session, activeHouseholdId, setActiveHouseholdId]);

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  const handleCreateHousehold = useCallback(async () => {
    if (!session) return;
    if (!isSupabaseConfigured || !supabase) {
      toast('Supabase is not configured. Please add your credentials.');
      return;
    }
    if (!householdName.trim()) {
      toast('Household name is required.');
      return;
    }

    setCreatingHousehold(true);

    const { data: createdHousehold, error: householdError } = await supabase
      .from('households')
      .insert({
        name: householdName.trim(),
        owner_id: session.user.id,
      })
      .select()
      .single();

    if (householdError || !createdHousehold) {
      toast('Failed to create household. Please try again.');
      setCreatingHousehold(false);
      return;
    }

    const { error: memberError } = await supabase.from('members').insert({
      user_id: session.user.id,
      household_id: createdHousehold.id,
      role: 'owner',
    });

    if (memberError) {
      toast('Failed to join household. Please try again.');
      setCreatingHousehold(false);
      return;
    }

    const { data: createdList, error: listError } = await supabase
      .from('lists')
      .insert({
        household_id: createdHousehold.id,
        name: 'Main list',
      })
      .select()
      .single();

    if (listError || !createdList) {
      toast('Failed to create default list.');
      setCreatingHousehold(false);
      return;
    }

    setActiveHouseholdId(createdHousehold.id);
    setHousehold({ id: createdHousehold.id, name: createdHousehold.name });
    setList({ id: createdList.id, name: createdList.name });
    setHouseholdName('');
    setCreatingHousehold(false);
    toast('Household created successfully.');
  }, [householdName, session, setActiveHouseholdId]);

  const handleAddItem = useCallback(async () => {
    if (!list || !session) return;
    if (!isSupabaseConfigured || !supabase) {
      toast('Supabase is not configured. Please add your credentials.');
      return;
    }
    const trimmedName = itemName.trim();
    if (!trimmedName) {
      toast('Item name is required.');
      return;
    }
    const quantityNumber = Number.parseInt(itemQuantity, 10);
    const safeQuantity = Number.isFinite(quantityNumber) && quantityNumber > 0 ? quantityNumber : 1;

    setSubmittingItem(true);
    const { error } = await supabase.from('items').insert({
      list_id: list.id,
      name: trimmedName,
      quantity: safeQuantity,
      added_by: session.user.id,
    });
    setSubmittingItem(false);

    if (error) {
      toast('Failed to add item.');
      return;
    }

    setItemName('');
    setItemQuantity('1');
    toast('Item added.');
    void refetch();
  }, [itemName, itemQuantity, list, session, refetch]);

  const handleToggleItem = useCallback(
    async (item: GroceryItem) => {
      if (!isSupabaseConfigured || !supabase) {
        toast('Supabase is not configured.');
        return;
      }
      const { error } = await supabase
        .from('items')
        .update({ checked: !item.checked })
        .eq('id', item.id);
      if (error) {
        toast('Unable to update item.');
      }
    },
    []
  );

  const handleDeleteItem = useCallback(async (item: GroceryItem) => {
    if (!isSupabaseConfigured || !supabase) {
      toast('Supabase is not configured.');
      return;
    }
    const { error } = await supabase.from('items').delete().eq('id', item.id);
    if (error) {
      toast('Failed to delete item.');
    } else {
      toast('Item removed.');
    }
  }, []);

  const listHeader = useMemo(() => {
    if (!household || !list) {
      return null;
    }

    return (
      <View style={styles.header}>
        <Text style={styles.listTitle}>{household.name}</Text>
        <Text style={styles.listSubtitle}>{list.name}</Text>
      </View>
    );
  }, [household, list]);

  if (!isSupabaseConfigured || !supabase) {
    return (
      <View style={[styles.flex, styles.center]}>
        <EmptyState
          title="Supabase not configured"
          description="Add your Supabase credentials to start managing your groceries."
        />
      </View>
    );
  }

  if (!session) {
    return <LoadingState message="Preparing your Groceo experience…" />;
  }

  if (loadingContext) {
    return <LoadingState message="Loading your household…" />;
  }

  if (!household) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <View style={[styles.flex, styles.container, styles.center]}>
          <Text style={styles.bigTitle}>Create your first household</Text>
          <Text style={styles.helperText}>
            Invite your household members later. For now, pick a name to get started.
          </Text>
          <View style={styles.form}>
            <TextField
              label="Household name"
              value={householdName}
              onChangeText={setHouseholdName}
              placeholder="My household"
            />
            <Button
              title="Create household"
              onPress={handleCreateHousehold}
              loading={creatingHousehold}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}>
      <View style={[styles.flex, styles.container]}>
        {listHeader}
        <View style={styles.itemForm}>
          <TextField
            label="Item name"
            value={itemName}
            onChangeText={setItemName}
            placeholder="Add a new item"
          />
          <TextField
            label="Quantity"
            value={itemQuantity}
            onChangeText={setItemQuantity}
            keyboardType="number-pad"
            placeholder="1"
          />
          <Button title="Add item" onPress={handleAddItem} loading={submittingItem} />
        </View>

        <View style={styles.listContainer}>
          {itemsLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : items.length === 0 ? (
            <EmptyState
              title="No items yet"
              description="Add the first ingredient to your shared list."
            />
          ) : (
            <FlatList
              data={items}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              renderItem={({ item }) => (
                <ItemRow item={item} onToggle={handleToggleItem} onDelete={handleDeleteItem} />
              )}
            />
          )}
          {realtimeError ? <Text style={styles.errorText}>{realtimeError}</Text> : null}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function LoadingState({ message }: { message: string }) {
  return (
    <View style={[styles.flex, styles.center]}>
      <ActivityIndicator color={colors.primary} />
      <Text style={styles.helperText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  listContainer: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  listContent: {
    gap: spacing.sm,
  },
  separator: {
    height: spacing.sm,
  },
  header: {
    gap: spacing.xs,
  },
  listTitle: {
    ...textStyles.title,
  },
  listSubtitle: {
    ...textStyles.subtitle,
    color: colors.muted,
  },
  itemForm: {
    gap: spacing.md,
  },
  bigTitle: {
    ...textStyles.title,
    textAlign: 'center',
  },
  helperText: {
    ...textStyles.body,
    color: colors.muted,
    textAlign: 'center',
  },
  form: {
    width: '100%',
    gap: spacing.md,
  },
  errorText: {
    color: colors.danger,
    textAlign: 'center',
  },
});
