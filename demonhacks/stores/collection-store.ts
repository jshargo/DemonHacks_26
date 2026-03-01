import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { SavedItem, SavedItemWithPlace, Place, EntityType } from '@/lib/types';

interface SavedItemsState {
  items: SavedItemWithPlace[];
  loading: boolean;

  /** Fetch all saved items for the current user (with place data) */
  fetchSavedItems: (userId: string) => Promise<void>;

  /** Save an item (place or event) */
  addItem: (userId: string, itemType: EntityType, itemId: string) => Promise<void>;

  /** Remove a saved item */
  removeItem: (savedItemId: string) => Promise<void>;

  /** Check if an entity is saved */
  isSaved: (itemId: string) => boolean;

  /** Find the saved_items row for an entity (for deletion) */
  findSavedItem: (itemId: string) => SavedItemWithPlace | undefined;
}

export const useCollectionStore = create<SavedItemsState>((set, get) => ({
  items: [],
  loading: false,

  fetchSavedItems: async (userId) => {
    set({ loading: true });

    // Fetch saved items
    const { data: savedItems, error } = await supabase
      .from('saved_items')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !savedItems) {
      set({ items: [], loading: false });
      return;
    }

    // Batch-fetch place data for saved places
    const placeIds = (savedItems as SavedItem[])
      .filter((si) => si.item_type === 'place')
      .map((si) => si.item_id);

    let placesMap: Record<string, Place> = {};
    if (placeIds.length > 0) {
      const { data: places } = await supabase
        .from('places')
        .select('*')
        .in('id', placeIds);

      if (places) {
        for (const p of places as Place[]) {
          placesMap[p.id] = p;
        }
      }
    }

    // Merge
    const enriched: SavedItemWithPlace[] = (savedItems as SavedItem[]).map((si) => ({
      ...si,
      place: si.item_type === 'place' ? placesMap[si.item_id] : undefined,
    }));

    set({ items: enriched, loading: false });
  },

  addItem: async (userId, itemType, itemId) => {
    const { data, error } = await supabase
      .from('saved_items')
      .insert({ user_id: userId, item_type: itemType, item_id: itemId })
      .select()
      .single();

    if (!error && data) {
      // Fetch place data if it's a place
      let place: Place | undefined;
      if (itemType === 'place') {
        const { data: placeData } = await supabase
          .from('places')
          .select('*')
          .eq('id', itemId)
          .single();
        place = placeData as Place | undefined;
      }

      set((state) => ({
        items: [{ ...(data as SavedItem), place } as SavedItemWithPlace, ...state.items],
      }));
    }
  },

  removeItem: async (savedItemId) => {
    await supabase.from('saved_items').delete().eq('id', savedItemId);
    set((state) => ({ items: state.items.filter((i) => i.id !== savedItemId) }));
  },

  isSaved: (itemId) => {
    return get().items.some((i) => i.item_id === itemId);
  },

  findSavedItem: (itemId) => {
    return get().items.find((i) => i.item_id === itemId);
  },
}));
