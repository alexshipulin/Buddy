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
  /** Semantic visual variants for contextual chips. */
  variant?: 'default' | 'warning' | 'danger';
};

export function Chip({ label, selected = false, onPress, small = false, variant = 'default' }: Props): React.JSX.Element {
  const height = small ? spec.chipSmallHeight : spec.chipHeight;
  const radius = small ? spec.chipSmallRadius : spec.chipRadius;
  const paddingX = small ? spec.chipSmallPaddingX : spec.chipPaddingX;
  const isWarning = variant === 'warning';
  const isDanger = variant === 'danger';
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.base,
        { height, borderRadius: radius, paddingHorizontal: paddingX },
        isWarning && styles.warning,
        isDanger && styles.danger,
        selected && styles.selected,
      ]}
    >
      <Text
        style={[
          small ? styles.textSmall : styles.text,
          isWarning && styles.warningText,
          isDanger && styles.dangerText,
          selected && styles.selectedText,
        ]}
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
  warning: {
    backgroundColor: appTheme.colors.warningSoft,
    borderColor: appTheme.colors.warningSoft,
  },
  danger: {
    backgroundColor: appTheme.colors.dangerSoft,
    borderColor: appTheme.colors.dangerSoft,
  },
  text: {
    fontSize: appTheme.typography.body.fontSize,
    fontWeight: '500',
    color: appTheme.colors.muted,
    textAlign: 'center',
    width: '100%',
  },
  textSmall: {
    fontSize: appTheme.typography.caption.fontSize,
    fontWeight: '500',
    color: appTheme.colors.muted,
    textAlign: 'center',
    width: '100%',
  },
  selectedText: {
    color: appTheme.colors.primaryText,
    fontWeight: '500',
    textAlign: 'center',
  },
  warningText: {
    color: appTheme.colors.warning,
    fontWeight: '600',
  },
  dangerText: {
    color: appTheme.colors.danger,
    fontWeight: '600',
  },
});
