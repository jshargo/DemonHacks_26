import { useEffect } from 'react';
import { useCollectionStore } from '@/stores/collection-store';
import { useAuthStore } from '@/stores/auth-store';
import type { EntityType } from '@/lib/types';

/** Convenience hook to fetch and manage the current user's saved items */
export function useCollections() {
  const session = useAuthStore((s) => s.session);
  const {
    items,
    loading,
    fetchSavedItems,
    addItem,
    removeItem,
    isSaved,
    findSavedItem,
  } = useCollectionStore();

  const userId = session?.user?.id;

  useEffect(() => {
    if (userId) {
      fetchSavedItems(userId);
    }
  }, [userId]);

  return {
    items,
    loading,
    addItem: (itemType: EntityType, itemId: string) =>
      userId ? addItem(userId, itemType, itemId) : Promise.resolve(),
    removeItem,
    isSaved,
    findSavedItem,
  };
}
