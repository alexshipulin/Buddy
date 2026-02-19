import { colors, radius, spacing, typography } from './tokens';

export const appTheme = {
  colors,
  radius,
  spacing,
  typography,
  shadows: {
    card: {
      shadowColor: '#000000',
      shadowOpacity: 0.06,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 16,
      elevation: 1,
    },
  },
};

export type AppTheme = typeof appTheme;
