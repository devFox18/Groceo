import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { GroceryItem, ItemRow } from '@/components/ItemRow';
import {
  HeroAccentPill,
  OnboardingHero,
  illustrationConfig,
  type OnboardingIllustration,
} from '@/components/OnboardingSlide';
import { TextField } from '@/components/TextField';
import { useRealtimeList } from '@/hooks/useRealtimeList';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { colors, radius, spacing, textStyles } from '@/lib/theme';
import { useActiveHousehold, useSession } from '@/state/sessionStore';
import { logSupabaseError } from '@/utils/logging';
import { toast } from '@/utils/toast';

type Household = {
  id: string;
  name: string;
};

type List = {
  id: string;
  name: string;
};

const HOME_ILLUSTRATION: OnboardingIllustration = 'plan';
const CREATE_ILLUSTRATION: OnboardingIllustration = 'start';
const HOME_GRADIENT = illustrationConfig[HOME_ILLUSTRATION].gradient;
const CREATE_GRADIENT = illustrationConfig[CREATE_ILLUSTRATION].gradient;
const QUICK_ADD_OPTIONS = ['Milk', 'Eggs', 'Bread', 'Bananas', 'Coffee'] as const;
const QUANTITY_OPTIONS = [1, 2, 3, 5] as const;

export default function HomeScreen() {
  const { session } = useSession();
  const { activeHouseholdId, setActiveHouseholdId } = useActiveHousehold();
  const [loadingContext, setLoadingContext] = useState(true);
  const [household, setHousehold] = useState<Household | null>(null);
  const [list, setList] = useState<List | null>(null);
  const [householdName, setHouseholdName] = useState('');
  const [creatingHousehold, setCreatingHousehold] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [addingItem, setAddingItem] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [clearingCompleted, setClearingCompleted] = useState(false);
  const itemInputRef = useRef<TextInput>(null);

  const { items, isLoading: itemsLoading, error: realtimeError, refetch } = useRealtimeList(
    list?.id ?? null
  );

  const activeItems = useMemo(() => items.filter((item) => !item.checked), [items]);
  const completedItems = useMemo(() => items.filter((item) => item.checked), [items]);
  const pendingItems = activeItems.length;
  const hasItemName = itemName.trim().length > 0;

  useEffect(() => {
    if (completedItems.length === 0 && showCompleted) {
      setShowCompleted(false);
    }
  }, [completedItems.length, showCompleted]);

  const heroAccents = useMemo(() => {
    if (!household || !list) {
      return null;
    }

    return (
      <View style={styles.heroAccentWrap}>
        <HeroAccentPill icon="home-heart" label={household.name} />
        <HeroAccentPill
          icon="playlist-check"
          label={pendingItems > 0 ? `${pendingItems} to pick` : 'List is clear'}
        />
        <HeroAccentPill icon="cart-outline" label={list.name} />
      </View>
    );
  }, [household, list, pendingItems]);

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

    const trimmedName = householdName.trim();

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
        screen: 'Home',
        userId: session.user.id,
        householdName: trimmedName,
        hasData: Boolean(createdHousehold),
      });
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
      logSupabaseError('members.insert', memberError, {
        screen: 'Home',
        userId: session.user.id,
        householdId: createdHousehold.id,
      });
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
      logSupabaseError('lists.insert', listError, {
        screen: 'Home',
        userId: session.user.id,
        householdId: createdHousehold.id,
        hasData: Boolean(createdList),
      });
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

  const addItem = useCallback(
    async ({ name, quantity }: { name: string; quantity?: number }) => {
      if (!list || !session) return false;
      if (!isSupabaseConfigured || !supabase) {
        toast('Supabase is not configured. Please add your credentials.');
        return false;
      }
      if (addingItem) return false;

      const trimmedName = name.trim();
      if (!trimmedName) {
        toast('Item name is required.');
        return false;
      }

      const safeQuantity =
        typeof quantity === 'number' && Number.isFinite(quantity) && quantity > 0 ? quantity : 1;

      setAddingItem(true);
      try {
        const { error } = await supabase.from('items').insert({
          list_id: list.id,
          name: trimmedName,
          quantity: safeQuantity,
          added_by: session.user.id,
        });

        if (error) {
          toast('Failed to add item.');
          return false;
        }

        toast('Item added.');
        setShowCompleted(false);
        void refetch();
        return true;
      } finally {
        setAddingItem(false);
      }
    },
    [addingItem, list?.id, refetch, session?.user.id]
  );

  const handleAddItem = useCallback(async () => {
    if (!itemName.trim()) {
      return;
    }
    const success = await addItem({ name: itemName, quantity: itemQuantity });
    if (success) {
      setItemName('');
      setItemQuantity(1);
      itemInputRef.current?.focus();
    }
  }, [addItem, itemName, itemQuantity]);

  const handleQuickAdd = useCallback(
    async (suggestion: string) => {
      const success = await addItem({ name: suggestion, quantity: 1 });
      if (success) {
        setItemName('');
        setItemQuantity(1);
        itemInputRef.current?.focus();
      }
    },
    [addItem]
  );

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

  const handleDeleteItem = useCallback(
    async (item: GroceryItem) => {
      if (!isSupabaseConfigured || !supabase) {
        toast('Supabase is not configured.');
        return;
      }
      const { error } = await supabase.from('items').delete().eq('id', item.id);
      if (error) {
        logSupabaseError('items.delete', error, {
          screen: 'Home',
          userId: session?.user.id,
          itemId: item.id,
          listId: list?.id,
        });
        toast('Failed to delete item.');
        return;
      }
      toast('Item removed.');
      void refetch();
    },
    [list?.id, refetch, session?.user.id]
  );

  const handleClearCompleted = useCallback(async () => {
    if (!list || completedItems.length === 0) {
      return;
    }
    if (!isSupabaseConfigured || !supabase) {
      toast('Supabase is not configured.');
      return;
    }
    setClearingCompleted(true);
    try {
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('list_id', list.id)
        .eq('checked', true);

      if (error) {
        toast('Failed to clear completed items.');
        return;
      }

      toast('Cleared checked items.');
      setShowCompleted(false);
      void refetch();
    } finally {
      setClearingCompleted(false);
    }
  }, [completedItems.length, list?.id, refetch]);

  const listHeaderComponent =
    household && list ? (
      <View style={styles.headerSection}>
        <View style={styles.listSummary}>
          <View style={styles.listSummaryMeta}>
            <Text style={styles.listSummaryTitle}>{household.name}</Text>
            <Text style={styles.listSummarySubtitle}>{list.name}</Text>
          </View>
          <View style={styles.listSummaryStats}>
            <View style={styles.summaryBadge}>
              <MaterialCommunityIcons name="cart-outline" size={18} color={colors.textPrimary} />
              <Text style={styles.summaryBadgeText}>
                {pendingItems} active
              </Text>
            </View>
          </View>
        </View>
        {heroAccents}
        <View style={styles.fastAddCard}>
          <Text style={styles.fastAddTitle}>Quick add</Text>
          <View style={styles.fastAddRow}>
            <View style={styles.fastAddInputWrapper}>
              <TextInput
                ref={itemInputRef}
                style={styles.fastAddInput}
                value={itemName}
                onChangeText={setItemName}
                placeholder="Add an item..."
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={() => {
                  void handleAddItem();
                }}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add item"
              onPress={() => {
                void handleAddItem();
              }}
              disabled={!hasItemName || addingItem}
              style={({ pressed }) => [
                styles.fastAddButton,
                (!hasItemName || addingItem) && styles.fastAddButtonDisabled,
                pressed && !addingItem && hasItemName ? styles.fastAddButtonPressed : null,
              ]}>
              {addingItem ? (
                <ActivityIndicator color={colors.surface} />
              ) : (
                <MaterialCommunityIcons
                  name="plus"
                  size={20}
                  color={hasItemName ? colors.surface : colors.textSecondary}
                />
              )}
            </Pressable>
          </View>
          <View style={styles.quantitySelector}>
            <Text style={styles.quantityLabel}>Qty {itemQuantity}</Text>
            <View style={styles.quantityOptions}>
              {QUANTITY_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  accessibilityLabel={`Set quantity ${option}`}
                  onPress={() => setItemQuantity(option)}
                  style={({ pressed }) => [
                    styles.quantityOption,
                    itemQuantity === option && styles.quantityOptionActive,
                    pressed && styles.quantityOptionPressed,
                  ]}>
                  <Text
                    style={[
                      styles.quantityOptionText,
                      itemQuantity === option && styles.quantityOptionTextActive,
                    ]}>
                    {option}
                  </Text>
                </Pressable>
              ))}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Decrease quantity"
                disabled={itemQuantity <= 1}
                onPress={() => setItemQuantity((prev) => Math.max(1, prev - 1))}
                style={({ pressed }) => [
                  styles.quantityOption,
                  styles.quantityAdjust,
                  itemQuantity <= 1 && styles.quantityAdjustDisabled,
                  pressed && itemQuantity > 1 ? styles.quantityOptionPressed : null,
                ]}>
                <MaterialCommunityIcons
                  name="minus"
                  size={16}
                  color={itemQuantity <= 1 ? colors.textSecondary : colors.textPrimary}
                />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Increase quantity"
                onPress={() => setItemQuantity((prev) => prev + 1)}
                style={({ pressed }) => [
                  styles.quantityOption,
                  styles.quantityAdjust,
                  pressed && styles.quantityOptionPressed,
                ]}>
                <MaterialCommunityIcons name="plus" size={16} color={colors.textPrimary} />
              </Pressable>
            </View>
          </View>
          <View style={styles.quickAdd}>
            <Text style={styles.quickAddHeading}>Popular picks</Text>
            <View style={styles.quickAddChips}>
              {QUICK_ADD_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  accessibilityLabel={`Quick add ${option}`}
                  style={({ pressed }) => [
                    styles.quickAddChip,
                    pressed && styles.quickAddChipPressed,
                  ]}
                  onPress={() => {
                    void handleQuickAdd(option);
                  }}>
                  <Text style={styles.quickAddChipText}>{option}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
        <View style={styles.sectionMeta}>
          <Text style={styles.sectionMetaText}>
            {pendingItems > 0
              ? `${pendingItems} item${pendingItems === 1 ? '' : 's'} left to grab`
              : 'All caught up—add the next thing you need.'}
          </Text>
          <Text style={styles.sectionMetaHint}>
            Tap items as you shop to keep everyone in sync.
          </Text>
        </View>
        <Text style={styles.sectionTitle}>Shared grocery list</Text>
      </View>
    ) : null;

  const renderListEmpty = useCallback(() => {
    return (
      <View style={styles.listItem}>
        {itemsLoading ? (
          <View style={styles.emptyStateCard}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.emptyStateText}>Syncing your list…</Text>
          </View>
        ) : completedItems.length > 0 ? (
          <EmptyState
            title="Nothing left to grab"
            description="Everything's checked off. Add whatever comes next."
          />
        ) : (
          <EmptyState
            title="Your list is wide open"
            description="Add the first ingredient and we'll keep everyone in sync."
          />
        )}
      </View>
    );
  }, [completedItems.length, itemsLoading]);

  const listFooterComponent = useMemo(() => {
    if (!completedItems.length && !realtimeError) {
      return null;
    }

    return (
      <View style={styles.listFooter}>
        {completedItems.length ? (
          <View style={styles.completedSection}>
            <View style={styles.completedHeader}>
              <Text style={styles.completedTitle}>Checked off</Text>
              <View style={styles.completedActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={showCompleted ? 'Hide checked items' : 'Show checked items'}
                  onPress={() => setShowCompleted((prev) => !prev)}
                  style={({ pressed }) => [
                    styles.completedToggle,
                    pressed && styles.completedTogglePressed,
                  ]}>
                  <Text style={styles.completedToggleText}>
                    {showCompleted ? 'Hide list' : `Show (${completedItems.length})`}
                  </Text>
                </Pressable>
                <Button
                  title="Clear checked"
                  onPress={handleClearCompleted}
                  variant="ghost"
                  loading={clearingCompleted}
                  disabled={clearingCompleted}
                />
              </View>
            </View>
            {showCompleted ? (
              <View style={styles.completedList}>
                {completedItems.map((item) => (
                  <View key={item.id} style={styles.completedItem}>
                    <ItemRow item={item} onToggle={handleToggleItem} onDelete={handleDeleteItem} />
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
        {realtimeError ? <Text style={styles.errorText}>{realtimeError}</Text> : null}
      </View>
    );
  }, [
    clearingCompleted,
    completedItems,
    handleClearCompleted,
    handleDeleteItem,
    handleToggleItem,
    realtimeError,
    showCompleted,
  ]);

  if (!isSupabaseConfigured || !supabase) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <View style={styles.screen}>
          <LinearGradient colors={HOME_GRADIENT} style={styles.backgroundGradient} pointerEvents="none" />
          <View style={styles.centeredContent}>
            <EmptyState
              title="Supabase not configured"
              description="Add your Supabase credentials to start managing your groceries."
            />
          </View>
        </View>
      </KeyboardAvoidingView>
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
        <View style={styles.screen}>
          <LinearGradient colors={CREATE_GRADIENT} style={styles.backgroundGradient} pointerEvents="none" />
          <ScrollView
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <OnboardingHero illustration={CREATE_ILLUSTRATION} />
            <View style={styles.headerCopy}>
              <Text style={styles.headline}>Create your first household</Text>
              <Text style={styles.subheadline}>
                Invite the people who shop with you later. Start with a name everyone recognizes.
              </Text>
            </View>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Household name</Text>
                <Text style={styles.cardSubtitle}>
                  A clear name keeps the right crew in the loop.
                </Text>
              </View>
              <View style={styles.formFields}>
                <TextField
                  label="Household name"
                  value={householdName}
                  onChangeText={setHouseholdName}
                  placeholder="The Groceo crew"
                />
                <Button
                  title="Create household"
                  onPress={handleCreateHousehold}
                  loading={creatingHousehold}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}>
      <View style={styles.screen}>
        <LinearGradient colors={HOME_GRADIENT} style={styles.backgroundGradient} pointerEvents="none" />
        <FlatList
          data={activeItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.listItem}>
              <ItemRow item={item} onToggle={handleToggleItem} onDelete={handleDeleteItem} />
            </View>
          )}
          ListHeaderComponent={listHeaderComponent}
          ListEmptyComponent={renderListEmpty}
          ListFooterComponent={listFooterComponent}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          refreshing={itemsLoading}
          onRefresh={refetch}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

function LoadingState({ message }: { message: string }) {
  return (
    <View style={styles.screen}>
      <LinearGradient colors={HOME_GRADIENT} style={styles.backgroundGradient} pointerEvents="none" />
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.loadingMessage}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.55,
  },
  centeredContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  headerSection: {
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  heroAccentWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  headerCopy: {
    gap: spacing.sm,
  },
  listSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  listSummaryMeta: {
    gap: spacing.xs,
    flex: 1,
  },
  listSummaryTitle: {
    ...textStyles.title,
    fontSize: 28,
  },
  listSummarySubtitle: {
    ...textStyles.caption,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  listSummaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryBadgeText: {
    ...textStyles.caption,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  headline: {
    ...textStyles.title,
    fontSize: 30,
  },
  subheadline: {
    ...textStyles.body,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  cardHeader: {
    gap: spacing.xs,
  },
  cardTitle: {
    ...textStyles.subtitle,
    fontSize: 20,
    color: colors.textPrimary,
  },
  cardSubtitle: {
    ...textStyles.body,
    color: colors.textSecondary,
  },
  formFields: {
    gap: spacing.md,
  },
  fastAddCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  fastAddTitle: {
    ...textStyles.caption,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  fastAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  fastAddInputWrapper: {
    flex: 1,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  fastAddInput: {
    height: 44,
    fontSize: 16,
    color: colors.textPrimary,
  },
  fastAddButton: {
    height: 44,
    width: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fastAddButtonPressed: {
    transform: [{ scale: 0.97 }],
  },
  fastAddButtonDisabled: {
    backgroundColor: colors.border,
    opacity: 0.6,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  quantityLabel: {
    ...textStyles.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  quantityOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  quantityOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  quantityOptionPressed: {
    opacity: 0.7,
  },
  quantityOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  quantityOptionText: {
    ...textStyles.caption,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  quantityOptionTextActive: {
    color: colors.surface,
  },
  quantityAdjust: {
    paddingHorizontal: 0,
    width: 36,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityAdjustDisabled: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    opacity: 0.6,
  },
  quickAdd: {
    gap: spacing.sm,
  },
  quickAddHeading: {
    ...textStyles.caption,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: colors.textSecondary,
  },
  quickAddChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickAddChip: {
    backgroundColor: colors.background,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickAddChipPressed: {
    opacity: 0.7,
  },
  quickAddChipText: {
    ...textStyles.caption,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  sectionMeta: {
    gap: spacing.xs,
  },
  sectionMetaText: {
    ...textStyles.body,
    fontWeight: '600',
  },
  sectionMetaHint: {
    ...textStyles.caption,
    color: colors.textSecondary,
  },
  sectionTitle: {
    ...textStyles.subtitle,
    fontSize: 18,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl * 1.2,
  },
  listItem: {
    marginBottom: spacing.md,
  },
  listFooter: {
    gap: spacing.lg,
    paddingTop: spacing.xl,
  },
  completedSection: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  completedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  completedTitle: {
    ...textStyles.subtitle,
    fontSize: 18,
  },
  completedActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  completedToggle: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  completedTogglePressed: {
    opacity: 0.7,
  },
  completedToggleText: {
    ...textStyles.caption,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  completedList: {
    gap: spacing.sm,
  },
  completedItem: {
    marginBottom: spacing.sm,
  },
  emptyStateCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  emptyStateText: {
    ...textStyles.body,
    color: colors.textSecondary,
  },
  errorText: {
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  loadingMessage: {
    ...textStyles.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
