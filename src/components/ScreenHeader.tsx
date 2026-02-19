import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { appTheme } from '../design/theme';
import { spec } from '../design/spec';

type Props = {
  /** Center title (no page labels from React Navigation) */
  title: string;
  /** Left: back button (if onBack) or pill label e.g. "Welcome", "Goal", "Home" */
  leftLabel?: string;
  onBack?: () => void;
  /** Right: e.g. "Skip" pill or custom node */
  rightLabel?: string;
  onRightPress?: () => void;
  rightAction?: React.ReactNode;
};

export function ScreenHeader({ title, leftLabel, onBack, rightLabel, onRightPress, rightAction }: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const paddingTop = insets.top + spec.headerPaddingTopOffset;

  return (
    <View style={[styles.row, { paddingTop, paddingHorizontal: spec.screenPaddingHorizontal }]}>
      <View style={styles.side}>
        {onBack != null ? (
          <Pressable
            onPress={onBack}
            style={styles.pill}
            hitSlop={8}
          >
            <Text style={styles.pillText}>‹</Text>
          </Pressable>
        ) : leftLabel ? (
          <View style={styles.pill}>
            <Text style={styles.pillText} numberOfLines={1}>{leftLabel}</Text>
          </View>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>
      <Text numberOfLines={1} style={styles.title} maxFontSizeMultiplier={1.2}>
        {title}
      </Text>
      <View style={styles.side}>
        {rightAction != null ? (
          rightAction
        ) : rightLabel != null ? (
          <Pressable onPress={onRightPress} style={styles.pill} hitSlop={8}>
            <Text style={styles.pillText} numberOfLines={1}>{rightLabel}</Text>
          </Pressable>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: spec.headerContentHeight,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
  },
  side: { minWidth: 80, alignItems: 'center', justifyContent: 'center' },
  placeholder: { width: spec.minTouchTarget, height: spec.minTouchTarget },
  pill: {
    minHeight: spec.headerPillHeight,
    minWidth: spec.minTouchTarget,
    maxHeight: spec.headerPillHeight,
    borderRadius: spec.headerPillRadius,
    paddingHorizontal: spec.headerPillPaddingX,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: appTheme.colors.surface,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
  },
  pillText: {
    fontSize: spec.headerPillFontSize,
    fontWeight: '600',
    color: appTheme.colors.textPrimary,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: appTheme.typography.bodySemibold.fontSize,
    lineHeight: appTheme.typography.bodySemibold.lineHeight,
    fontWeight: appTheme.typography.bodySemibold.fontWeight,
    color: appTheme.colors.textPrimary,
  },
});
