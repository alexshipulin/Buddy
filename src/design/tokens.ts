/** Single source of truth for UI tokens. Use via design/theme and design/spec. */

export const colors = {
  /** Match Figma Onboarding 2 (Goal Selection): no separate white bar for header/button */
  bg: '#FFFFFF',
  surface: '#FFFFFF',
  ink: '#0B0F1A',
  muted: '#6B7280',
  /** Placeholder text (e.g. inputs); visible grey per Apple HIG */
  placeholder: '#8E8E93',
  border: '#E6EAF0',
  primary: '#0B0F1A',
  /** Bottom CTA button fill (Figma: black 0,0,0) */
  primaryButton: '#000000',
  primaryText: '#FFFFFF',
  disabledBg: '#D1D5DB',
  disabledText: '#FFFFFF',
  accent: '#7C3AED',
  accentSoft: '#EDE9FE',
  success: '#22C55E',
  successSoft: '#DCFCE7',
  warning: '#F59E0B',
  warningSoft: '#FEF3C7',
  danger: '#EF4444',
  dangerSoft: '#FEE2E2',
  info: '#3B82F6',
  infoSoft: '#DBEAFE',
} as const;

/** 8pt grid; multiples of 4. Prefer 8 for gaps. */
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

/** Semantic spacing scale (xs → 3xl) for components. */
export const spacingScale = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
} as const;

export const radius = {
  card: 24,
  sheet: 32,
  input: 14,
  chip: 16,
  pill: 18,
  button: 28,
} as const;

/** Semantic radius scale (iOS HIG) */
export const radiusScale = {
  small: 12,
  medium: 16,
  large: 20,
  xl: 24,
} as const;

/**
 * Unified shadow levels (Apple iOS style). Use via appTheme.shadows.
 * iOS: shadowColor/shadowOpacity/shadowRadius/shadowOffset; Android: elevation; Web: box-shadow.
 */
export const shadowTokens = {
  none: {
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  hairline: {
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  card: {
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  raised: {
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  modal: {
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
} as const;

/** @deprecated Use shadowTokens.card or appTheme.shadows.card */
export const cardShadow = shadowTokens.card;

/**
 * iOS text styles mapping (HIG). Exact line heights per Figma/Apple HIG.
 * Do not hardcode fontFamily (system font = SF Pro on iOS).
 */
export const typographyTokens = {
  // Canonical iOS styles (fontSize / lineHeight)
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '700' as const },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: '700' as const },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' as const },
  body: { fontSize: 17, lineHeight: 22, fontWeight: '400' as const },
  callout: { fontSize: 16, lineHeight: 21, fontWeight: '400' as const },
  subheadline: { fontSize: 15, lineHeight: 20, fontWeight: '400' as const },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
  caption1: { fontSize: 12, lineHeight: 16, fontWeight: '400' as const },
  caption2: { fontSize: 11, lineHeight: 13, fontWeight: '400' as const },

  // Aliases (screens/components)
  hero: { fontSize: 40, lineHeight: 44, fontWeight: '800' as const },
  h1: { fontSize: 34, lineHeight: 41, fontWeight: '800' as const },
  h2: { fontSize: 24, lineHeight: 30, fontWeight: '700' as const },
  h3: { fontSize: 20, lineHeight: 25, fontWeight: '700' as const },
  bodySemibold: { fontSize: 17, lineHeight: 22, fontWeight: '600' as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const },
  small: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const },
  overline: { fontSize: 12, lineHeight: 16, fontWeight: '600' as const, letterSpacing: 0.8 },
} as const;
