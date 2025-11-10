import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { colors, radius, spacing, textStyles } from '@/lib/theme';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useActiveHousehold, useSession } from '@/state/sessionStore';
import { logSupabaseError } from '@/utils/logging';
import { toast } from '@/utils/toast';

type List = {
  id: string;
  name: string;
};

type HistoryAction = 'added' | 'deleted' | 'cleared';

type HistoryEntry = {
  id: string;
  action: HistoryAction;
  itemName: string;
  quantity: number;
  userLabel: string | null;
  createdAt: string;
};

const HISTORY_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const HISTORY_FETCH_LIMIT = 100;

const ACTION_LABELS: Record<HistoryAction, string> = {
  added: 'Toegevoegd',
  deleted: 'Verwijderd',
  cleared: 'Lijst geleegd',
};

const CLEAR_EVENT_LABEL = 'Lijst geleegd';

function formatQuantityLabel(entry: HistoryEntry) {
  if (entry.action === 'cleared') {
    if (!entry.quantity) return 'Geen items verwijderd';
    return entry.quantity === 1 ? '1 item verwijderd' : `${entry.quantity} items verwijderd`;
  }
  return `(${entry.quantity}x)`;
}

export default function GroceriesHistoryScreen() {
  const router = useRouter();
  const { session } = useSession();
  const { activeHouseholdId } = useActiveHousehold();
  const [list, setList] = useState<List | null>(null);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadListAndHistory = useCallback(async () => {
    if (!session || !activeHouseholdId) {
      setLoading(false);
      return;
    }
    if (!isSupabaseConfigured || !supabase) {
      toast('Supabase is niet geconfigureerd. Voeg je gegevens toe.');
      setLoading(false);
      return;
    }

    try {
      const { data: lists, error: listError } = await supabase
        .from('lists')
        .select('id, name')
        .eq('household_id', activeHouseholdId)
        .order('created_at', { ascending: true })
        .limit(1);

      if (listError || !lists?.[0]) {
        logSupabaseError('lists.select', listError, {
          screen: 'GroceriesHistory',
          activeHouseholdId,
        });
        toast('Geen boodschappenlijst gevonden.');
        setLoading(false);
        return;
      }

      const selectedList: List = { id: lists[0].id, name: lists[0].name };
      setList(selectedList);

      const retentionDate = new Date(Date.now() - HISTORY_RETENTION_MS).toISOString();
      const { error: cleanupError } = await supabase
        .from('list_history')
        .delete()
        .eq('list_id', selectedList.id)
        .lt('created_at', retentionDate);
      if (cleanupError) {
        logSupabaseError('list_history.delete', cleanupError, {
          screen: 'GroceriesHistory',
          listId: selectedList.id,
        });
      }

      const { data: historyRows, error: historyError } = await supabase
        .from('list_history')
        .select('id, action, item_name, quantity, user_email, created_at')
        .eq('list_id', selectedList.id)
        .order('created_at', { ascending: false })
        .limit(HISTORY_FETCH_LIMIT);

      if (historyError) {
        logSupabaseError('list_history.select', historyError, {
          screen: 'GroceriesHistory',
          listId: selectedList.id,
        });
        toast('Historie laden is niet gelukt.');
        setLoading(false);
        return;
      }

      const mapped =
        historyRows?.map((row) => {
          const isClearEvent = row.action === 'deleted' && row.item_name === CLEAR_EVENT_LABEL;
          return {
            id: row.id,
            action: (isClearEvent ? 'cleared' : row.action) as HistoryEntry['action'],
            itemName: row.item_name,
            quantity: row.quantity,
            userLabel: row.user_email,
            createdAt: row.created_at,
          };
        }) ?? [];
      setEntries(mapped);
      setLoading(false);
    } catch (error) {
      console.error('[GroceriesHistory] Failed to load history', error);
      toast('Er ging iets mis bij het laden.');
      setLoading(false);
    }
  }, [activeHouseholdId, session]);

  useEffect(() => {
    void loadListAndHistory();
  }, [loadListAndHistory]);

  const groupedEntries = useMemo(() => {
    return entries.reduce<Record<string, HistoryEntry[]>>((acc, entry) => {
      const dateKey = new Date(entry.createdAt).toLocaleDateString('nl-NL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
      acc[dateKey] = acc[dateKey] ? [...acc[dateKey], entry] : [entry];
      return acc;
    }, {});
  }, [entries]);

  const sectionKeys = useMemo(
    () =>
      Object.keys(groupedEntries).sort(
        (a, b) => new Date(b).getTime() - new Date(a).getTime(),
      ),
    [groupedEntries],
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Feather name="clock" size={32} color={palette.deepClay} />
      <Text style={styles.emptyTitle}>Nog geen historie</Text>
      <Text style={styles.emptySubtitle}>
        Voeg of verwijder items in de boodschappenlijst om gebeurtenissen te zien.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color={palette.deepClay} />
          <Text style={styles.backText}>Terug</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Historie</Text>
        <View style={styles.backPlaceholder} />
      </View>
      <Text style={styles.headerSubtitle}>
        {list ? `Laatste 7 dagen • ${list.name}` : 'Laatste 7 dagen'}
      </Text>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={palette.deepClay} />
          <Text style={styles.loaderText}>Historie laden…</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {sectionKeys.length === 0 ? (
            renderEmptyState()
          ) : (
            sectionKeys.map((section) => {
              const sectionEntries = groupedEntries[section];
              return (
                <View key={section} style={styles.section}>
                  <Text style={styles.sectionTitle}>{section}</Text>
                  <View style={styles.sectionList}>
                    {sectionEntries.map((entry) => (
                      <View key={entry.id} style={styles.entryCard}>
                        <View style={styles.entryHeader}>
                          <Text style={styles.entryAction}>
                            {ACTION_LABELS[entry.action]}
                          </Text>
                          <Text style={styles.entryTime}>
                            {new Date(entry.createdAt).toLocaleTimeString('nl-NL', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Text>
                        </View>
                        <Text style={styles.entryName}>
                          {entry.itemName}{' '}
                          <Text style={styles.entryQuantity}>{formatQuantityLabel(entry)}</Text>
                        </Text>
                        <Text style={styles.entryMeta}>
                          door {entry.userLabel ?? 'Onbekend'}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const palette = {
  deepClay: '#3F2E2C',
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  backText: {
    fontWeight: '600',
    color: palette.deepClay,
  },
  backPlaceholder: {
    width: 48,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    ...textStyles.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs / 2,
    marginBottom: spacing.md,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loaderText: {
    color: colors.textSecondary,
  },
  content: {
    paddingBottom: spacing.xl * 2,
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    textTransform: 'capitalize',
  },
  sectionList: {
    gap: spacing.sm,
  },
  entryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs / 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  entryAction: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.deepClay,
  },
  entryTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  entryName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  entryQuantity: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  entryMeta: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptySubtitle: {
    textAlign: 'center',
    color: colors.textSecondary,
  },
});
