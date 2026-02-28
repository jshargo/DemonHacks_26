import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Quest, QuestStop, QuestProgress } from '@/lib/types';

interface QuestState {
  quests: Quest[];
  stops: QuestStop[];
  progress: QuestProgress[];
  loading: boolean;

  /** Fetch all active quests */
  fetchQuests: () => Promise<void>;

  /** Fetch stops for a specific quest (with joined place data) */
  fetchStops: (questId: string) => Promise<void>;

  /** Fetch user's progress across all quests */
  fetchProgress: (userId: string) => Promise<void>;

  /** Check in at a quest stop */
  checkIn: (userId: string, questId: string, questStopId: string) => Promise<void>;

  /** Check if a specific stop has been completed */
  isStopCompleted: (questStopId: string) => boolean;

  /** Get completed stop count for a quest */
  getQuestCompletedCount: (questId: string) => number;
}

export const useQuestStore = create<QuestState>((set, get) => ({
  quests: [],
  stops: [],
  progress: [],
  loading: false,

  fetchQuests: async () => {
    set({ loading: true });
    const { data } = await supabase
      .from('quests')
      .select('*')
      .eq('is_active', true)
      .order('created_at');

    set({ quests: (data as Quest[]) ?? [], loading: false });
  },

  fetchStops: async (questId) => {
    set({ loading: true });
    const { data } = await supabase
      .from('quest_stops')
      .select('*, place:places(*)')
      .eq('quest_id', questId)
      .order('stop_order');

    set({ stops: (data as QuestStop[]) ?? [], loading: false });
  },

  fetchProgress: async (userId) => {
    const { data } = await supabase
      .from('quest_progress')
      .select('*')
      .eq('user_id', userId);

    set({ progress: (data as QuestProgress[]) ?? [] });
  },

  checkIn: async (userId, questId, questStopId) => {
    const { data, error } = await supabase
      .from('quest_progress')
      .insert({ user_id: userId, quest_id: questId, quest_stop_id: questStopId })
      .select()
      .single();

    if (!error && data) {
      set((state) => ({ progress: [...state.progress, data as QuestProgress] }));
    }
  },

  isStopCompleted: (questStopId) => {
    return get().progress.some((p) => p.quest_stop_id === questStopId);
  },

  getQuestCompletedCount: (questId) => {
    return get().progress.filter((p) => p.quest_id === questId).length;
  },
}));
