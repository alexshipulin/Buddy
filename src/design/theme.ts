import { colors, radius, spacing, spacingScale, cardShadow, typographyTokens } from './tokens';

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
  shadows: { card: { ...cardShadow, elevation: 4 } },
  typography: typographyTokens,
};

export type AppTheme = typeof appTheme;
