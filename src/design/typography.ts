import { typographyTokens } from './tokens';

/**
 * Canonical iOS text styles for UI usage.
 * No device-width-based scaling. Dynamic Type remains enabled by default.
 */
export const iosTypography = {
  largeTitle: typographyTokens.largeTitle,
  title1: typographyTokens.title1,
  title2: typographyTokens.title2,
  title3: typographyTokens.title3,
  headline: typographyTokens.headline,
  body: typographyTokens.body,
  callout: typographyTokens.callout,
  subheadline: typographyTokens.subheadline,
  footnote: typographyTokens.footnote,
  caption1: typographyTokens.caption1,
  caption2: typographyTokens.caption2,
} as const;

/**
 * App-specific semantic aliases.
 * Keep displayTitle only for decorative/marketing contexts (e.g. welcome hero).
 */
export const semanticTypography = {
  displayTitle: typographyTokens.hero,
  pageTitle: typographyTokens.title1,
  sectionTitle: typographyTokens.title2,
  cardTitle: typographyTokens.title3,
  body: typographyTokens.body,
  bodyStrong: typographyTokens.headline,
  caption: typographyTokens.footnote,
  overline: typographyTokens.caption1,
} as const;
