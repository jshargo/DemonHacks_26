// ExploreChi Design System — single source of truth for all design tokens

export const colors = {
  primary: '#374DF5',
  primaryLight: '#EEF0FE',
  primaryDark: '#2A3BC4',

  white: '#FFFFFF',
  background: '#FFFFFF',
  surface: '#F7F7F8',
  border: '#E5E5EA',
  borderLight: '#F0F0F2',

  textPrimary: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textTertiary: '#9B9B9B',
  textInverse: '#FFFFFF',

  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',

  overlay: 'rgba(0,0,0,0.4)',
} as const;

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

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
} as const;

export const typography = {
  displayLg: { fontSize: 32, lineHeight: 38, fontWeight: '700' as const },
  displayMd: { fontSize: 26, lineHeight: 32, fontWeight: '700' as const },
  displaySm: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const },
  headingLg: { fontSize: 20, lineHeight: 26, fontWeight: '600' as const },
  headingMd: { fontSize: 18, lineHeight: 24, fontWeight: '600' as const },
  headingSm: { fontSize: 16, lineHeight: 22, fontWeight: '600' as const },
  bodyLg: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  bodyMd: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
  bodySm: { fontSize: 12, lineHeight: 16, fontWeight: '400' as const },
  labelLg: { fontSize: 14, lineHeight: 18, fontWeight: '500' as const },
  labelMd: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const },
  labelSm: { fontSize: 10, lineHeight: 14, fontWeight: '500' as const },
  caption: { fontSize: 11, lineHeight: 14, fontWeight: '400' as const },
} as const;
