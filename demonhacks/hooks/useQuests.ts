import questsData from '@/data/seed/quests.json';

export interface LocalQuestStop {
  spot_name: string;
  stop_order: number;
  hint: string;
  xp_reward: number;
  category: string | null;
  address: string | null;
}

export interface LocalQuest {
  id: string;
  name: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimated_time: string;
  xp_reward: number;
  stops: LocalQuestStop[];
}

export type DifficultySection = {
  difficulty: 'easy' | 'medium' | 'hard';
  label: string;
  data: LocalQuest[];
};

const DIFFICULTY_ORDER: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard'];
const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

export function useQuests() {
  const quests = questsData as LocalQuest[];

  const sections: DifficultySection[] = DIFFICULTY_ORDER
    .map((diff) => ({
      difficulty: diff,
      label: DIFFICULTY_LABELS[diff],
      data: quests.filter((q) => q.difficulty === diff),
    }))
    .filter((section) => section.data.length > 0);

  return { quests, sections };
}

export function useQuestById(id: string) {
  const quests = questsData as LocalQuest[];
  const quest = quests.find((q) => q.id === id) ?? null;

  const totalXp = quest
    ? quest.xp_reward + quest.stops.reduce((sum, s) => sum + (s.xp_reward || 0), 0)
    : 0;

  return { quest, totalXp };
}
