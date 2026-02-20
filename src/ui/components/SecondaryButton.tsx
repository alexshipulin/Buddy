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

export function SecondaryButton({ title, onPress, disabled = false, loading = false, style }: Props): React.JSX.Element {
  const blocked = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={blocked}
      style={({ pressed }) => [styles.button, style, pressed && !blocked && styles.pressed, blocked && styles.disabled]}
    >
      {loading ? <ActivityIndicator color={appTheme.colors.muted} /> : <Text style={styles.text} maxFontSizeMultiplier={1.2}>{title}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: spec.primaryButtonHeight,
    borderRadius: spec.primaryButtonRadius,
    backgroundColor: appTheme.colors.surface,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spec.primaryButtonPaddingHorizontal,
  },
  text: {
    fontSize: appTheme.typography.bodySemibold.fontSize,
    fontWeight: appTheme.typography.bodySemibold.fontWeight,
    color: appTheme.colors.textPrimary,
  },
  pressed: { opacity: 0.9 },
  disabled: { opacity: 0.5 },
});
