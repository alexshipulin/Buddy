import { spacing } from './tokens';

export const layout = {
  // 4pt grid
  spacing,

  // Page paddings by iPhone width class
  pagePaddingCompact: 16,
  pagePaddingRegular: 20,

  // Vertical rhythm
  sectionSpacingY: 24,
  itemSpacingYTight: 12,
  itemSpacingY: 16,

  // Safe area offsets
  topContentOffset: 12,
  bottomContentOffset: 16,

  // Width rules
  tabletMinWidth: 768,
  tabletContentMaxWidth: 540,

  // Tap targets
  minTapTarget: 44,
} as const;

export function getPagePaddingX(screenWidth: number): number {
  return screenWidth <= 375 ? layout.pagePaddingCompact : layout.pagePaddingRegular;
}

export function getContentMaxWidth(screenWidth: number): number | undefined {
  return screenWidth >= layout.tabletMinWidth ? layout.tabletContentMaxWidth : undefined;
}
