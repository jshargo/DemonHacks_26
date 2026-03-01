import React from 'react';
import { useMapStore } from '@/stores/map-store';
import { useExploreStore } from '@/stores/explore-store';

export interface EventResult {
  id: string;
  name: string;
  description: string | null;
  lat: number;
  lng: number;
  venue_name: string | null;
  starts_at: string;
  ends_at: string;
  attending_count: number;
  image_url: string | null;
}

export interface EventResultListProps {
  events: EventResult[];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function EventResultList({ events }: EventResultListProps) {
  if (!events || events.length === 0) {
    return <p className="text-sm text-gray-500 italic">No events found.</p>;
  }

  const handleClick = (event: EventResult) => {
    useMapStore.getState().setFlyTarget({ lat: event.lat, lng: event.lng, zoom: 15 });
    useExploreStore.getState().setHoveredPinId(event.id);
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      {events.map((event) => (
        <button
          key={event.id}
          type="button"
          onClick={() => handleClick(event)}
          className="flex gap-3 p-3 rounded-xl border border-gray-200 bg-white hover:bg-purple-50 hover:border-purple-300 transition-colors text-left cursor-pointer w-full"
        >
          {event.image_url && (
            <img
              src={event.image_url}
              alt={event.name}
              className="w-16 h-16 rounded-lg object-cover shrink-0"
            />
          )}
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <span className="font-semibold text-sm text-gray-900 truncate">
              {event.name}
            </span>
            <p className="text-xs text-purple-600 font-medium">
              {formatDate(event.starts_at)}
            </p>
            {event.venue_name && (
              <p className="text-[11px] text-gray-500 truncate">{event.venue_name}</p>
            )}
            {event.description && (
              <p className="text-xs text-gray-600 line-clamp-2">{event.description}</p>
            )}
            {event.attending_count > 0 && (
              <p className="text-[11px] text-gray-400">
                {event.attending_count} attending
              </p>
            )}
          </div>
          <span className="text-purple-500 text-xs font-medium self-center shrink-0">Go &rarr;</span>
        </button>
      ))}
    </div>
  );
}
