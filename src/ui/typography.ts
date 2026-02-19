import { StyleSheet } from 'react-native';
import { appTheme } from '../design/theme';

const t = appTheme.typography;

export const typography = StyleSheet.create({
  hero: { ...t.hero, color: appTheme.colors.textPrimary },
  h1: { ...t.h1, color: appTheme.colors.textPrimary },
  h2: { ...t.h2, color: appTheme.colors.textPrimary },
  h3: { fontSize: 20, lineHeight: 26, fontWeight: '700', color: appTheme.colors.textPrimary },
  body: { ...t.body, color: appTheme.colors.textPrimary },
  bodySemibold: { ...t.bodySemibold, color: appTheme.colors.textPrimary },
  caption: { ...t.caption, color: appTheme.colors.textSecondary },
  overline: { ...t.overline, color: appTheme.colors.textSecondary, textTransform: 'uppercase' },
});
