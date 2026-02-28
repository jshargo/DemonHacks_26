import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PreferencesState {
  /** Top-level category IDs selected on Screen 1 (max 5) */
  selectedCategories: string[];
  /** Subcategory selections keyed by category ID */
  selectedSubcategories: Record<string, string[]>;
  /** True once the user completes or skips onboarding */
  onboardingComplete: boolean;

  toggleCategory: (id: string) => void;
  toggleSubcategory: (categoryId: string, sub: string) => void;
  completeOnboarding: () => void;
  skipOnboarding: () => void;
  resetPreferences: () => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      selectedCategories: [],
      selectedSubcategories: {},
      onboardingComplete: false,

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

      completeOnboarding: () => set({ onboardingComplete: true }),

      skipOnboarding: () =>
        set({ selectedCategories: [], selectedSubcategories: {}, onboardingComplete: true }),

      resetPreferences: () =>
        set({ selectedCategories: [], selectedSubcategories: {}, onboardingComplete: false }),
    }),
    {
      name: 'user-preferences',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
