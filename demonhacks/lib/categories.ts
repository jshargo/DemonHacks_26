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
    ],
  },
  {
    id: 'comedy',
    label: 'Comedy',
    emoji: '😂',
    subcategories: ['Comedy clubs'],
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
    id: 'museums-arts',
    label: 'Museums & Arts',
    emoji: '🎨',
    subcategories: [
      'Art museums',
      'Galleries',
      'Theater / plays',
      'Film screenings',
      'Poetry / spoken word',
      'Architecture tours',
    ],
  },
  {
    id: 'food-drink',
    label: 'Food & Drink',
    emoji: '🍽️',
    subcategories: ['Restaurants', 'Food halls', 'Brunch', 'Dessert spots', 'Bars'],
  },
  {
    id: 'coffee-study',
    label: 'Coffee & Study',
    emoji: '☕',
    subcategories: ['Coffee shops', 'Libraries', 'Board-game cafés'],
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
    ],
  },
  {
    id: 'nightlife',
    label: 'Nightlife',
    emoji: '🌙',
    subcategories: ['Dance clubs', 'Bar hopping areas', 'Karaoke', '18+ / 21+ venues'],
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
    id: 'markets-festivals',
    label: 'Markets & Festivals',
    emoji: '🎪',
    subcategories: ['Cultural festivals'],
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
      'Group classes',
      'Meditation / breathwork',
      'Sauna / spa',
    ],
  },
];

export const MAX_CATEGORIES = 5;
