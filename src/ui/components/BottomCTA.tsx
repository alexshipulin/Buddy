import React from 'react';
import { StyleProp, StyleSheet, useWindowDimensions, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getPagePaddingX, layout } from '../../design/layout';
import { spec } from '../../design/spec';
import { appTheme } from '../../design/theme';

type Props = {
  children: React.ReactNode;
  /** Additional padding top (default: 12) */
  paddingTop?: number;
  style?: StyleProp<ViewStyle>;
};

export const CTA_BUTTON_HEIGHT = spec.primaryButtonHeight;
export const CTA_TOP_PADDING = layout.itemSpacingYTight;
export const CTA_BOTTOM_PADDING = layout.bottomContentOffset;
const CTA_BASE_HEIGHT = CTA_BUTTON_HEIGHT + CTA_TOP_PADDING + CTA_BOTTOM_PADDING;
/**
 * Total height of the BottomCTA area (button + padding + safe area).
 * Use for ScrollView contentContainerStyle: paddingBottom = getCTATotalHeight(insets.bottom) + 12.
 * Must be called with useSafeAreaInsets().bottom — do not use a constant.
 */
export const getCTATotalHeight = (safeAreaBottom: number): number => CTA_BASE_HEIGHT + safeAreaBottom;

/**
 * Fixed bottom CTA container with safe area support.
 * Use for primary actions that should be pinned to bottom (e.g., Continue, Save Changes).
 */
export function BottomCTA({ children, paddingTop, style }: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const topPadding = paddingTop ?? CTA_TOP_PADDING;
  const pagePaddingX = getPagePaddingX(width);

  return (
    <View
      style={[
        styles.container,
        {
          paddingHorizontal: pagePaddingX,
          paddingBottom: insets.bottom + CTA_BOTTOM_PADDING,
          paddingTop: topPadding,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
});
