/** Single source of truth for UI tokens. Use via design/theme and design/spec. */

export const colors = {
  bg: '#F5F6F8',
  surface: '#FFFFFF',
  ink: '#0B0F1A',
  muted: '#6B7280',
  border: '#E6EAF0',
  primary: '#0B0F1A',
  primaryText: '#FFFFFF',
  disabledBg: '#D1D5DB',
  disabledText: '#FFFFFF',
  accent: '#7C3AED',
  accentSoft: '#EDE9FE',
  success: '#22C55E',
  successSoft: '#DCFCE7',
  info: '#3B82F6',
  infoSoft: '#DBEAFE',
} as const;

export const spacing = {
  4: 4,
  8: 8,
  12: 12,
  16: 16,
  20: 20,
  24: 24,
  32: 32,
  40: 40,
} as const;

export const radius = {
  card: 24,
  sheet: 32,
  input: 14,
  chip: 16,
  pill: 18,
  button: 28,
} as const;

export const cardShadow = {
  shadowColor: '#000000',
  shadowOpacity: 0.08,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
} as const;

export const typographyTokens = {
  hero: { fontSize: 40, lineHeight: 44, fontWeight: '800' as const },
  h1: { fontSize: 34, lineHeight: 40, fontWeight: '800' as const },
  h2: { fontSize: 24, lineHeight: 30, fontWeight: '700' as const },
  h3: { fontSize: 20, lineHeight: 26, fontWeight: '700' as const },
  body: { fontSize: 17, lineHeight: 24, fontWeight: '400' as const },
  bodySemibold: { fontSize: 17, lineHeight: 24, fontWeight: '600' as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const },
  small: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const },
  overline: { fontSize: 12, lineHeight: 16, fontWeight: '600' as const, letterSpacing: 0.8 },
} as const;
