import { useEffect } from 'react';
import { useSavedSpotsStore } from '@/stores/saved-spots-store';
import { useAuthStore } from '@/stores/auth-store';

/** Convenience hook to fetch and manage the current user's saved spots */
export function useSavedSpots() {
  const session = useAuthStore((s) => s.session);
  const { savedSpots, loading, fetchSavedSpots, saveSpot, unsaveSpot, isSaved } =
    useSavedSpotsStore();

  const userId = session?.user?.id;

  useEffect(() => {
    if (userId) {
      fetchSavedSpots(userId);
    }
  }, [userId]);

  return {
    savedSpots,
    loading,
    saveSpot: (entityType: Parameters<typeof saveSpot>[1], entityId: string) =>
      userId ? saveSpot(userId, entityType, entityId) : Promise.resolve(),
    unsaveSpot,
    isSaved,
  };
}
