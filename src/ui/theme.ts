export const uiTheme = {
  colors: {
    background: '#F4F5F7',
    surface: '#FFFFFF',
    textPrimary: '#0C1222',
    textSecondary: '#6B7280',
    border: '#E7EAF0',
    primary: '#08122F',
    primarySoft: '#EEF2FF',
    muted: '#ECEFF4',
    success: '#16A34A',
    warning: '#D97706',
    danger: '#DC2626',
    accent: '#7C3AED',
    accentSoft: '#F3EBFF',
  },
  spacing: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
  },
  radius: {
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    pill: 999,
  },
  shadows: {
    card: {
      shadowColor: '#0B1020',
      shadowOpacity: 0.06,
      shadowOffset: { width: 0, height: 6 },
      shadowRadius: 16,
      elevation: 2,
    },
  },
};

export type UiTheme = typeof uiTheme;
