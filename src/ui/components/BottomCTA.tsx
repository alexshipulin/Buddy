import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spec } from '../../design/spec';
import { appTheme } from '../../design/theme';

type Props = {
  children: React.ReactNode;
  /** Additional padding top (default: 16) */
  paddingTop?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Fixed bottom CTA container with safe area support.
 * Use for primary actions that should be pinned to bottom (e.g., Continue, Save Changes).
 */
export function BottomCTA({ children, paddingTop, style }: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const topPadding = paddingTop ?? spec.screenPaddingBottomOffset;

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: insets.bottom + spec.screenPaddingBottomOffset,
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
    backgroundColor: appTheme.colors.background,
    paddingHorizontal: spec.screenPaddingHorizontal,
    borderTopWidth: 1,
    borderTopColor: appTheme.colors.border,
  },
});
