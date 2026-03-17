import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { spec } from '../design/spec';
import { appTheme } from '../design/theme';

type Props = { title: string; onPress?: () => void; style?: StyleProp<ViewStyle>; disabled?: boolean; loading?: boolean };

export function SecondaryButton({ title, onPress, style, disabled, loading = false }: Props): React.JSX.Element {
  const isDisabled = disabled || loading;
  return (
    <Pressable onPress={onPress} disabled={isDisabled} hitSlop={Math.max(0, (spec.minTouchTarget - spec.primaryButtonHeight) / 2)} style={({ pressed }) => [styles.button, style, pressed && !isDisabled ? styles.pressed : null, isDisabled ? styles.disabled : null]}>
      {loading ? <ActivityIndicator color={appTheme.colors.textSecondary} size="small" /> : <Text style={styles.text} maxFontSizeMultiplier={1.2}>{title}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: appTheme.colors.surface,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: spec.primaryButtonRadius,
    paddingHorizontal: spec.primaryButtonPaddingHorizontal,
    minHeight: spec.primaryButtonHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { color: appTheme.colors.textSecondary, fontWeight: appTheme.typography.bodySemibold.fontWeight, fontSize: appTheme.typography.bodySemibold.fontSize },
  pressed: { opacity: 0.9 },
  disabled: { opacity: 0.55 },
});
