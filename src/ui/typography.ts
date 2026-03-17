import { StyleSheet } from 'react-native';
import { iosTypography, semanticTypography } from '../design/typography';
import { appTheme } from '../design/theme';

export const typography = StyleSheet.create({
  largeTitle: { ...iosTypography.largeTitle, color: appTheme.colors.textPrimary },
  title1: { ...iosTypography.title1, color: appTheme.colors.textPrimary },
  title2: { ...iosTypography.title2, color: appTheme.colors.textPrimary },
  title3: { ...iosTypography.title3, color: appTheme.colors.textPrimary },
  headline: { ...iosTypography.headline, color: appTheme.colors.textPrimary },
  body: { ...iosTypography.body, color: appTheme.colors.textPrimary },
  callout: { ...iosTypography.callout, color: appTheme.colors.textPrimary },
  subheadline: { ...iosTypography.subheadline, color: appTheme.colors.textSecondary },
  footnote: { ...iosTypography.footnote, color: appTheme.colors.textSecondary },
  caption1: { ...iosTypography.caption1, color: appTheme.colors.textSecondary },
  caption2: { ...iosTypography.caption2, color: appTheme.colors.textSecondary },

  // App aliases
  hero: { ...semanticTypography.displayTitle, color: appTheme.colors.textPrimary },
  h1: { ...semanticTypography.pageTitle, color: appTheme.colors.textPrimary },
  h2: { ...semanticTypography.sectionTitle, color: appTheme.colors.textPrimary },
  h3: { ...semanticTypography.cardTitle, color: appTheme.colors.textPrimary },
  bodySemibold: { ...semanticTypography.bodyStrong, color: appTheme.colors.textPrimary },
  caption: { ...semanticTypography.caption, color: appTheme.colors.textSecondary },
  overline: { ...semanticTypography.overline, color: appTheme.colors.textSecondary, textTransform: 'uppercase' },
});
