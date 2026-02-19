import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { appTheme } from '../../design/theme';
import { spec } from '../../design/spec';

type Props = {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({ title, onPress, disabled = false, loading = false, style }: Props): React.JSX.Element {
  const blocked = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={blocked}
      style={({ pressed }) => [
        styles.button,
        style,
        pressed && !blocked && styles.pressed,
        blocked && styles.disabled,
      ]}
      hitSlop={Math.max(0, (spec.minTouchTarget - spec.primaryButtonHeight) / 2)}
    >
      {loading ? (
        <ActivityIndicator color={appTheme.colors.primaryText} />
      ) : (
        <Text style={styles.text} maxFontSizeMultiplier={1.2}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: spec.primaryButtonHeight,
    borderRadius: spec.primaryButtonRadius,
    backgroundColor: appTheme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: appTheme.spacing[24],
    ...appTheme.shadows.card,
  },
  text: {
    fontSize: appTheme.typography.bodySemibold.fontSize,
    lineHeight: appTheme.typography.bodySemibold.lineHeight,
    fontWeight: appTheme.typography.bodySemibold.fontWeight,
    color: appTheme.colors.primaryText,
  },
  pressed: { opacity: 0.92 },
  disabled: {
    backgroundColor: appTheme.colors.disabledBg,
    shadowOpacity: 0,
    elevation: 0,
  },
});
