import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
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

type DecoratedItem = DisplayItem & {
  groupLabel: string;
  showGroupHeader: boolean;
};

type HistoryAction = 'added' | 'deleted' | 'cleared';

type HistoryEventPayload = {
  action: HistoryAction;
  name?: string;
  quantity?: number;
};

const CLEAR_EVENT_LABEL = 'Lijst geleegd';

type FloatingIcon = {
  emoji: string;
  id: string;
};

type QuickAddSuggestion = {
  label: string;
  emoji: string;
};

type ListFilter = 'all' | 'open' | 'done';

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

const TILE_THEMES = [
  { card: '#FFF6ED', accent: '#F7B267', border: 'rgba(247,178,103,0.35)' },
  { card: '#FDF1F1', accent: '#F47DAA', border: 'rgba(244,125,170,0.3)' },
  { card: '#F1F8F4', accent: '#5FB49C', border: 'rgba(95,180,156,0.32)' },
  { card: '#EFF3FF', accent: '#7E9BFF', border: 'rgba(126,155,255,0.3)' },
];

function tileThemeForItem(name: string) {
  if (!name) {
    return TILE_THEMES[0];
  }
  const first = name.trim().toLowerCase().charCodeAt(0) || 0;
  return TILE_THEMES[first % TILE_THEMES.length];
}

function groupLabelForItem(item: DisplayItem) {
  if (item.category && item.category.trim().length > 0) {
    return item.category.trim();
  }
  const name = item.name.trim();
  return name ? name.charAt(0).toUpperCase() : 'Overig';
}

const FAVORITE_QUICK_ADD: QuickAddSuggestion[] = [
  { label: 'Kaas', emoji: '🧀' },
  { label: 'Melk', emoji: '🥛' },
  { label: 'Vers brood', emoji: '🍞' },
  { label: 'Broccoli', emoji: '🥦' },
  { label: 'Aardbeien', emoji: '🍓' },
];

const LIST_FILTERS: { key: ListFilter; label: string }[] = [
  { key: 'all', label: 'Alles' },
  { key: 'open', label: 'Open' },
  { key: 'done', label: 'Afgerond' },
];

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

function buildSuggestion(label: string): QuickAddSuggestion {
  return {
    label,
    emoji: iconForItem(label),
  };
}

export default function GroceriesScreen() {
  const router = useRouter();
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
  const [clearingAll, setClearingAll] = useState(false);
  const [floatingIcon, setFloatingIcon] = useState<FloatingIcon | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [pendingAdds, setPendingAdds] = useState<PendingAdd[]>([]);
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, boolean>>({});
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(() => new Set());
  const [recentQuickAdds, setRecentQuickAdds] = useState<QuickAddSuggestion[]>([]);
  const [quickAddTab, setQuickAddTab] = useState<'favorieten' | 'recent'>('favorieten');
  const [listFilter, setListFilter] = useState<ListFilter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const itemInputRef = useRef<TextInput>(null);
  const [hasManuallyFocused, setHasManuallyFocused] = useState(false);
  const celebrationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { items, isLoading: itemsLoading, error: realtimeError, refetch } = useRealtimeList(
    list?.id ?? null,
  );

  useEffect(() => {
    if (realtimeError) {
      console.error('[Groceries] Realtime list subscription error', realtimeError);
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
    if (!list?.id || !isSupabaseConfigured || !supabase) {
      setRecentQuickAdds([]);
      return;
    }
    let isMounted = true;
    const loadRecentAdditions = async () => {
      const { data, error } = await supabase
        .from('list_history')
        .select('item_name')
        .eq('list_id', list.id)
        .eq('action', 'added')
        .order('created_at', { ascending: false })
        .limit(4);
      if (error) {
        logSupabaseError('list_history.recent', error, {
          screen: 'Groceries',
          listId: list.id,
        });
        return;
      }
      const suggestions =
        data
          ?.map((row) => row.item_name?.trim())
          .filter((name): name is string => Boolean(name && name.length > 0))
          .map((label) => buildSuggestion(label))
          .reduce<QuickAddSuggestion[]>((acc, suggestion) => {
            if (acc.find((existing) => existing.label.toLowerCase() === suggestion.label.toLowerCase())) {
              return acc;
            }
            return [...acc, suggestion];
          }, []) ?? [];
      if (isMounted) {
        setRecentQuickAdds(suggestions.slice(0, 8));
      }
    };
    void loadRecentAdditions();
    return () => {
      isMounted = false;
    };
  }, [list?.id, supabase, isSupabaseConfigured]);

  useEffect(() => {
    if (!list?.id || !isSupabaseConfigured || !supabase) {
      return;
    }
    const channel = supabase
      .channel(`list-history-recent-${list.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'list_history',
          filter: `list_id=eq.${list.id}`,
        },
        (payload) => {
          const insertedAction = (payload.new?.action as string | undefined) ?? '';
          if (insertedAction !== 'added') {
            return;
          }
          const name = (payload.new?.item_name as string | undefined)?.trim();
          if (!name) {
            return;
          }
          const suggestion = buildSuggestion(name);
          setRecentQuickAdds((prev) => {
            const filtered = prev.filter(
              (existing) => existing.label.toLowerCase() !== suggestion.label.toLowerCase(),
            );
            return [suggestion, ...filtered].slice(0, 8);
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [list?.id, supabase, isSupabaseConfigured]);

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
  const filteredItems = useMemo(() => {
    if (listFilter === 'open') {
      return displayItems.filter((item) => !item.checked);
    }
    if (listFilter === 'done') {
      return displayItems.filter((item) => item.checked);
    }
    return displayItems;
  }, [displayItems, listFilter]);
  const filterEmpty = filteredItems.length === 0 && displayItems.length > 0;
  const decoratedItems = useMemo<DecoratedItem[]>(() => {
    const sorted = [...filteredItems].sort((a, b) =>
      a.name.localeCompare(b.name, 'nl', { sensitivity: 'base' }),
    );
    return sorted.map((item, index) => {
      const label = groupLabelForItem(item);
      const prev = index > 0 ? groupLabelForItem(sorted[index - 1]) : null;
      return {
        ...item,
        groupLabel: label,
        showGroupHeader: !prev || prev !== label,
      };
    });
  }, [filteredItems]);

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
      console.error('[Groceries] Skipping context load: Supabase not configured');
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
      console.error('[Groceries] Failed to load memberships', error);
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
        console.error('[Groceries] Failed to create default list', createListError);
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
      console.error('[Groceries] Unable to create household: Supabase not configured');
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
      console.error('[Groceries] Household creation failed', householdError);
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
      console.error('[Groceries] Default list creation failed', listError);
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
      console.error('[Groceries] Failed to add member to household', memberError);
      return;
    }

    setActiveHouseholdId(createdHousehold.id);
    setHousehold({ id: createdHousehold.id, name: createdHousehold.name });
    setList({ id: createdList.id, name: createdList.name });
    setHouseholdName('');
    setCreatingHousehold(false);
    toast('Huishouden is aangemaakt.');
  }, [householdName, session, setActiveHouseholdId]);

  const recordHistoryEvent = useCallback(
    async ({ action, name, quantity }: HistoryEventPayload) => {
      if (!list || !session) {
        return;
      }
      if (!isSupabaseConfigured || !supabase) {
        return;
      }
      const metadataName = (session.user.user_metadata?.full_name as string | undefined)?.trim();
      const userLabel = metadataName || session.user.email?.split('@')[0] || 'Onbekend';
      const dbAction: Exclude<HistoryAction, 'cleared'> = action === 'cleared' ? 'deleted' : action;
      const safeName =
        (typeof name === 'string' && name.trim().length > 0
          ? name.trim()
          : action === 'cleared'
            ? CLEAR_EVENT_LABEL
            : 'Onbekend item');
      const safeQuantity =
        typeof quantity === 'number' && Number.isFinite(quantity) && quantity >= 0
          ? quantity
          : 0;
      const { error } = await supabase.from('list_history').insert({
        list_id: list.id,
        action: dbAction,
        item_name: safeName,
        quantity: safeQuantity,
        user_email: userLabel,
      });
      if (error) {
        console.error('[Groceries] Failed to persist history event', error);
        return;
      }
      if (action === 'added') {
        const suggestion = buildSuggestion(safeName);
        setRecentQuickAdds((prev) => {
          const filtered = prev.filter(
            (existing) => existing.label.toLowerCase() !== suggestion.label.toLowerCase(),
          );
          return [suggestion, ...filtered].slice(0, 8);
        });
      }
    },
    [list?.id, session],
  );

  const addItem = useCallback(
    async ({ name, quantity }: { name: string; quantity?: number }) => {
      if (!list || !session) return false;
      if (!isSupabaseConfigured || !supabase) {
        toast('Supabase is niet geconfigureerd. Voeg je gegevens toe.');
        console.error('[Groceries] Unable to add item: Supabase not configured');
        return false;
      }
      if (addingItem) return false;

      const trimmedName = name.trim();
      if (!trimmedName) {
        toast('Naam van het item is verplicht.');
        console.warn('[Groceries] Ignoring add item: empty name');
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
          console.error('[Groceries] Supabase insert failed for item', error);
          setPendingAdds((prev) => prev.filter((item) => item.tempId !== tempId));
          return false;
        }

        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        triggerFloatingEmoji(iconForItem(trimmedName));
        Keyboard.dismiss();
        setPendingAdds((prev) =>
          prev.map((item) =>
            item.tempId === tempId ? { ...item, id: data.id, resolvedId: data.id } : item,
          ),
        );
        void recordHistoryEvent({ action: 'added', name: trimmedName, quantity: safeQuantity });
        return true;
      } finally {
        setAddingItem(false);
      }
    },
    [addingItem, list?.id, recordHistoryEvent, session?.user.id, triggerFloatingEmoji],
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
    async (suggestion: QuickAddSuggestion) => {
      const success = await addItem({ name: suggestion.label, quantity: 1 });
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
        console.error('[Groceries] Unable to toggle item: Supabase not configured');
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
        console.error('[Groceries] Supabase update failed for toggle', error, { itemId: item.id });
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
        console.error('[Groceries] Unable to delete item: Supabase not configured');
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
        console.error('[Groceries] Supabase delete failed for item', error, { itemId: targetId });
        setPendingDeletes((prev) => {
          const next = new Set(prev);
          next.delete(targetId);
          return next;
        });
        return;
      }

      void recordHistoryEvent({ action: 'deleted', name: item.name, quantity: item.quantity });
      console.log('[Groceries] Item removed', { itemId: targetId, name: item.name });
    },
    [recordHistoryEvent],
  );

  const handleClearAll = useCallback(async () => {
    if (!list) return;
    if (!isSupabaseConfigured || !supabase) {
      toast('Supabase is niet geconfigureerd.');
      console.error('[Groceries] Unable to clear list: Supabase not configured');
      return;
    }
    if (displayItems.length === 0) {
      toast('De lijst is al leeg.');
      console.info('[Groceries] Clear list skipped: list already empty');
      return;
    }
    const clearedCount = displayItems.length;

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
        console.error('[Groceries] Supabase delete failed when clearing list', error, {
          listId: list.id,
        });
        return;
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void recordHistoryEvent({
        action: 'cleared',
        name: CLEAR_EVENT_LABEL,
        quantity: clearedCount,
      });
      console.log('[Groceries] List cleared', { listId: list.id });
    } finally {
      setClearingAll(false);
    }
  }, [displayItems, list?.id, recordHistoryEvent]);

  const handleRefresh = useCallback(async () => {
    if (refreshing) {
      return;
    }
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch, refreshing]);

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
    ({ item }: { item: DecoratedItem }) => (
      <View style={styles.listItemWrapper}>
        {item.showGroupHeader ? (
          <View style={styles.groupHeaderRow}>
            <Text style={styles.groupHeaderTitle}>{item.groupLabel}</Text>
            <View style={styles.groupHeaderDivider} />
          </View>
        ) : null}
        <GroceryListItem
          item={item}
          onToggle={() => handleToggleItem(item)}
          onDelete={() => handleDeleteItem(item)}
        />
      </View>
    ),
    [handleDeleteItem, handleToggleItem],
  );
  const keyExtractor = useCallback(
    (item: DecoratedItem) => item.id ?? item.tempId ?? item.name,
    [],
  );
  const renderListEmpty = useCallback(() => {
    if (displayItems.length === 0) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconBubble}>
            <Text style={styles.emptyIcon}>🛒</Text>
          </View>
          <Text style={styles.emptyTitle}>Nog niets op de lijst</Text>
          <Text style={styles.emptySubtitle}>Typ een product en druk op toevoegen.</Text>
        </View>
      );
    }
    if (filterEmpty) {
      return (
        <View style={styles.filterEmptyState}>
          <Text style={styles.filterEmptyTitle}>Geen items in deze weergave</Text>
          <Text style={styles.filterEmptySubtitle}>Pas je filter aan om andere items te zien.</Text>
        </View>
      );
    }
    return null;
  }, [displayItems.length, filterEmpty]);

  const predictedIcon = itemName.trim() ? iconForItem(itemName) : '🛒';
  const quickAddItems = quickAddTab === 'favorieten' ? FAVORITE_QUICK_ADD : recentQuickAdds;
  const recentHint = useMemo(
    () => recentQuickAdds.map((item) => item.label).slice(0, 4).join(' • '),
    [recentQuickAdds],
  );
  const predictedLabel = itemName.trim() || recentHint || 'Voeg iets lekkers toe';

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
              data={decoratedItems}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={palette.deepClay}
                />
              }
              ListHeaderComponent={
                <View style={styles.headerArea}>
                  <LinearGradient colors={[palette.cream, palette.sand]} style={styles.heroCard}>
                    <View style={styles.heroHeaderRow}>
                      <View>
                        <Text style={styles.appEyebrow}>Huishoudlijst</Text>
                        <Text style={styles.appTitle}>Boodschappen</Text>
                        <Text style={styles.appSubtitle}>Hou alles bij zoals bij Bring, maar dan Groceo.</Text>
                      </View>
                      <View style={styles.headerActions}>
                        <TouchableOpacity
                          style={styles.historyShortcut}
                          onPress={() => router.push('/groceries-history')}>
                          <Feather name="clock" size={16} color={palette.deepClay} />
                          <Text style={styles.historyShortcutText}>Historie</Text>
                        </TouchableOpacity>
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
                    </View>

                    <View style={styles.summaryRow}>
                      <View style={styles.summaryBadge}>
                        <Feather name="shopping-bag" size={16} color={palette.clay} />
                        <Text style={styles.summaryBadgeText}>
                          {remainingCount} {remainingCount === 1 ? 'item open' : 'items open'}
                        </Text>
                      </View>
                      <View style={styles.summaryBadge}>
                        <Feather name="check-circle" size={16} color={palette.clay} />
                        <Text style={styles.summaryBadgeText}>
                          {completedItems.length} klaar
                        </Text>
                      </View>
                    </View>

                    <View style={styles.progressCard}>
                      <View style={styles.progressHeader}>
                        <Text style={styles.progressTitle}>Voortgang vandaag</Text>
                        <Text style={styles.progressValue}>
                          {Math.round(completionRatio * 100)}%
                        </Text>
                      </View>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${Math.min(100, Math.round(completionRatio * 100))}%` },
                          ]}
                        />
                      </View>
                    </View>
                  </LinearGradient>

                  <View style={styles.addPanel}>
                    <View style={styles.addPanelHeader}>
                      <View>
                        <Text style={styles.addPanelTitle}>Nieuw product</Text>
                        <Text style={styles.addPanelSubtitle}>{predictedLabel}</Text>
                      </View>
                      <View style={styles.addPanelEmoji}>
                        <Text style={styles.addPanelEmojiText}>{predictedIcon}</Text>
                      </View>
                    </View>
                    <View style={styles.addRow}>
                      <Ionicons name="search" size={18} color={palette.deepClay} />
                      <TextInput
                        ref={itemInputRef}
                        value={itemName}
                        onChangeText={setItemName}
                        placeholder="Wat moet er mee?"
                        placeholderTextColor="rgba(63,31,30,0.45)"
                        style={styles.input}
                        returnKeyType="done"
                        onFocus={() => setHasManuallyFocused(true)}
                        onSubmitEditing={handleAddItem}
                      />
                      <TouchableOpacity
                        style={styles.quickAddButton}
                        onPress={handleAddItem}
                        disabled={addingItem}>
                        {addingItem ? (
                          <ActivityIndicator size="small" color={palette.deepClay} />
                        ) : (
                          <Feather name="plus" size={18} color={palette.deepClay} />
                        )}
                      </TouchableOpacity>
                    </View>
                    <View style={styles.quantityRow}>
                      <Text style={styles.quantityLabel}>Aantal</Text>
                      <View style={styles.quantityStepper}>
                        <TouchableOpacity style={styles.stepperButton} onPress={decrementQuantity}>
                          <Feather name="minus" size={16} color={palette.clay} />
                        </TouchableOpacity>
                        <Text style={styles.quantityValue}>{itemQuantity}</Text>
                        <TouchableOpacity style={styles.stepperButton} onPress={incrementQuantity}>
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
                    <View style={styles.quickAddToggle}>
                      {(['favorieten', 'recent'] as const).map((tab) => {
                        const isActive = quickAddTab === tab;
                        return (
                          <TouchableOpacity
                            key={tab}
                            style={[
                              styles.quickAddToggleButton,
                              isActive && styles.quickAddToggleButtonActive,
                            ]}
                            onPress={() => setQuickAddTab(tab)}>
                            <Text
                              style={[
                                styles.quickAddToggleText,
                                isActive && styles.quickAddToggleTextActive,
                              ]}>
                              {tab === 'favorieten' ? 'Favorieten' : 'Recent'}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    <View style={styles.quickTileGrid}>
                      {quickAddItems.length === 0 ? (
                        <Text style={styles.suggestionEmpty}>
                          Nog niets in deze lijst. Voeg eerst iets toe.
                        </Text>
                      ) : (
                        quickAddItems.map((suggestion) => (
                          <TouchableOpacity
                            key={suggestion.label}
                            style={styles.quickTile}
                            onPress={() => handleQuickAdd(suggestion)}>
                            <Text style={styles.quickTileEmoji}>{suggestion.emoji}</Text>
                            <Text style={styles.quickTileLabel}>{suggestion.label}</Text>
                          </TouchableOpacity>
                        ))
                      )}
                    </View>
                  </View>

                  {realtimeError ? (
                    <View style={styles.errorBanner}>
                      <Feather name="alert-triangle" size={16} color="#402018" />
                      <Text style={styles.errorBannerText}>
                        Synchroniseren lukt niet. Trek omlaag om te verversen.
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.filterCard}>
                    <Text style={styles.filterTitle}>Weergave</Text>
                    <View style={styles.filterRow}>
                      {LIST_FILTERS.map((filter) => {
                        const isActive = listFilter === filter.key;
                        return (
                          <TouchableOpacity
                            key={filter.key}
                            style={[styles.filterChip, isActive && styles.filterChipActive]}
                            onPress={() => setListFilter(filter.key)}>
                            <Text
                              style={[
                                styles.filterChipText,
                                isActive && styles.filterChipTextActive,
                              ]}>
                              {filter.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.historyCard}
                    onPress={() => router.push('/groceries-history')}
                    activeOpacity={0.85}>
                    <View style={styles.historyIconWrap}>
                      <Feather name="clock" size={16} color={palette.deepClay} />
                    </View>
                    <View style={styles.historyBody}>
                      <Text style={styles.historyTitle}>Historie</Text>
                      <Text style={styles.historySubtitle}>
                        Zie wat er is toegevoegd of verwijderd in de lijst.
                      </Text>
                    </View>
                    <Feather name="arrow-right" size={16} color={palette.deepClay} />
                  </TouchableOpacity>
                </View>
              }
              ListEmptyComponent={renderListEmpty}
              ListFooterComponent={
                displayItems.length > 0 ? (
                  <View style={styles.footerSpacer}>
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
                    <View style={styles.bottomSpacer} />
                  </View>
                ) : (
                  <View style={styles.bottomSpacer} />
                )
              }
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
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
  const theme = tileThemeForItem(item.name);

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
        style={[
          styles.itemTile,
          item.checked && styles.itemTileChecked,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}>
        <View style={styles.itemTileHeader}>
          <View style={[styles.itemEmojiBubble, { backgroundColor: theme.accent }]}>
            <Text style={styles.itemEmoji}>{iconForItem(item.name)}</Text>
          </View>
          <TouchableOpacity
            onPress={onToggle}
            style={[styles.tileCheckButton, item.checked && styles.tileCheckButtonChecked]}>
            <Feather
              name={item.checked ? 'check' : 'plus'}
              size={16}
              color={item.checked ? '#FFFFFF' : palette.clay}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.itemTileBody}>
          <Text style={[styles.itemTileName, item.checked && styles.itemTileNameChecked]}>
            {item.name}
          </Text>
          <Text style={styles.itemTileQuantity}>
            {item.quantity > 1 ? `${item.quantity} stuks` : '1 stuk'}
          </Text>
        </View>
        <View style={styles.itemTileFooter}>
          <Text style={styles.itemTileStatus}>{item.checked ? 'Afgevinkt' : 'Nog nodig'}</Text>
          <TouchableOpacity style={styles.itemDeletePill} onPress={onDelete}>
            <Feather name="trash-2" size={14} color="#FFFFFF" />
            <Text style={styles.itemDeletePillText}>Verwijderen</Text>
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
  heroCard: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 18 },
    shadowRadius: 28,
    elevation: 12,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  appEyebrow: {
    ...textStyles.caption,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: 'rgba(63,31,30,0.6)',
  },
  appTitle: {
    fontSize: 30,
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
  historyShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(63,31,30,0.08)',
  },
  historyShortcutText: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.deepClay,
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
    backgroundColor: 'rgba(63,31,30,0.08)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  summaryBadgeText: {
    ...textStyles.caption,
    color: palette.clay,
    fontWeight: '600',
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(63,31,30,0.08)',
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressTitle: {
    fontWeight: '600',
    color: 'rgba(63,31,30,0.75)',
  },
  progressValue: {
    fontWeight: '700',
    color: palette.clay,
  },
  progressBar: {
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(63,31,30,0.12)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: palette.coral,
  },
  addPanel: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    backgroundColor: '#FFFFFF',
    gap: spacing.lg,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 14 },
    shadowRadius: 24,
    elevation: 10,
  },
  addPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addPanelTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.clay,
  },
  addPanelSubtitle: {
    ...textStyles.caption,
    color: 'rgba(63,31,30,0.65)',
  },
  addPanelEmoji: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: 'rgba(63,31,30,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPanelEmojiText: {
    fontSize: 26,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(63,31,30,0.06)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: palette.clay,
    paddingVertical: spacing.sm,
  },
  quickAddButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: '#FFFFFF',
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
  quickAddToggle: {
    flexDirection: 'row',
    gap: spacing.xs,
    backgroundColor: 'rgba(63,31,30,0.08)',
    borderRadius: radius.pill,
    padding: spacing.xs / 2,
  },
  quickAddToggleButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  quickAddToggleButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 6,
  },
  quickAddToggleText: {
    ...textStyles.caption,
    fontWeight: '600',
    color: 'rgba(63,31,30,0.6)',
  },
  quickAddToggleTextActive: {
    color: palette.clay,
  },
  quickTileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickTile: {
    flexGrow: 1,
    minWidth: 120,
    borderRadius: radius.lg,
    padding: spacing.md,
    backgroundColor: 'rgba(63,31,30,0.04)',
    alignItems: 'flex-start',
    gap: spacing.xs / 2,
  },
  quickTileEmoji: {
    fontSize: 22,
  },
  quickTileLabel: {
    fontWeight: '600',
    color: palette.clay,
  },
  suggestionEmpty: {
    ...textStyles.caption,
    color: 'rgba(63,31,30,0.6)',
  },
  actionButton: {
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
  filterCard: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 6,
  },
  filterTitle: {
    fontWeight: '700',
    color: palette.clay,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(63,31,30,0.12)',
    backgroundColor: '#FFFFFF',
  },
  filterChipActive: {
    backgroundColor: '#FFE5CC',
    borderColor: '#FFC999',
  },
  filterChipText: {
    fontWeight: '600',
    color: 'rgba(63,31,30,0.6)',
  },
  filterChipTextActive: {
    color: palette.clay,
  },
  historyCard: {
    marginTop: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: '#FFF4EA',
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    shadowColor: '#00000014',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 18,
    elevation: 4,
  },
  historyIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: '#FFE3C6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyBody: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  historyTitle: {
    fontWeight: '700',
    color: palette.deepClay,
    fontSize: 15,
  },
  historySubtitle: {
    color: palette.clay,
    fontSize: 13,
    lineHeight: 18,
  },
  listContent: {
    paddingBottom: spacing.xl * 4,
    gap: spacing.md,
  },
  listItemWrapper: {
    gap: spacing.xs,
  },
  groupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  groupHeaderTitle: {
    fontWeight: '700',
    color: 'rgba(63,31,30,0.7)',
  },
  groupHeaderDivider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(63,31,30,0.12)',
  },
  footerSpacer: {
    gap: spacing.md,
  },
  filterEmptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.xs,
  },
  filterEmptyTitle: {
    fontWeight: '600',
    color: palette.clay,
  },
  filterEmptySubtitle: {
    ...textStyles.caption,
    color: 'rgba(63,31,30,0.7)',
  },
  itemTile: {
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 18 },
    shadowRadius: 24,
    elevation: 10,
  },
  itemTileChecked: {
    opacity: 0.8,
  },
  itemTileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemEmojiBubble: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemEmoji: {
    fontSize: 28,
  },
  tileCheckButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(63,31,30,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  tileCheckButtonChecked: {
    backgroundColor: palette.mint,
    borderColor: palette.mint,
  },
  itemTileBody: {
    gap: spacing.xs / 2,
  },
  itemTileName: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.clay,
  },
  itemTileNameChecked: {
    color: 'rgba(63,31,30,0.55)',
    textDecorationLine: 'line-through',
  },
  itemTileQuantity: {
    ...textStyles.caption,
    color: 'rgba(63,31,30,0.65)',
  },
  itemTileFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTileStatus: {
    ...textStyles.caption,
    fontWeight: '600',
    color: 'rgba(63,31,30,0.6)',
  },
  itemDeletePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: '#EB5757',
  },
  itemDeletePillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
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
  clearText: {
    fontWeight: '600',
    color: palette.deepClay,
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
