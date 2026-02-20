/**
 * Authoritative UI spec used by components and screens.
 * All spacing, typography, colors, and component dimensions derive from here.
 */
import { colors, spacing, radius, cardShadow, typographyTokens } from './tokens';

export const spec = {
  colors,
  spacing,
  radius,
  cardShadow,

  /** Semantic typography (use with Text style). Default allowFontScaling, maxFontSizeMultiplier 1.2 */
  typography: typographyTokens,

  /** Layout */
  screenPaddingHorizontal: spacing[20],
  screenPaddingBottomOffset: spacing[16],
  headerContentHeight: 56,
  headerPaddingTopOffset: spacing[8],
  headerPillHeight: 36,
  headerPillRadius: 18,
  headerPillPaddingX: 14,
  headerPillFontSize: 15,

  /** Buttons */
  primaryButtonHeight: 56,
  primaryButtonRadius: radius.button,
  primaryButtonPaddingHorizontal: spacing[16],

  /** Chips */
  chipHeight: 32,
  chipRadius: radius.chip,
  chipPaddingX: 12,
  chipSmallHeight: 28,
  chipSmallRadius: 14,
  chipSmallPaddingX: 10,

  /** Cards */
  cardRadius: radius.card,
  cardPadding: spacing[20],
  cardBorderWidth: 1,

  /** Inputs */
  inputHeight: 52,
  inputRadius: radius.input,
  inputPaddingX: 16,

  /** Bottom sheet (Welcome) */
  sheetRadius: 32,
  sheetPaddingTop: 28,
  sheetPaddingHorizontal: spacing[20],

  /** Step indicator */
  stepDotSize: 8,
  stepActiveWidth: 22,
  stepActiveHeight: 8,
  stepGap: 8,
  stepMarginTop: 16,
  stepMarginBottom: 20,

  /** Touch targets */
  minTouchTarget: 44,
} as const;

export type Spec = typeof spec;

export const fontScaleMax = 1.2;
