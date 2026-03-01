import { useEffect, useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuestStore } from '@/stores/quest-store';
import { useAuthStore } from '@/stores/auth-store';
import type { LocalQuest } from '@/hooks/useQuests';

export interface StopProgress {
  stopOrder: number;
  completed: boolean;
}

interface QuestProgressState {
  stopProgress: StopProgress[];
  completedCount: number;
  totalStops: number;
  allStopsComplete: boolean;
  questCompleted: boolean;
  loading: boolean;
  checkingIn: boolean;
  checkInStop: (stopOrder: number) => Promise<boolean>;
  claimQuestReward: () => Promise<boolean>;
  xpEarned: number;
}

const STORAGE_PREFIX = 'quest_progress_';
const COMPLETED_PREFIX = 'quest_completed_';

/** Persist checked-in stop orders to AsyncStorage (keyed by userId to isolate per-user progress) */
async function loadLocalProgress(questId: string, userId: string): Promise<Set<number>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_PREFIX + userId + '_' + questId);
    if (raw) return new Set(JSON.parse(raw) as number[]);
  } catch {}
  return new Set();
}

async function saveLocalProgress(questId: string, userId: string, completed: Set<number>) {
  try {
    await AsyncStorage.setItem(
      STORAGE_PREFIX + userId + '_' + questId,
      JSON.stringify(Array.from(completed)),
    );
  } catch {}
}

async function loadQuestCompleted(questId: string, userId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(COMPLETED_PREFIX + userId + '_' + questId)) === '1';
  } catch {
    return false;
  }
}

async function saveQuestCompleted(questId: string, userId: string) {
  try {
    await AsyncStorage.setItem(COMPLETED_PREFIX + userId + '_' + questId, '1');
  } catch {}
}

/**
 * Local-first quest progress hook.
 *
 * Progress is always tracked in AsyncStorage so check-ins work regardless of
 * whether the Supabase backend is seeded. When Supabase is available it also
 * records check-ins server-side and updates the user's XP.
 */
export function useQuestProgress(localQuest: LocalQuest | null): QuestProgressState {
  const userId = useAuthStore((s) => s.session?.user?.id ?? null);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const bumpXpVersion = useAuthStore((s) => s.bumpXpVersion);
  const { fetchQuestByTitle, fetchSteps, fetchProgress, checkIn, completeQuest } =
    useQuestStore();

  const [completedStops, setCompletedStops] = useState<Set<number>>(new Set());
  const [questCompleted, setQuestCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);

  // Server quest ID (null if DB not seeded)
  const serverQuestIdRef = useRef<string | null>(null);
  const initializedRef = useRef(false);

  // Load progress on mount
  useEffect(() => {
    if (!localQuest || initializedRef.current) return;
    initializedRef.current = true;

    (async () => {
      setLoading(true);

      // 1. Load local progress from AsyncStorage (always works)
      const localProgress = await loadLocalProgress(localQuest.id, userId ?? '');
      const wasCompleted = await loadQuestCompleted(localQuest.id, userId ?? '');
      setCompletedStops(localProgress);
      setQuestCompleted(wasCompleted);

      // 2. Try to connect to Supabase (optional — may fail if DB not seeded)
      if (userId) {
        try {
          const serverQuest = await fetchQuestByTitle(localQuest.name);
          if (serverQuest) {
            serverQuestIdRef.current = serverQuest.id;
            await fetchSteps(serverQuest.id);
            await fetchProgress(userId);

            // Merge any server progress into local state
            const serverSteps = useQuestStore.getState().steps.filter(
              (s) => s.quest_id === serverQuest.id,
            );
            const serverProgress = useQuestStore.getState().progress;
            const serverCompletedStepIds = new Set(
              serverProgress.map((p) => p.quest_step_id),
            );

            let merged = false;
            for (const step of serverSteps) {
              if (serverCompletedStepIds.has(step.id) && !localProgress.has(step.step_order)) {
                localProgress.add(step.step_order);
                merged = true;
              }
            }
            if (merged) {
              setCompletedStops(new Set(localProgress));
              await saveLocalProgress(localQuest.id, userId ?? '', localProgress);
            }
          }
        } catch {
          // Supabase not available — that's fine, local progress is loaded
        }
      }

      setLoading(false);
    })();
  }, [localQuest?.id, userId]);

  // Build progress array
  const stopProgress: StopProgress[] = (localQuest?.stops ?? []).map((stop) => ({
    stopOrder: stop.stop_order,
    completed: completedStops.has(stop.stop_order),
  }));

  const completedCount = stopProgress.filter((s) => s.completed).length;
  const totalStops = stopProgress.length;
  const allStopsComplete = totalStops > 0 && completedCount === totalStops;

  const xpEarned = (localQuest?.stops ?? []).reduce((sum, stop) => {
    return sum + (completedStops.has(stop.stop_order) ? stop.xp_reward : 0);
  }, 0);

  const checkInStop = useCallback(
    async (stopOrder: number): Promise<boolean> => {
      if (!localQuest || completedStops.has(stopOrder)) return false;

      setCheckingIn(true);

      // 1. Update local state immediately
      const next = new Set(completedStops);
      next.add(stopOrder);
      setCompletedStops(next);
      await saveLocalProgress(localQuest.id, userId ?? '', next);

      // 2. Try to sync to Supabase if server quest is available
      if (userId && serverQuestIdRef.current) {
        try {
          const serverSteps = useQuestStore.getState().steps.filter(
            (s) => s.quest_id === serverQuestIdRef.current,
          );
          const serverStep = serverSteps.find((s) => s.step_order === stopOrder);
          if (serverStep) {
            const localStop = localQuest.stops.find((s) => s.stop_order === stopOrder);
            const placeId = serverStep.target_type === 'place' ? serverStep.target_id : null;
            await checkIn(userId, serverStep.id, placeId, localStop?.xp_reward ?? 25);
            await fetchProfile();
            bumpXpVersion();
          }
        } catch {
          // Server sync failed — local progress is saved, that's OK
        }
      }

      setCheckingIn(false);
      return true;
    },
    [localQuest, completedStops, userId, checkIn, fetchProfile, bumpXpVersion],
  );

  const claimQuestReward = useCallback(async (): Promise<boolean> => {
    if (!localQuest || questCompleted) return false;

    setQuestCompleted(true);
    await saveQuestCompleted(localQuest.id, userId ?? '');

    // Try to award XP server-side
    if (userId && serverQuestIdRef.current) {
      try {
        await completeQuest(userId, serverQuestIdRef.current, localQuest.xp_reward);
        fetchProfile();
        bumpXpVersion();
      } catch {
        // Server sync failed — quest is marked complete locally
      }
    }

    return true;
  }, [localQuest, questCompleted, userId, completeQuest, fetchProfile, bumpXpVersion]);

  return {
    stopProgress,
    completedCount,
    totalStops,
    allStopsComplete,
    questCompleted,
    loading,
    checkingIn,
    checkInStop,
    claimQuestReward,
    xpEarned,
  };
}
