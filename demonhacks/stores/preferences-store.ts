import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

interface PreferencesState {
  /** Top-level category IDs selected on Screen 1 (max 5) */
  selectedCategories: string[];
  /** Subcategory selections keyed by category ID */
  selectedSubcategories: Record<string, string[]>;
  /** True once the user completes or skips onboarding */
  onboardingComplete: boolean;
  /** True while preferences are being fetched from Supabase */
  preferencesLoading: boolean;

  toggleCategory: (id: string) => void;
  toggleSubcategory: (categoryId: string, sub: string) => void;
  /** Replace the full subcategory array for a category (used with a cap) */
  setSubInterests: (categoryId: string, subs: string[]) => void;
  completeOnboarding: () => void;
  skipOnboarding: () => void;
  resetPreferences: () => void;
  /** Load preferences from Supabase — called on sign-in */
  loadFromSupabase: (userId: string) => Promise<void>;
}

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  selectedCategories: [],
  selectedSubcategories: {},
  onboardingComplete: false,
  preferencesLoading: false,

  toggleCategory: (id) => {
    const current = get().selectedCategories;
    if (current.includes(id)) {
      set({ selectedCategories: current.filter((c) => c !== id) });
    } else if (current.length < 5) {
      set({ selectedCategories: [...current, id] });
    }
  },

  toggleSubcategory: (categoryId, sub) => {
    const current = get().selectedSubcategories;
    const existing = current[categoryId] ?? [];
    const updated = existing.includes(sub)
      ? existing.filter((s) => s !== sub)
      : [...existing, sub];
    set({ selectedSubcategories: { ...current, [categoryId]: updated } });
  },

  setSubInterests: (categoryId, subs) => {
    const current = get().selectedSubcategories;
    set({ selectedSubcategories: { ...current, [categoryId]: subs } });
  },

  completeOnboarding: () => set({ onboardingComplete: true }),

  skipOnboarding: () =>
    set({ selectedCategories: [], selectedSubcategories: {}, onboardingComplete: true }),

  resetPreferences: () =>
    set({ selectedCategories: [], selectedSubcategories: {}, onboardingComplete: false }),

  loadFromSupabase: async (userId) => {
    set({ preferencesLoading: true });
    try {
      const [{ data: profile }, { data: prefs }] = await Promise.all([
        supabase.from('profiles').select('onboarding_completed').eq('id', userId).single(),
        supabase
          .from('user_onboarding_preferences')
          .select('selected_categories, selected_subcategories')
          .eq('user_id', userId)
          .single(),
      ]);

      set({
        onboardingComplete: profile?.onboarding_completed ?? false,
        selectedCategories: prefs?.selected_categories ?? [],
        selectedSubcategories: prefs?.selected_subcategories ?? {},
      });
    } finally {
      set({ preferencesLoading: false });
    }
  },
}));
