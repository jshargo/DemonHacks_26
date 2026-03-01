import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Quest, QuestStep, QuestCheckin, Place } from '@/lib/types';

interface QuestState {
  quests: Quest[];
  steps: QuestStep[];
  progress: QuestCheckin[];
  loading: boolean;
  /** Tracks quests whose completion XP has already been awarded */
  completedQuestIds: Set<string>;

  /** Fetch all active quests */
  fetchQuests: () => Promise<void>;

  /** Find a server quest by its title (for bridging local JSON → Supabase) */
  fetchQuestByTitle: (title: string) => Promise<Quest | null>;

  /** Fetch steps for a specific quest (with place data resolved via target_id) */
  fetchSteps: (questId: string) => Promise<void>;

  /** Fetch user's quest check-in progress */
  fetchProgress: (userId: string) => Promise<void>;

  /** Check in at a quest step and award step XP to the user profile */
  checkIn: (userId: string, questStepId: string, placeId: string | null, xpReward?: number) => Promise<boolean>;

  /** Award quest-completion bonus XP (called once when all stops are done) */
  completeQuest: (userId: string, questId: string, bonusXp: number) => Promise<boolean>;

  /** Check if a specific step has been completed */
  isStepCompleted: (questStepId: string) => boolean;

  /** Get completed step count for a quest */
  getQuestCompletedCount: (questId: string) => number;
}

export const useQuestStore = create<QuestState>((set, get) => ({
  quests: [],
  steps: [],
  progress: [],
  loading: false,
  completedQuestIds: new Set(),

  fetchQuests: async () => {
    set({ loading: true });
    const { data } = await supabase
      .from('quests')
      .select('*')
      .eq('is_active', true)
      .order('created_at');

    set({ quests: (data as Quest[]) ?? [], loading: false });
  },

  fetchQuestByTitle: async (title) => {
    const { data } = await supabase
      .from('quests')
      .select('*')
      .eq('is_active', true)
      .ilike('title', title)
      .maybeSingle();

    return (data as Quest) ?? null;
  },

  fetchSteps: async (questId) => {
    set({ loading: true });

    // Fetch steps for this quest
    const { data: stepsData } = await supabase
      .from('quest_steps')
      .select('*')
      .eq('quest_id', questId)
      .order('step_order');

    const steps = (stepsData ?? []) as QuestStep[];

    // Resolve place data for steps that target places
    const placeIds = steps
      .filter((s) => s.target_type === 'place')
      .map((s) => s.target_id);

    if (placeIds.length > 0) {
      const { data: placesData } = await supabase
        .from('places')
        .select('*')
        .in('id', placeIds);

      const placeMap = new Map<string, Place>();
      (placesData ?? []).forEach((p: Place) => placeMap.set(p.id, p));

      steps.forEach((step) => {
        if (step.target_type === 'place') {
          step.place = placeMap.get(step.target_id);
        }
      });
    }

    set({ steps, loading: false });
  },

  fetchProgress: async (userId) => {
    const { data } = await supabase
      .from('checkins')
      .select('*')
      .eq('user_id', userId)
      .not('quest_step_id', 'is', null);

    set({ progress: (data as QuestCheckin[]) ?? [] });
  },

  checkIn: async (userId, questStepId, placeId, xpReward = 25) => {
    // Prevent duplicate check-ins
    if (get().isStepCompleted(questStepId)) return false;

    const { data, error } = await supabase
      .from('checkins')
      .insert({
        user_id: userId,
        quest_step_id: questStepId,
        place_id: placeId,
        xp_earned: xpReward,
      })
      .select()
      .single();

    if (error || !data) return false;

    // Update local progress
    set((state) => ({ progress: [...state.progress, data as QuestCheckin] }));

    // Increment user's XP in the profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('xp')
      .eq('id', userId)
      .single();

    if (profile) {
      await supabase
        .from('profiles')
        .update({ xp: (profile.xp ?? 0) + xpReward })
        .eq('id', userId);
    }

    return true;
  },

  completeQuest: async (userId, questId, bonusXp) => {
    // Prevent awarding completion XP twice
    if (get().completedQuestIds.has(questId)) return false;

    // Increment user's XP with the quest completion bonus
    const { data: profile } = await supabase
      .from('profiles')
      .select('xp')
      .eq('id', userId)
      .single();

    if (!profile) return false;

    const { error } = await supabase
      .from('profiles')
      .update({ xp: (profile.xp ?? 0) + bonusXp })
      .eq('id', userId);

    if (error) return false;

    set((state) => {
      const ids = new Set(state.completedQuestIds);
      ids.add(questId);
      return { completedQuestIds: ids };
    });

    return true;
  },

  isStepCompleted: (questStepId) => {
    return get().progress.some((p) => p.quest_step_id === questStepId);
  },

  getQuestCompletedCount: (questId) => {
    const stepIds = new Set(get().steps.filter((s) => s.quest_id === questId).map((s) => s.id));
    return get().progress.filter((p) => stepIds.has(p.quest_step_id)).length;
  },
}));
