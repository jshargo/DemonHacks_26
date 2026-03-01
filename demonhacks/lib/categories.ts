export interface Category {
  id: string;
  label: string;
  emoji: string;
  subcategories: string[];
}

export const CATEGORIES: Category[] = [
  {
    id: 'live-music',
    label: 'Live Music',
    emoji: '🎵',
    subcategories: [
      'Hip-hop / Rap',
      'R&B / Soul',
      'Jazz / Blues',
      'Rock / Indie',
      'EDM / House',
      'Afrobeats / Amapiano',
      'Classical / Orchestra',
      'Latin',
      'Pop',
      'Country',
    ],
  },
  {
    id: 'sports',
    label: 'Sports',
    emoji: '🏆',
    subcategories: [
      'Basketball',
      'Football',
      'Baseball',
      'Hockey',
      'Soccer',
      'College sports',
      'Combat sports',
      'Running events / races',
    ],
  },
  {
    id: 'arts-culture',
    label: 'Arts & Culture',
    emoji: '🎨',
    subcategories: [
      'Art museums',
      'Galleries',
      'Theater / musicals',
      'Film screenings',
      'Poetry / spoken word',
      'Architecture tours',
      'Dance performances',
      'Stand-up comedy',
      'Improv / sketch',
      'Open mic nights',
    ],
  },
  {
    id: 'food-drink',
    label: 'Food & Drink',
    emoji: '🍽️',
    subcategories: [
      'Restaurants',
      'Food halls',
      'Brunch spots',
      'Dessert spots',
      'Cocktail bars',
      'Craft beer / breweries',
      'Wine bars',
    ],
  },
  {
    id: 'coffee-cafes',
    label: 'Coffee & Cafés',
    emoji: '☕',
    subcategories: [
      'Coffee shops',
      'Bakeries / pastries',
      'Co-working spots',
      'Board-game cafés',
    ],
  },
  {
    id: 'outdoors',
    label: 'Outdoors',
    emoji: '🌿',
    subcategories: [
      'Parks',
      'Lakefront / beaches',
      'Scenic views / photo spots',
      'Picnic spots',
      'Gardens / conservatories',
      'Hiking / trails',
    ],
  },
  {
    id: 'nightlife',
    label: 'Nightlife',
    emoji: '🌙',
    subcategories: [
      'Dance clubs',
      'Bar hopping areas',
      'Rooftop bars',
      'Karaoke',
      '18+ / 21+ venues',
    ],
  },
  {
    id: 'markets-festivals',
    label: 'Markets & Festivals',
    emoji: '🎪',
    subcategories: [
      'Farmers markets',
      'Flea markets / vintage',
      'Street fairs',
      'Night markets',
      'Cultural festivals',
      'Holiday markets',
    ],
  },
  {
    id: 'family',
    label: 'Family-Friendly',
    emoji: '👨‍👩‍👧',
    subcategories: [
      'Kid museums',
      'Zoo / aquarium',
      'Playgrounds',
      'Family festivals',
      'Interactive experiences',
      'Indoor rainy-day spots',
    ],
  },
  {
    id: 'fitness',
    label: 'Fitness & Wellness',
    emoji: '💪',
    subcategories: [
      'Gyms',
      'Yoga',
      'Pilates',
      'Boxing / martial arts',
      'Group fitness classes',
      'Meditation / breathwork',
      'Sauna / spa',
    ],
  },
];

export const MAX_CATEGORIES = 5;

/** Max subcategories selectable for a given category: half the options + 1, rounded. */
export function maxSubsForCategory(cat: Category): number {
  return Math.round(cat.subcategories.length / 2) + 1;
}
