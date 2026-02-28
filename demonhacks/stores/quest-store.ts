// Quests are not in the current database schema.
// This file is a placeholder for future quest functionality.
// TODO: Add quest tables to Supabase if quest feature is needed.

import { create } from 'zustand';

interface QuestState {
  loading: boolean;
}

export const useQuestStore = create<QuestState>(() => ({
  loading: false,
}));
