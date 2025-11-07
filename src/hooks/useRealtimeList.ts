import { useCallback, useEffect, useState } from 'react';

import { GroceryItem } from '@/components/ItemRow';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type State = {
  items: GroceryItem[];
  isLoading: boolean;
  error: string | null;
};

export function useRealtimeList(listId: string | null) {
  const [state, setState] = useState<State>({
    items: [],
    isLoading: Boolean(listId),
    error: null,
  });

  const refetch = useCallback(async () => {
    if (!listId) {
      setState((prev) => ({ ...prev, items: [], isLoading: false, error: null }));
      return;
    }
    if (!isSupabaseConfigured || !supabase) {
      setState((prev) => ({
        ...prev,
        items: [],
        isLoading: false,
        error: 'Supabase is niet geconfigureerd.',
      }));
      return;
    }
    setState((prev) => ({ ...prev, isLoading: true }));
    const { data, error } = await supabase
      .from('items')
      .select('id,name,quantity,checked,category')
      .eq('list_id', listId)
      .order('created_at', { ascending: true });

    if (error) {
      setState((prev) => ({ ...prev, error: error.message, isLoading: false }));
      return;
    }

    setState({
      items: data.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity ?? 1,
        checked: item.checked ?? false,
        category: item.category,
      })),
      isLoading: false,
      error: null,
    });
  }, [listId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    if (!listId || !isSupabaseConfigured || !supabase) {
      return;
    }

    const channel = supabase
      .channel(`items-list-${listId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'items',
          filter: `list_id=eq.${listId}`,
        },
        (payload) => {
          setState((prev) => {
            if (!prev) return prev;
            let newItems = prev.items.slice();
            if (payload.eventType === 'INSERT' && payload.new) {
              const exists = newItems.find((item) => item.id === payload.new.id);
              if (!exists) {
                newItems = [
                  ...newItems,
                  {
                    id: payload.new.id as string,
                    name: (payload.new.name as string) ?? '',
                    quantity: (payload.new.quantity as number) ?? 1,
                    checked: (payload.new.checked as boolean) ?? false,
                    category: (payload.new.category as string | null) ?? null,
                  },
                ];
              }
            }
            if (payload.eventType === 'UPDATE' && payload.new) {
              newItems = newItems.map((item) =>
                item.id === payload.new.id
                  ? {
                      id: payload.new.id as string,
                      name: (payload.new.name as string) ?? '',
                      quantity: (payload.new.quantity as number) ?? 1,
                      checked: (payload.new.checked as boolean) ?? false,
                      category: (payload.new.category as string | null) ?? null,
                    }
                  : item
              );
            }
            if (payload.eventType === 'DELETE' && payload.old) {
              newItems = newItems.filter((item) => item.id !== payload.old.id);
            }
            return { ...prev, items: newItems };
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [listId]);

  return { ...state, refetch };
}
