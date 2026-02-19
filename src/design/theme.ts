import { colors, radius, spacing, cardShadow, typographyTokens } from './tokens';

export const appTheme = {
  colors: {
    ...colors,
    background: colors.bg,
    textPrimary: colors.ink,
    textSecondary: colors.muted,
    primary: colors.primary,
    primaryButton: colors.primary,
    secondaryButton: colors.border,
    accent: colors.accent,
    accentSoft: colors.accentSoft,
    success: colors.success,
    successSoft: colors.successSoft,
    border: colors.border,
    progressTrack: colors.border,
  },
  spacing: {
    ...spacing,
    xs: spacing[4],
    sm: spacing[8],
    md: spacing[16],
    lg: spacing[20],
    xl: spacing[24],
  },
  radius: {
    ...radius,
    sm: radius.input,
    md: radius.chip,
    lg: radius.card,
    xl: radius.card,
    pill: radius.pill,
  },
  shadows: { card: { ...cardShadow, elevation: 4 } },
  typography: typographyTokens,
};

export type AppTheme = typeof appTheme;
