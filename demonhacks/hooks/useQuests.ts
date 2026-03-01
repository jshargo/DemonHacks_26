import questsData from '@/data/seed/quests.json';

export interface LocalQuest {
  id: string;
  name: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimated_time: string;
  stops: { spot_name: string; stop_order: number; hint: string }[];
}

export function useQuests() {
  const quests = questsData as LocalQuest[];
  return { quests };
}

export function useQuestById(id: string) {
  const quests = questsData as LocalQuest[];
  const quest = quests.find((q) => q.id === id) ?? null;
  return { quest };
}
