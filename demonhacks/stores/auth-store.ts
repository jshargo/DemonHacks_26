import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import type { UserProfile } from '@/lib/types';
import { usePreferencesStore } from '@/stores/preferences-store';

interface AuthState {
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;

  /** Initialize auth — call once in root layout */
  initialize: () => () => void;

  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string, displayName?: string) => Promise<void>;
  signOut: () => Promise<void>;

  /** Fetch the user's profile from the profiles table */
  fetchProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  loading: true,
  error: null,

  initialize: () => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Mark preferences as loading BEFORE setting session,
        // so the routing guard waits for preferences to arrive.
        usePreferencesStore.setState({ preferencesLoading: true });
      }
      set({ session, loading: false });
      if (session) get().fetchProfile();
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        // Block routing guard until preferences are loaded
        usePreferencesStore.setState({ preferencesLoading: true });
      }
      set({ session, loading: false, error: null });

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        get().fetchProfile();
      } else if (event === 'SIGNED_OUT') {
        set({ profile: null });
        usePreferencesStore.getState().resetPreferences();
      }
    });

    return () => subscription.unsubscribe();
  },

  signIn: async (email, password) => {
    set({ loading: true, error: null });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ loading: false, error: error.message });
    }
  },

  signUp: async (email, password, username, displayName) => {
    set({ loading: true, error: null });
    const {
      data: { session, user },
      error,
    } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName, username } },
    });

    if (error) {
      set({ loading: false, error: error.message });
      return;
    }

    // Create a row in public.profiles for this auth user
    // The DB trigger will auto-create a default "Favorites" collection
    if (user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: user.id,
        username: username,
        display_name: displayName ?? username,
      });
      if (profileError) {
        console.warn('Failed to create user profile:', profileError.message);
      }
    }

    if (!session) {
      set({ loading: false, error: 'Please check your inbox for email verification!' });
    }
  },

  signOut: async () => {
    set({ loading: true, error: null });
    const { error } = await supabase.auth.signOut();
    if (error) {
      set({ loading: false, error: error.message });
      return;
    }
    set({ loading: false });
  },

  fetchProfile: async () => {
    const userId = get().session?.user?.id;
    if (!userId) return;

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      set({ profile: data as UserProfile });
      // Load all preferences (categories, subcategories, onboarding status) from Supabase
      await usePreferencesStore.getState().loadFromSupabase(userId);
    }
  },
}));
