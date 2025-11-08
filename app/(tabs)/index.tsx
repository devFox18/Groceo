import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  FadeOutUp,
  Layout,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

import { Button } from '@/components/Button';
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

type GroceryItem = {
  id: string;
  name: string;
  quantity: number;
  checked: boolean;
  category?: string | null;
};

type PendingAdd = GroceryItem & {
  tempId: string;
  resolvedId?: string;
};

type DisplayItem = GroceryItem & {
  pending?: boolean;
  tempId?: string;
  resolvedId?: string;
};

type FloatingIcon = {
  emoji: string;
  id: string;
};

const palette = {
  amber: '#F7B267',
  coral: '#F79D65',
  beige: '#FFF1DF',
  cream: '#FFF8EE',
  clay: '#3F2E2C',
  deepClay: '#2F1F1E',
  mint: '#3A7D44',
  sand: '#FDE7C6',
  border: 'rgba(255,255,255,0.24)',
};

const QUICK_ADD_SUGGESTIONS = [
  { label: 'Kaas', emoji: '🧀' },
  { label: 'Melk', emoji: '🥛' },
  { label: 'Vers brood', emoji: '🍞' },
  { label: 'Broccoli', emoji: '🥦' },
  { label: 'Aardbeien', emoji: '🍓' },
] as const;

const ICON_MAP: Record<string, string> = {
  cheese: '🧀',
  kaas: '🧀',
  milk: '🥛',
  melk: '🥛',
  bread: '🍞',
  brood: '🍞',
  broccoli: '🥦',
  pasta: '🍝',
  egg: '🥚',
  strawberry: '🍓',
  aardbei: '🍓',
  aardbeien: '🍓',
  banana: '🍌',
  banaan: '🍌',
  bananen: '🍌',
  coffee: '☕️',
  koffie: '☕️',
  apple: '🍎',
  appel: '🍎',
  spinach: '🥬',
  spinazie: '🥬',
  tomato: '🍅',
  tomaat: '🍅',
  tomaten: '🍅',
  yogurt: '🥣',
  yoghurt: '🥣',
};

function iconForItem(name: string) {
  const match = Object.keys(ICON_MAP).find((key) =>
    name.toLowerCase().includes(key),
  );
  return match ? ICON_MAP[match] : '🛒';
}

export default function HomeScreen() {
  const { session } = useSession();
  const { activeHouseholdId, setActiveHouseholdId } = useActiveHousehold();
  const [loadingContext, setLoadingContext] = useState(true);
  const [household, setHousehold] = useState<Household | null>(null);
  const [list, setList] = useState<List | null>(null);
  const [householdName, setHouseholdName] = useState('');
  const [creatingHousehold, setCreatingHousehold] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemQuantity, setItemQuantity] = useState(1);
  const [addingItem, setAddingItem] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);
  const [floatingIcon, setFloatingIcon] = useState<FloatingIcon | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [pendingAdds, setPendingAdds] = useState<PendingAdd[]>([]);
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, boolean>>({});
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(() => new Set());
  const itemInputRef = useRef<TextInput>(null);
  const [hasManuallyFocused, setHasManuallyFocused] = useState(false);
  const celebrationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { items, isLoading: itemsLoading, error: realtimeError } = useRealtimeList(
    list?.id ?? null,
  );

  useEffect(() => {
    if (realtimeError) {
      console.error('[Home] Realtime list subscription error', realtimeError);
    }
  }, [realtimeError]);

  useEffect(() => {
    setPendingAdds((prev) =>
      prev.filter((pending) =>
        pending.resolvedId ? !items.some((item) => item.id === pending.resolvedId) : true,
      ),
    );
  }, [items]);

  useEffect(() => {
    setPendingUpdates((prev) => {
      const next = { ...prev };
      let changed = false;
      Object.keys(prev).forEach((id) => {
        const live = items.find((item) => item.id === id);
        if (live && live.checked === prev[id]) {
          delete next[id];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [items]);

  useEffect(() => {
    setPendingDeletes((prev) => {
      let changed = false;
      const next = new Set(prev);
      prev.forEach((id) => {
        if (!items.some((item) => item.id === id)) {
          next.delete(id);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [items]);

  const displayItems = useMemo<DisplayItem[]>(() => {
    const base = items
      .filter((item) => !pendingDeletes.has(item.id))
      .map<DisplayItem>((item) => {
        if (pendingUpdates[item.id] !== undefined) {
          return { ...item, checked: pendingUpdates[item.id], pending: true };
        }
        return item;
      });

    const adds = pendingAdds
      .filter((item) => (item.resolvedId ? !base.some((baseItem) => baseItem.id === item.resolvedId) : true))
      .map<DisplayItem>((item) => ({ ...item, pending: true }));

    return [...adds, ...base];
  }, [items, pendingAdds, pendingDeletes, pendingUpdates]);

  const activeItems = useMemo(
    () => displayItems.filter((item) => !item.checked),
    [displayItems],
  );
  const completedItems = useMemo(
    () => displayItems.filter((item) => item.checked),
    [displayItems],
  );
  const totalItems = displayItems.length;
  const remainingCount = activeItems.length;
  const completionRatio = totalItems === 0 ? 0 : completedItems.length / totalItems;


  const floatingOpacity = useSharedValue(0);
  const floatingTranslateY = useSharedValue(0);
  const floatingScale = useSharedValue(0.8);

  const floatingStyle = useAnimatedStyle(() => ({
    opacity: floatingOpacity.value,
    transform: [
      { translateY: floatingTranslateY.value },
      { scale: floatingScale.value },
    ],
  }));

  const triggerFloatingEmoji = useCallback(
    (emoji: string) => {
      setFloatingIcon({ emoji, id: `${emoji}-${Date.now()}` });
      floatingOpacity.value = 0;
      floatingTranslateY.value = 0;
      floatingScale.value = 0.85;

      floatingOpacity.value = withTiming(1, { duration: 140 });
      floatingScale.value = withSpring(1, { damping: 12, stiffness: 140 });
      floatingTranslateY.value = withSequence(
        withTiming(-54, {
          duration: 320,
          easing: Easing.out(Easing.cubic),
        }),
        withDelay(
          60,
          withTiming(-80, {
            duration: 260,
            easing: Easing.inOut(Easing.cubic),
          }),
        ),
      );

      floatingOpacity.value = withDelay(
        320,
        withTiming(0, { duration: 220 }, (finished) => {
          if (finished) {
            runOnJS(setFloatingIcon)(null);
          }
        }),
      );
    },
    [floatingOpacity, floatingScale, floatingTranslateY],
  );

  useEffect(() => {
    if (loadingContext) return;
    const hasItems = displayItems.length > 0;
    const allCleared = hasItems && activeItems.length === 0;

    if (!allCleared) {
      if (celebrationTimeoutRef.current) {
        clearTimeout(celebrationTimeoutRef.current);
        celebrationTimeoutRef.current = null;
      }
      setCelebrate(false);
      return;
    }

    setCelebrate(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    celebrationTimeoutRef.current = setTimeout(() => {
      setCelebrate(false);
    }, 2200);

    return () => {
      if (celebrationTimeoutRef.current) {
        clearTimeout(celebrationTimeoutRef.current);
        celebrationTimeoutRef.current = null;
      }
    };
  }, [activeItems.length, displayItems.length, loadingContext]);

  const loadContext = useCallback(async () => {
    if (!session) {
      setLoadingContext(false);
      return;
    }
    if (!isSupabaseConfigured || !supabase) {
      setLoadingContext(false);
      console.error('[Home] Skipping context load: Supabase not configured');
      return;
    }

    setLoadingContext(true);
    const { data: memberships, error } = await supabase
      .from('members')
      .select('household_id, households(id, name)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: true });

    if (error) {
      toast('Huishoudgegevens laden is niet gelukt.');
      setHousehold(null);
      setList(null);
      setLoadingContext(false);
      console.error('[Home] Failed to load memberships', error);
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
        (member) =>
          (member.households as { id: string }).id === activeHouseholdId,
      ) ?? membershipsWithHouseholds[0];

    const householdData = selectedMembership.households as
      | { id: string; name: string }
      | null;
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
      toast('Boodschappenlijsten laden is niet gelukt.');
      setList(null);
      setLoadingContext(false);
      return;
    }

    if (!lists || lists.length === 0) {
      const { data: createdList, error: createListError } = await supabase
        .from('lists')
        .insert({ household_id: householdData.id, name: 'Hoofdlijst' })
        .select()
        .single();

      if (createListError || !createdList) {
        toast('De standaardlijst kon niet worden aangemaakt.');
        setList(null);
        setLoadingContext(false);
        console.error('[Home] Failed to create default list', createListError);
        return;
      }

      setList({ id: createdList.id, name: createdList.name });
    } else {
      setList({ id: lists[0].id, name: lists[0].name });
    }

    setLoadingContext(false);
  }, [activeHouseholdId, session, setActiveHouseholdId]);

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  const handleCreateHousehold = useCallback(async () => {
    if (!session) return;
    if (!isSupabaseConfigured || !supabase) {
      toast('Supabase is niet geconfigureerd. Voeg je gegevens toe.');
      console.error('[Home] Unable to create household: Supabase not configured');
      return;
    }
    if (!householdName.trim()) {
      toast('Naam van het huishouden is verplicht.');
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
      });
      toast('Huishouden aanmaken is niet gelukt.');
      setCreatingHousehold(false);
      console.error('[Home] Household creation failed', householdError);
      return;
    }

    const { data: createdList, error: listError } = await supabase
      .from('lists')
      .insert({ household_id: createdHousehold.id, name: 'Hoofdlijst' })
      .select()
      .single();

    if (listError || !createdList) {
      logSupabaseError('lists.insert', listError, {
        screen: 'Home',
        userId: session.user.id,
        householdId: createdHousehold.id,
      });
      toast('Standaardlijst aanmaken is niet gelukt.');
      setCreatingHousehold(false);
      console.error('[Home] Default list creation failed', listError);
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
      toast('Lid worden van het huishouden is niet gelukt.');
      setCreatingHousehold(false);
      console.error('[Home] Failed to add member to household', memberError);
      return;
    }

    setActiveHouseholdId(createdHousehold.id);
    setHousehold({ id: createdHousehold.id, name: createdHousehold.name });
    setList({ id: createdList.id, name: createdList.name });
    setHouseholdName('');
    setCreatingHousehold(false);
    toast('Huishouden is aangemaakt.');
  }, [householdName, session, setActiveHouseholdId]);

  const addItem = useCallback(
    async ({ name, quantity }: { name: string; quantity?: number }) => {
      if (!list || !session) return false;
      if (!isSupabaseConfigured || !supabase) {
        toast('Supabase is niet geconfigureerd. Voeg je gegevens toe.');
        console.error('[Home] Unable to add item: Supabase not configured');
        return false;
      }
      if (addingItem) return false;

      const trimmedName = name.trim();
      if (!trimmedName) {
        toast('Naam van het item is verplicht.');
        console.warn('[Home] Ignoring add item: empty name');
        return false;
      }

      const safeQuantity =
        typeof quantity === 'number' && Number.isFinite(quantity) && quantity > 0
          ? Math.round(quantity)
          : 1;

      setAddingItem(true);
      const tempId = `temp-${Date.now()}`;
      const optimistic: PendingAdd = {
        id: tempId,
        tempId,
        name: trimmedName,
        quantity: safeQuantity,
        checked: false,
        category: null,
      };
      setPendingAdds((prev) => [optimistic, ...prev]);
      try {
        const { data, error } = await supabase
          .from('items')
          .insert({
            list_id: list.id,
            name: trimmedName,
            quantity: safeQuantity,
            added_by: session.user.id,
          })
          .select('id,name,quantity,checked,category')
          .single();

        if (error || !data) {
          toast('Item toevoegen is niet gelukt.');
          console.error('[Home] Supabase insert failed for item', error);
          setPendingAdds((prev) => prev.filter((item) => item.tempId !== tempId));
          return false;
        }

        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        triggerFloatingEmoji(iconForItem(trimmedName));
        setShowCompleted(false);
        Keyboard.dismiss();
        setPendingAdds((prev) =>
          prev.map((item) =>
            item.tempId === tempId ? { ...item, id: data.id, resolvedId: data.id } : item,
          ),
        );
        return true;
      } finally {
        setAddingItem(false);
      }
    },
    [addingItem, list?.id, session?.user.id, triggerFloatingEmoji],
  );

  const handleAddItem = useCallback(async () => {
    if (!itemName.trim()) {
      toast('Wat zullen we toevoegen?');
      return;
    }
    const success = await addItem({ name: itemName, quantity: itemQuantity });
    if (success) {
      setItemName('');
      setItemQuantity(1);
      itemInputRef.current?.clear();
      setHasManuallyFocused(false);
    }
  }, [addItem, itemName, itemQuantity]);

  const handleQuickAdd = useCallback(
    async (label: string) => {
      const success = await addItem({ name: label, quantity: 1 });
      if (success) {
        setItemName('');
        setItemQuantity(1);
        if (hasManuallyFocused) {
          itemInputRef.current?.blur();
        }
      }
    },
    [addItem, hasManuallyFocused],
  );

  const handleToggleItem = useCallback(
    async (item: DisplayItem) => {
      if ('tempId' in item && item.tempId && item.id.startsWith('temp-')) {
        setPendingAdds((prev) =>
          prev.map((pending) =>
            pending.tempId === item.tempId ? { ...pending, checked: !item.checked } : pending,
          ),
        );
        void Haptics.selectionAsync();
        return;
      }

      if (!isSupabaseConfigured || !supabase) {
        toast('Supabase is niet geconfigureerd.');
        console.error('[Home] Unable to toggle item: Supabase not configured');
        return;
      }
      const nextChecked = !item.checked;
      setPendingUpdates((prev) => ({ ...prev, [item.id]: nextChecked }));
      void Haptics.selectionAsync();

      const { error } = await supabase
        .from('items')
        .update({ checked: nextChecked })
        .eq('id', item.id);

      if (error) {
        toast('Item bijwerken is niet gelukt.');
        console.error('[Home] Supabase update failed for toggle', error, { itemId: item.id });
        setPendingUpdates((prev) => {
          const next = { ...prev };
          delete next[item.id];
          return next;
        });
        return;
      }

      setPendingUpdates((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
    },
    [],
  );

  const handleDeleteItem = useCallback(
    async (item: DisplayItem) => {
      const wasOnlyOptimistic = Boolean(item.tempId && item.id.startsWith('temp-'));

      if (item.tempId) {
        setPendingAdds((prev) => prev.filter((pending) => pending.tempId !== item.tempId));
        if (wasOnlyOptimistic) {
          return;
        }
      }

      if (!isSupabaseConfigured || !supabase) {
        toast('Supabase is niet geconfigureerd.');
        console.error('[Home] Unable to delete item: Supabase not configured');
        return;
      }

      const targetId = item.resolvedId ?? item.id;

      setPendingDeletes((prev) => {
        const next = new Set(prev);
        next.add(targetId);
        return next;
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

      const { error } = await supabase.from('items').delete().eq('id', targetId);
      if (error) {
        toast('Item verwijderen is niet gelukt.');
        console.error('[Home] Supabase delete failed for item', error, { itemId: targetId });
        setPendingDeletes((prev) => {
          const next = new Set(prev);
          next.delete(targetId);
          return next;
        });
        return;
      }

      console.log('[Home] Item removed', { itemId: targetId, name: item.name });
    },
    [],
  );

  const handleClearAll = useCallback(async () => {
    if (!list) return;
    if (!isSupabaseConfigured || !supabase) {
      toast('Supabase is niet geconfigureerd.');
      console.error('[Home] Unable to clear list: Supabase not configured');
      return;
    }
    if (displayItems.length === 0) {
      toast('De lijst is al leeg.');
      console.info('[Home] Clear list skipped: list already empty');
      return;
    }

    setPendingAdds([]);
    setPendingUpdates({});
    setPendingDeletes((prev) => {
      const next = new Set(prev);
      displayItems.forEach((item) => {
        if (item.id) {
          next.add(item.id);
        }
      });
      return next;
    });

    setClearingAll(true);
    try {
      const { error } = await supabase.from('items').delete().eq('list_id', list.id);
      if (error) {
        toast('Lijst legen is niet gelukt.');
        console.error('[Home] Supabase delete failed when clearing list', error, {
          listId: list.id,
        });
        return;
      }
      setShowCompleted(false);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      console.log('[Home] List cleared', { listId: list.id });
    } finally {
      setClearingAll(false);
    }
  }, [displayItems, list?.id]);

  const incrementQuantity = useCallback(() => {
    setItemQuantity((prev) => {
      const next = Math.min(prev + 1, 99);
      if (next !== prev) {
        void Haptics.selectionAsync();
      }
      return next;
    });
  }, []);

  const decrementQuantity = useCallback(() => {
    setItemQuantity((prev) => {
      const next = Math.max(prev - 1, 1);
      if (next !== prev) {
        void Haptics.selectionAsync();
      }
      return next;
    });
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: DisplayItem }) => (
      <GroceryListItem
        item={item}
        onToggle={() => handleToggleItem(item)}
        onDelete={() => handleDeleteItem(item)}
      />
    ),
    [handleDeleteItem, handleToggleItem],
  );

  const renderCompleted = useMemo(() => {
    if (!showCompleted || completedItems.length === 0) {
      return null;
    }

    return (
      <View style={styles.completedContainer}>
        <View style={styles.completedHeader}>
          <Text style={styles.completedTitle}>Afgevinkt</Text>
          <Text style={styles.completedCount}>{completedItems.length}</Text>
        </View>
        <View style={styles.completedList}>
          {completedItems.map((item) => (
            <GroceryListItem
              key={item.id}
              item={item}
              onToggle={() => handleToggleItem(item)}
              onDelete={() => handleDeleteItem(item)}
            />
          ))}
        </View>
      </View>
    );
  }, [completedItems, handleDeleteItem, handleToggleItem, showCompleted]);

  const predictedIcon = itemName.trim() ? iconForItem(itemName) : '🛒';
  const predictedLabel = itemName.trim() || 'Voeg iets lekkers toe';

  if (loadingContext || itemsLoading) {
    return (
      <LinearGradient
        colors={[palette.beige, palette.sand]}
        style={[styles.flex, styles.center]}>
        <ActivityIndicator size="small" color={palette.coral} />
        <Text style={styles.loadingText}>We warmen je voorraadkast op...</Text>
      </LinearGradient>
    );
  }

  if (!household || !list) {
    return (
      <SafeAreaView style={styles.flex}>
        <LinearGradient colors={[palette.beige, palette.cream]} style={styles.flex}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={[styles.flex, styles.center, styles.createContainer]}>
            <View style={styles.createCard}>
              <Text style={styles.createTitle}>Welkom bij Groceo ✨</Text>
              <Text style={styles.createSubtitle}>
                Maak een huishouden aan zodat iedereen samen items kan toevoegen en afvinken.
              </Text>
              <TextField
                label="Naam van het huishouden"
                value={householdName}
                onChangeText={setHouseholdName}
                placeholder="De Groceo-crew"
              />
              <Button
                title="Huishouden aanmaken"
                onPress={handleCreateHousehold}
                loading={creatingHousehold}
              />
            </View>
          </KeyboardAvoidingView>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.flex}>
      <LinearGradient
        colors={[palette.beige, palette.cream]}
        style={styles.flex}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}>
          <View style={styles.container}>
            <FlatList
              data={activeItems}
              keyExtractor={(item) => item.id ?? item.tempId ?? item.name}
              renderItem={renderItem}
              ListHeaderComponent={
                <View style={styles.headerArea}>
                  <View style={styles.headerRow}>
                    <View>
                      <Text style={styles.appTitle}>Groceo ✨</Text>
                      <Text style={styles.appSubtitle}>Gedeelde lijsten die altijd synchroon blijven.</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.avatarBadge}
                      onPress={() => toast('Binnenkort kun je van huishouden wisselen!')}>
                      <LinearGradient
                        colors={[palette.coral, palette.amber]}
                        style={styles.avatarGradient}>
                        <Text style={styles.avatarInitial}>
                          {session?.user.email?.[0]?.toUpperCase() ?? 'U'}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.summaryRow}>
                    <View style={styles.summaryBadge}>
                      <Feather name="home" size={16} color={palette.clay} />
                      <Text style={styles.summaryBadgeText}>{household.name}</Text>
                    </View>
                    <View style={styles.summaryBadge}>
                      <Feather name="shopping-bag" size={16} color={palette.clay} />
                      <Text style={styles.summaryBadgeText}>
                        {activeItems.length}{' '}
                        {activeItems.length === 1 ? 'product' : 'producten'} te halen
                      </Text>
                    </View>
                  </View>

                  <LinearGradient
                    colors={['#FFFFFF', 'rgba(255,255,255,0.82)']}
                    style={styles.heroCard}>
                    <View style={styles.heroCardCopy}>
                      <Text style={styles.heroTitle}>Huishouden {household.name}</Text>
                      <Text style={styles.heroSubtitle}>
                        {remainingCount === 0
                          ? 'Alles is binnen, ga gerust relaxen.'
                          : `Nog ${remainingCount} ${remainingCount === 1 ? 'item' : 'items'} op de lijst`}
                      </Text>
                      <View style={styles.heroStatsRow}>
                        <View style={styles.heroStatChip}>
                          <Feather name="check-circle" size={14} color={palette.deepClay} />
                          <Text style={styles.heroStatText}>{completedItems.length} afgerond</Text>
                        </View>
                        <View style={styles.heroStatChip}>
                          <Feather name="clock" size={14} color={palette.deepClay} />
                          <Text style={styles.heroStatText}>
                            {totalItems === 0 ? '0%' : `${Math.round(completionRatio * 100)}%`} klaar
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.heroProgress}>
                      <View style={styles.heroProgressTrack}>
                        <View
                          style={[
                            styles.heroProgressFill,
                            { width: `${Math.min(100, completionRatio * 100)}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.heroProgressLabel}>
                        {completedItems.length}/{totalItems || 1}
                      </Text>
                    </View>
                  </LinearGradient>

                  <View style={styles.addCard}>
                    <LinearGradient
                      colors={['rgba(255,255,255,0.95)', palette.cream]}
                      style={styles.addCardGradient}>
                      <View style={styles.addRow}>
                        <Ionicons name="search" size={20} color={palette.deepClay} />
                        <TextInput
                          ref={itemInputRef}
                          value={itemName}
                          onChangeText={setItemName}
                          placeholder="Voeg een product toe of scan iets..."
                          placeholderTextColor="rgba(63,31,30,0.45)"
                          style={styles.input}
                          returnKeyType="done"
                          onFocus={() => setHasManuallyFocused(true)}
                          onSubmitEditing={handleAddItem}
                        />
                        <TouchableOpacity
                          style={styles.cameraButton}
                          onPress={() => toast('Scannen volgt binnenkort!')}>
                          <Feather name="camera" size={18} color={palette.coral} />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.quantityRow}>
                        <Text style={styles.quantityLabel}>Aantal</Text>
                        <View style={styles.quantityStepper}>
                          <TouchableOpacity
                            style={styles.stepperButton}
                            onPress={decrementQuantity}>
                            <Feather name="minus" size={16} color={palette.clay} />
                          </TouchableOpacity>
                          <Text style={styles.quantityValue}>{itemQuantity}</Text>
                          <TouchableOpacity
                            style={styles.stepperButton}
                            onPress={incrementQuantity}>
                            <Feather name="plus" size={16} color={palette.clay} />
                          </TouchableOpacity>
                        </View>
                        <TouchableOpacity
                          style={[styles.addButton, addingItem && styles.addButtonDisabled]}
                          disabled={addingItem}
                          onPress={handleAddItem}>
                          {addingItem ? (
                            <ActivityIndicator size="small" color={palette.deepClay} />
                          ) : (
                            <Text style={styles.addButtonText}>Toevoegen</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                      <Animated.View
                        entering={FadeInUp.springify().damping(16)}
                        layout={Layout.springify().damping(18).stiffness(160)}
                        style={[
                          styles.previewCard,
                          !itemName.trim() && styles.previewCardIdle,
                        ]}>
                        <View style={styles.previewIconBubble}>
                          <Text style={styles.previewIcon}>{predictedIcon}</Text>
                        </View>
                        <View style={styles.previewCopy}>
                          <Text style={styles.previewLabel}>{predictedLabel}</Text>
                          <Text style={styles.previewHint}>
                            {itemName.trim()
                              ? 'Tik op toevoegen of druk op enter om het in de lijst te zetten.'
                              : 'Typ een product of kies een snelle suggestie.'}
                          </Text>
                        </View>
                      </Animated.View>
                      <Animated.View entering={FadeIn.duration(200)} style={styles.suggestionRow}>
                        {QUICK_ADD_SUGGESTIONS.map((suggestion, index) => (
                          <Animated.View
                            key={suggestion.label}
                            entering={FadeInUp.springify().delay(index * 40)}>
                            <TouchableOpacity
                              style={styles.suggestionChip}
                              onPress={() => handleQuickAdd(suggestion.label)}>
                              <Text style={styles.suggestionEmoji}>{suggestion.emoji}</Text>
                              <Text style={styles.suggestionText}>{suggestion.label}</Text>
                            </TouchableOpacity>
                          </Animated.View>
                        ))}
                      </Animated.View>
                    </LinearGradient>
                  </View>

                  {realtimeError ? (
                    <View style={styles.errorBanner}>
                      <Feather name="alert-triangle" size={16} color="#402018" />
                      <Text style={styles.errorBannerText}>
                        Synchroniseren lukt niet. Trek omlaag om te verversen.
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.actionDock}>
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        styles.clearButton,
                        (clearingAll || displayItems.length === 0) && styles.actionButtonDisabled,
                      ]}
                      onPress={handleClearAll}
                      disabled={clearingAll || displayItems.length === 0}>
                      {clearingAll ? (
                        <ActivityIndicator size="small" color={palette.deepClay} />
                      ) : (
                        <>
                          <Feather name="trash-2" size={16} color={palette.deepClay} />
                          <Text style={styles.clearText}>Lijst leegmaken</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.sortButton]}
                      onPress={() => toast('Sorteren en filteren komt er binnenkort bij!')}>
                      <Feather name="sliders" size={18} color={palette.deepClay} />
                      <Text style={styles.sortText}>Sorteren</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              }
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconBubble}>
                    <Text style={styles.emptyIcon}>🛒</Text>
                  </View>
                  <Text style={styles.emptyTitle}>Nog niets op de lijst</Text>
                  <Text style={styles.emptySubtitle}>
                    Voeg je vaste favorieten toe of kies een suggestie hierboven.
                  </Text>
                </View>
              }
              ListFooterComponent={
                <View style={styles.footerSpacer}>
                  <TouchableOpacity
                    style={styles.completedToggle}
                    onPress={() => setShowCompleted((prev) => !prev)}
                    disabled={completedItems.length === 0}>
                    <Feather
                      name={showCompleted ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={palette.clay}
                    />
                    <Text style={styles.completedToggleText}>
                      {completedItems.length === 0
                        ? 'Nog geen afgeronde items'
                        : showCompleted
                        ? 'Verberg afgerond'
                        : `Toon afgerond (${completedItems.length})`}
                    </Text>
                  </TouchableOpacity>
                  {renderCompleted}
                  <View style={styles.bottomSpacer} />
                </View>
              }
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />

            {floatingIcon ? (
              <Animated.View style={[styles.floatingIcon, floatingStyle]}>
                <Text style={styles.floatingIconText}>{floatingIcon.emoji}</Text>
              </Animated.View>
            ) : null}

            {celebrate ? <CelebrationOverlay /> : null}
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

type GroceryListItemProps = {
  item: DisplayItem;
  onToggle: () => void;
  onDelete: () => void;
};

function GroceryListItem({ item, onToggle, onDelete }: GroceryListItemProps) {
  return (
    <Swipeable
      overshootLeft={false}
      overshootRight={false}
      renderLeftActions={() => (
        <View style={styles.leftAction}>
          <Feather name="check-circle" size={18} color="#FFFFFF" />
          <Text style={styles.leftActionText}>Gekocht</Text>
        </View>
      )}
      renderRightActions={() => (
        <View style={styles.rightActions}>
          <TouchableOpacity style={styles.rightAction} onPress={onDelete}>
            <Feather name="trash-2" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
      onSwipeableOpen={(direction) => {
        if (direction === 'left') {
          onToggle();
        } else {
          onDelete();
        }
      }}>
      <Animated.View
        entering={FadeInDown.springify().damping(16)}
        exiting={FadeOutUp.duration(180)}
        layout={Layout.springify().damping(16).stiffness(140)}
        style={[styles.itemCard, item.checked && styles.itemCardChecked]}>
        <TouchableOpacity
          onPress={onToggle}
          style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
          {item.checked ? <Feather name="check" size={16} color="#FFFFFF" /> : null}
        </TouchableOpacity>
        <View style={styles.itemContent}>
          <Text style={[styles.itemName, item.checked && styles.itemNameChecked]}>
            {item.name}
          </Text>
          <Text style={styles.itemMeta}>
            {item.quantity > 1 ? `Aantal ${item.quantity}` : 'Slechts één'}
          </Text>
        </View>
        <View style={styles.itemTrailing}>
          <View style={styles.itemIconBubble}>
            <Text style={styles.itemIcon}>{iconForItem(item.name)}</Text>
          </View>
          <TouchableOpacity style={styles.itemDeleteButton} onPress={onDelete}>
            <Feather name="trash-2" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Swipeable>
  );
}

function CelebrationOverlay() {
  const confetti = ['🛒', '🧺', '🎉', '🥳', '🛍️'];

  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(240)}
      pointerEvents="none"
      style={styles.celebrationOverlay}>
      <Animated.View
        entering={FadeInDown.springify().damping(12)}
        style={styles.celebrationCard}>
        <Text style={styles.celebrationEmoji}>🧺</Text>
        <Text style={styles.celebrationTitle}>Lijst leeg!</Text>
        <Text style={styles.celebrationSubtitle}>
          Alles is afgevinkt — geniet van de rustige keuken.
        </Text>
      </Animated.View>

      <View style={styles.confettiArea}>
        {confetti.map((emoji, index) => (
          <ConfettiPiece key={`${emoji}-${index}`} emoji={emoji} delay={index * 90} />
        ))}
      </View>
    </Animated.View>
  );
}

type ConfettiPieceProps = {
  emoji: string;
  delay: number;
};

function ConfettiPiece({ emoji, delay }: ConfettiPieceProps) {
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    translateY.value = withSequence(
      withDelay(
        delay,
        withTiming(-90, { duration: 560, easing: Easing.out(Easing.cubic) }),
      ),
      withTiming(-20, { duration: 480, easing: Easing.inOut(Easing.cubic) }),
    );
    rotate.value = withTiming(360, { duration: 900 });
    opacity.value = withDelay(delay + 320, withTiming(0, { duration: 260 }));
  }, [delay, opacity, rotate, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.Text style={[styles.confettiPiece, animatedStyle]}>{emoji}</Animated.Text>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  headerArea: {
    gap: spacing.lg,
    paddingBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: palette.clay,
  },
  appSubtitle: {
    ...textStyles.caption,
    color: 'rgba(63,31,30,0.6)',
  },
  avatarBadge: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  avatarGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: palette.sand,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  summaryBadgeText: {
    ...textStyles.caption,
    color: palette.clay,
    fontWeight: '600',
  },
  heroCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  heroCardCopy: {
    flex: 1,
    gap: spacing.xs * 0.6,
  },
  heroTitle: {
    ...textStyles.title,
    fontSize: 20,
    color: palette.deepClay,
  },
  heroSubtitle: {
    ...textStyles.body,
    color: 'rgba(47,31,30,0.65)',
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  heroStatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs * 0.5,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs * 1.2,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(63,31,30,0.08)',
  },
  heroStatText: {
    ...textStyles.caption,
    fontWeight: '600',
    color: palette.deepClay,
  },
  heroProgress: {
    width: 96,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  heroProgressTrack: {
    width: '100%',
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(63,31,30,0.12)',
    overflow: 'hidden',
  },
  heroProgressFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: palette.coral,
  },
  heroProgressLabel: {
    ...textStyles.caption,
    fontWeight: '600',
    color: palette.deepClay,
  },
  addCard: {
    borderRadius: radius.lg,
    padding: 1,
    backgroundColor: 'rgba(247, 157, 101, 0.2)',
  },
  addCardGradient: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 16 },
    shadowRadius: 28,
    elevation: 12,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: palette.clay,
    paddingVertical: spacing.sm,
  },
  cameraButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(247, 157, 101, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  quantityLabel: {
    ...textStyles.caption,
    color: 'rgba(63,31,30,0.6)',
    fontWeight: '600',
  },
  quantityStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(63,31,30,0.05)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  stepperButton: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  quantityValue: {
    minWidth: 28,
    textAlign: 'center',
    fontWeight: '700',
    color: palette.clay,
  },
  addButton: {
    marginLeft: 'auto',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: palette.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    opacity: 0.7,
  },
  addButtonText: {
    fontWeight: '700',
    color: palette.deepClay,
  },
  suggestionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: 'rgba(63,31,30,0.06)',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  previewCardIdle: {
    backgroundColor: 'rgba(63,31,30,0.04)',
  },
  previewIconBubble: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 12,
    elevation: 4,
  },
  previewIcon: {
    fontSize: 24,
  },
  previewCopy: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  previewLabel: {
    fontWeight: '600',
    color: palette.clay,
  },
  previewHint: {
    ...textStyles.caption,
    color: 'rgba(63,31,30,0.55)',
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(63,31,30,0.06)',
  },
  suggestionEmoji: {
    fontSize: 16,
  },
  suggestionText: {
    ...textStyles.caption,
    color: palette.clay,
    fontWeight: '600',
  },
  actionDock: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(63,31,30,0.08)',
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  sortText: {
    fontWeight: '600',
    color: palette.deepClay,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: '#FEE4D5',
  },
  errorBannerText: {
    ...textStyles.caption,
    color: '#402018',
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing.xl * 4,
    gap: spacing.md,
  },
  footerSpacer: {
    gap: spacing.md,
  },
  completedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(63,31,30,0.08)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  completedToggleText: {
    ...textStyles.caption,
    color: palette.clay,
    fontWeight: '600',
  },
  completedContainer: {
    gap: spacing.sm,
  },
  completedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  completedTitle: {
    ...textStyles.caption,
    fontWeight: '600',
    color: 'rgba(63,31,30,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  completedCount: {
    ...textStyles.caption,
    color: 'rgba(63,31,30,0.45)',
  },
  completedList: {
    gap: spacing.sm,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: palette.cream,
    padding: spacing.md,
    borderRadius: radius.lg,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 22,
    elevation: 8,
  },
  itemCardChecked: {
    opacity: 0.6,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: palette.coral,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: palette.mint,
    borderColor: palette.mint,
  },
  itemContent: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.clay,
  },
  itemNameChecked: {
    color: 'rgba(63,31,30,0.6)',
    textDecorationLine: 'line-through',
  },
  itemMeta: {
    ...textStyles.caption,
    color: 'rgba(63,31,30,0.55)',
  },
  itemIcon: {
    fontSize: 24,
  },
  itemTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  itemIconBubble: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 6,
  },
  itemDeleteButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EB5757',
  },
  leftAction: {
    width: 96,
    marginVertical: 6,
    borderRadius: radius.lg,
    backgroundColor: palette.mint,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  leftActionText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  rightActions: {
    width: 72,
    marginVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightAction: {
    width: 56,
    height: '90%',
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EB5757',
  },
  bottomSpacer: {
    height: spacing.xl,
  },
  clearButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(247,157,101,0.18)',
  },
  clearButtonDisabled: {
    opacity: 0.6,
  },
  clearText: {
    fontWeight: '600',
    color: palette.deepClay,
  },
  sortButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(61,220,132,0.18)',
  },
  floatingIcon: {
    position: 'absolute',
    top: 180,
    left: spacing.lg + 36,
  },
  floatingIconText: {
    fontSize: 28,
  },
  celebrationOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  celebrationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 20 },
    shadowRadius: 30,
    elevation: 18,
  },
  celebrationEmoji: {
    fontSize: 32,
  },
  celebrationTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.clay,
  },
  celebrationSubtitle: {
    ...textStyles.caption,
    color: 'rgba(63,31,30,0.6)',
    textAlign: 'center',
  },
  confettiArea: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confettiPiece: {
    fontSize: 28,
    position: 'absolute',
  },
  emptyState: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  emptyIconBubble: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(63,31,30,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 32,
  },
  emptyTitle: {
    ...textStyles.subtitle,
    color: palette.deepClay,
  },
  emptySubtitle: {
    ...textStyles.caption,
    color: 'rgba(63,31,30,0.7)',
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  createContainer: {
    paddingHorizontal: spacing.lg,
  },
  createCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.lg,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 20 },
    shadowRadius: 32,
    elevation: 16,
  },
  createTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: palette.clay,
  },
  createSubtitle: {
    ...textStyles.body,
    color: 'rgba(63,31,30,0.6)',
  },
  loadingText: {
    ...textStyles.caption,
    color: palette.clay,
  },
});
