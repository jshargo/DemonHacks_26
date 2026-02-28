import { useEffect } from 'react';
import { useCollectionStore } from '@/stores/collection-store';
import { useAuthStore } from '@/stores/auth-store';
import type { EntityType } from '@/lib/types';

/** Convenience hook to fetch and manage the current user's collections */
export function useCollections() {
  const session = useAuthStore((s) => s.session);
  const {
    collections,
    items,
    loading,
    fetchCollections,
    fetchItems,
    createCollection,
    addItem,
    removeItem,
    deleteCollection,
    isSaved,
  } = useCollectionStore();

  const userId = session?.user?.id;

  useEffect(() => {
    if (userId) {
      fetchCollections(userId);
    }
  }, [userId]);

  return {
    collections,
    items,
    loading,
    fetchItems,
    createCollection: (name: string) =>
      userId ? createCollection(userId, name) : Promise.resolve(null),
    addItem: (collectionId: string, itemType: EntityType, itemId: string) =>
      addItem(collectionId, itemType, itemId),
    removeItem,
    deleteCollection,
    isSaved,
  };
}
