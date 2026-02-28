import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { SavedSpot, EntityType } from '@/lib/types';

interface SavedSpotsState {
  savedSpots: SavedSpot[];
  loading: boolean;

  /** Fetch all saved spots for the current user */
  fetchSavedSpots: (userId: string) => Promise<void>;

  /** Save a spot (restaurant, event, or activity) */
  saveSpot: (userId: string, entityType: EntityType, entityId: string) => Promise<void>;

  /** Unsave a spot */
  unsaveSpot: (savedSpotId: string) => Promise<void>;

  /** Check if a specific entity is saved */
  isSaved: (entityType: EntityType, entityId: string) => boolean;
}

export const useSavedSpotsStore = create<SavedSpotsState>((set, get) => ({
  savedSpots: [],
  loading: false,

  fetchSavedSpots: async (userId) => {
    set({ loading: true });
    const { data } = await supabase
      .from('saved_spots')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    set({ savedSpots: (data as SavedSpot[]) ?? [], loading: false });
  },

  saveSpot: async (userId, entityType, entityId) => {
    const { data, error } = await supabase
      .from('saved_spots')
      .insert({ user_id: userId, entity_type: entityType, entity_id: entityId })
      .select()
      .single();

    if (!error && data) {
      set((state) => ({ savedSpots: [data as SavedSpot, ...state.savedSpots] }));
    }
  },

  unsaveSpot: async (savedSpotId) => {
    await supabase.from('saved_spots').delete().eq('id', savedSpotId);

    set((state) => ({
      savedSpots: state.savedSpots.filter((s) => s.id !== savedSpotId),
    }));
  },

  isSaved: (entityType, entityId) => {
    return get().savedSpots.some(
      (s) => s.entity_type === entityType && s.entity_id === entityId
    );
  },
}));
