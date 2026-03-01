import React from 'react';

export interface QuestResult {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  xp_reward: number;
  image_url: string | null;
}

export interface QuestResultListProps {
  quests: QuestResult[];
}

export function QuestResultList({ quests }: QuestResultListProps) {
  if (!quests || quests.length === 0) {
    return <p className="text-sm text-gray-500 italic">No quests found.</p>;
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      {quests.map((quest) => (
        <div
          key={quest.id}
          className="flex gap-3 p-3 rounded-xl border border-gray-200 bg-white w-full"
        >
          {quest.image_url && (
            <img
              src={quest.image_url}
              alt={quest.title}
              className="w-16 h-16 rounded-lg object-cover shrink-0"
            />
          )}
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <span className="font-semibold text-sm text-gray-900 truncate">
              {quest.title}
            </span>
            {quest.description && (
              <p className="text-xs text-gray-600 line-clamp-2">{quest.description}</p>
            )}
            <span className="text-[11px] font-medium text-amber-600">
              +{quest.xp_reward} XP
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
