import React from 'react';
import { useMapStore } from '@/stores/map-store';
import { useExploreStore } from '@/stores/explore-store';

export interface PlaceResult {
  id: string;
  name: string;
  description: string | null;
  lat: number;
  lng: number;
  category: string | null;
  image_url: string | null;
  address: string | null;
  website_url: string | null;
}

export interface PlaceResultListProps {
  places: PlaceResult[];
}

const categoryLabels: Record<string, string> = {
  food_drink: 'Food & Drink',
  outdoors: 'Outdoors',
  shopping: 'Shopping',
  entertainment: 'Entertainment',
  arts_culture: 'Arts & Culture',
  volunteering: 'Volunteering',
  other: 'Other',
};

export function PlaceResultList({ places }: PlaceResultListProps) {
  if (!places || places.length === 0) {
    return <p className="text-sm text-gray-500 italic">No places found.</p>;
  }

  const handleClick = (place: PlaceResult) => {
    useMapStore.getState().setFlyTarget({ lat: place.lat, lng: place.lng, zoom: 15 });
    useExploreStore.getState().setHoveredPinId(place.id);
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      {places.map((place) => (
        <button
          key={place.id}
          type="button"
          onClick={() => handleClick(place)}
          className="flex gap-3 p-3 rounded-xl border border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-300 transition-colors text-left cursor-pointer w-full"
        >
          {place.image_url && (
            <img
              src={place.image_url}
              alt={place.name}
              className="w-16 h-16 rounded-lg object-cover shrink-0"
            />
          )}
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-gray-900 truncate">
                {place.name}
              </span>
              {place.category && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 shrink-0">
                  {categoryLabels[place.category] ?? place.category}
                </span>
              )}
            </div>
            {place.description && (
              <p className="text-xs text-gray-600 line-clamp-2">{place.description}</p>
            )}
            {place.address && (
              <p className="text-[11px] text-gray-400 truncate">{place.address}</p>
            )}
          </div>
          <span className="text-blue-500 text-xs font-medium self-center shrink-0">Go &rarr;</span>
        </button>
      ))}
    </div>
  );
}
