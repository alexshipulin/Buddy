import { colors, radius, spacing, spacingScale, shadowTokens, typographyTokens } from './tokens';

export const appTheme = {
  colors: {
    ...colors,
    background: colors.bg,
    surface: colors.surface,
    textPrimary: colors.ink,
    textSecondary: colors.muted,
    placeholder: colors.placeholder,
    primary: colors.primary,
    primaryButton: colors.primaryButton,
    secondaryButton: colors.border,
    accent: colors.accent,
    accentSoft: colors.accentSoft,
    success: colors.success,
    successSoft: colors.successSoft,
    warning: colors.warning,
    warningSoft: colors.warningSoft,
    danger: colors.danger,
    dangerSoft: colors.dangerSoft,
    border: colors.border,
    progressTrack: colors.border,
  },
  spacing: {
    ...spacing,
    xs: spacingScale.xs,
    sm: spacingScale.sm,
    md: spacingScale.md,
    lg: spacingScale.lg,
    xl: spacingScale.xl,
    '2xl': spacingScale['2xl'],
    '3xl': spacingScale['3xl'],
  },
  radius: {
    ...radius,
    sm: radius.input,
    md: radius.chip,
    lg: radius.card,
    xl: radius.card,
    pill: radius.pill,
  },
  shadows: {
    none: shadowTokens.none,
    hairline: shadowTokens.hairline,
    card: shadowTokens.card,
    raised: shadowTokens.raised,
    modal: shadowTokens.modal,
  },
  typography: typographyTokens,
};

export type AppTheme = typeof appTheme;

export type ShadowLevel = keyof typeof appTheme.shadows;

/** Returns shadow style for the given level. In dark mode opacity is reduced (~30%) for softer shadows. */
export function getShadow(
  level: ShadowLevel,
  colorScheme: 'light' | 'dark' = 'light'
): typeof shadowTokens.card {
  const token = shadowTokens[level];
  if (level === 'none' || colorScheme === 'light') return token;
  return {
    ...token,
    shadowOpacity: token.shadowOpacity * 0.65,
    elevation: Math.max(0, Math.round(token.elevation * 0.7)),
  };
}
