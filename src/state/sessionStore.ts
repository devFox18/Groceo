import { useEffect, type ReactNode } from 'react';
import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type SessionState = {
  session: Session | null;
  isLoading: boolean;
  hasInitialized: boolean;
  activeHouseholdId: string | null;
  setState: (partial: Partial<Omit<SessionState, 'setState' | 'setActiveHouseholdId'>>) => void;
  setActiveHouseholdId: (id: string | null) => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  isLoading: true,
  hasInitialized: false,
  activeHouseholdId: null,
  setState: (partial) => set((state) => ({ ...state, ...partial })),
  setActiveHouseholdId: (id) => set((state) => ({ ...state, activeHouseholdId: id })),
}));

let subscription: { unsubscribe: () => void } | null = null;

export async function initializeSessionListener() {
  const { hasInitialized } = useSessionStore.getState();
  if (hasInitialized) {
    return;
  }

  useSessionStore.getState().setState({ hasInitialized: true, isLoading: true });

  if (!isSupabaseConfigured || !supabase) {
    useSessionStore
      .getState()
      .setState({ isLoading: false, session: null, activeHouseholdId: null });
    return;
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    useSessionStore
      .getState()
      .setState({ isLoading: false, session: null, activeHouseholdId: null });
  } else {
    useSessionStore.getState().setState({
      isLoading: false,
      session: data.session ?? null,
      activeHouseholdId: null,
    });
  }

  const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
    useSessionStore.getState().setState({
      session: session ?? null,
      isLoading: false,
      activeHouseholdId: session ? useSessionStore.getState().activeHouseholdId : null,
    });
  });

  subscription = listener.subscription;
}

export function cleanupSessionListener() {
  subscription?.unsubscribe();
  subscription = null;
  useSessionStore.getState().setState({ hasInitialized: false, activeHouseholdId: null });
}

export function useSession() {
  return useSessionStore((state) => ({
    session: state.session,
    isLoading: state.isLoading,
  }));
}

export function useActiveHousehold() {
  return useSessionStore((state) => ({
    activeHouseholdId: state.activeHouseholdId,
    setActiveHouseholdId: state.setActiveHouseholdId,
  }));
}

export function SessionProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    void initializeSessionListener();
    return () => cleanupSessionListener();
  }, []);

  return children;
}
