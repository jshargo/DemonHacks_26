/**
 * ExploreChi Design Token System
 *
 * Single source of truth for all visual constants.
 * Import tokens directly in StyleSheet.create() — these are static values,
 * not React context, because RN StyleSheet requires constants at call time.
 */

// ─── Colors ─────────────────────────────────────────────────────────────────

export const colors = {
  // Brand
  primary: '#374DF5',
  primaryLight: '#EEF0FE',
  primaryDark: '#2A3BC4',

  // Neutrals (light mode only)
  white: '#FFFFFF',
  background: '#FFFFFF',
  surface: '#F7F7F8',
  surfaceHover: '#EFEFEF',
  border: '#E5E5EA',
  borderLight: '#F0F0F2',

  // Text
  textPrimary: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textTertiary: '#9B9B9B',
  textInverse: '#FFFFFF',

  // Semantic
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  info: '#007AFF',

  // Category (badges & accent use only — pins identify by icon, not color)
  categoryFood: '#FF6B35',
  categoryOutdoors: '#00C49A',
  categoryShopping: '#F77F00',
  categoryEntertainment: '#9B5DE5',
  categoryArts: '#00BBF9',
  categoryVolunteering: '#E63946',

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.4)',
  overlayLight: 'rgba(0, 0, 0, 0.08)',
} as const;

// ─── Typography ─────────────────────────────────────────────────────────────

export const fonts = {
  regular: 'Satoshi-Regular',
  medium: 'Satoshi-Medium',
  bold: 'Satoshi-Bold',
  black: 'Satoshi-Black',
} as const;

export const typography = {
  // Display
  displayLg: { fontFamily: fonts.black, fontSize: 32, lineHeight: 38 },
  displayMd: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 32 },
  displaySm: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28 },

  // Headings
  headingLg: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26 },
  headingMd: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 24 },
  headingSm: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 22 },

  // Body
  bodyLg: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  bodyMd: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  bodySm: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16 },

  // Labels
  labelLg: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 18 },
  labelMd: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  labelSm: { fontFamily: fonts.medium, fontSize: 10, lineHeight: 14 },

  // Caption
  caption: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 14 },
} as const;

// ─── Spacing (4px base grid) ────────────────────────────────────────────────

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
} as const;

// ─── Border Radii ───────────────────────────────────────────────────────────

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

// ─── Shadows (web box-shadow strings — RN web supports these) ──────────────

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 5,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  pin: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  fab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;

// ─── Z-Indices ──────────────────────────────────────────────────────────────

export const zIndex = {
  base: 0,
  card: 1,
  sticky: 10,
  overlay: 100,
  modal: 200,
  toast: 300,
} as const;

// ─── Lucide icon names per place category ───────────────────────────────────

export const categoryIcons: Record<string, string> = {
  food_drink: 'utensils-crossed',
  outdoors: 'tree-pine',
  shopping: 'shopping-bag',
  entertainment: 'music',
  arts_culture: 'palette',
  volunteering: 'heart-handshake',
  other: 'map-pin',
  event: 'calendar',
} as const;
