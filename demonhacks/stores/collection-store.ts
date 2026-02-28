import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Collection, CollectionItem, EntityType } from '@/lib/types';

interface CollectionState {
  collections: Collection[];
  items: CollectionItem[];
  loading: boolean;

  /** Fetch all collections for the current user */
  fetchCollections: (userId: string) => Promise<void>;

  /** Fetch items in a specific collection */
  fetchItems: (collectionId: string) => Promise<void>;

  /** Create a new named collection */
  createCollection: (userId: string, name: string) => Promise<Collection | null>;

  /** Add an item (place or event) to a collection */
  addItem: (collectionId: string, itemType: EntityType, itemId: string) => Promise<void>;

  /** Remove an item from a collection */
  removeItem: (itemId: string) => Promise<void>;

  /** Check if an entity is saved in any collection */
  isSaved: (itemType: EntityType, itemId: string) => boolean;

  /** Delete a collection */
  deleteCollection: (collectionId: string) => Promise<void>;
}

export const useCollectionStore = create<CollectionState>((set, get) => ({
  collections: [],
  items: [],
  loading: false,

  fetchCollections: async (userId) => {
    set({ loading: true });
    const { data } = await supabase
      .from('collections')
      .select('*')
      .eq('user_id', userId)
      .order('created_at');

    set({ collections: (data as Collection[]) ?? [], loading: false });
  },

  fetchItems: async (collectionId) => {
    set({ loading: true });
    const { data } = await supabase
      .from('collection_items')
      .select('*')
      .eq('collection_id', collectionId)
      .order('added_at', { ascending: false });

    set({ items: (data as CollectionItem[]) ?? [], loading: false });
  },

  createCollection: async (userId, name) => {
    const { data, error } = await supabase
      .from('collections')
      .insert({ user_id: userId, name })
      .select()
      .single();

    if (!error && data) {
      const collection = data as Collection;
      set((state) => ({ collections: [...state.collections, collection] }));
      return collection;
    }
    return null;
  },

  addItem: async (collectionId, itemType, itemId) => {
    const { data, error } = await supabase
      .from('collection_items')
      .insert({ collection_id: collectionId, item_type: itemType, item_id: itemId })
      .select()
      .single();

    if (!error && data) {
      set((state) => ({ items: [data as CollectionItem, ...state.items] }));
    }
  },

  removeItem: async (itemId) => {
    await supabase.from('collection_items').delete().eq('id', itemId);
    set((state) => ({ items: state.items.filter((i) => i.id !== itemId) }));
  },

  isSaved: (itemType, itemId) => {
    return get().items.some(
      (i) => i.item_type === itemType && i.item_id === itemId
    );
  },

  deleteCollection: async (collectionId) => {
    await supabase.from('collections').delete().eq('id', collectionId);
    set((state) => ({
      collections: state.collections.filter((c) => c.id !== collectionId),
      items: state.items.filter((i) => i.collection_id !== collectionId),
    }));
  },
}));
