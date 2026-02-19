import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { appTheme } from '../../design/theme';
import { spec } from '../../design/spec';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** Small variant: height 28, radius 14, caption font */
  small?: boolean;
};

export function Chip({ label, selected = false, onPress, small = false }: Props): React.JSX.Element {
  const height = small ? spec.chipSmallHeight : spec.chipHeight;
  const radius = small ? spec.chipSmallRadius : spec.chipRadius;
  const paddingX = small ? spec.chipSmallPaddingX : spec.chipPaddingX;
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.base,
        { height, borderRadius: radius, paddingHorizontal: paddingX },
        selected && styles.selected,
      ]}
    >
      <Text
        style={[small ? styles.textSmall : styles.text, selected && styles.selectedText]}
        maxFontSizeMultiplier={1.2}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minWidth: spec.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    backgroundColor: appTheme.colors.surface,
  },
  selected: {
    backgroundColor: appTheme.colors.ink,
    borderColor: appTheme.colors.ink,
  },
  text: {
    fontSize: appTheme.typography.body.fontSize,
    fontWeight: appTheme.typography.body.fontWeight,
    color: appTheme.colors.muted,
  },
  textSmall: {
    fontSize: appTheme.typography.caption.fontSize,
    fontWeight: appTheme.typography.caption.fontWeight,
    color: appTheme.colors.muted,
  },
  selectedText: {
    color: appTheme.colors.primaryText,
    fontWeight: '600',
  },
});
