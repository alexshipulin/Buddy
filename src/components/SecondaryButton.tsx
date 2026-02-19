import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { appTheme } from '../design/theme';

type Props = { title: string; onPress?: () => void; style?: StyleProp<ViewStyle>; disabled?: boolean; loading?: boolean };

export function SecondaryButton({ title, onPress, style, disabled, loading = false }: Props): React.JSX.Element {
  const isDisabled = disabled || loading;
  return (
    <Pressable onPress={onPress} disabled={isDisabled} hitSlop={4} style={({ pressed }) => [styles.button, style, pressed && !isDisabled ? styles.pressed : null, isDisabled ? styles.disabled : null]}>
      {loading ? <ActivityIndicator color={appTheme.colors.textSecondary} size="small" /> : <Text style={styles.text}>{title}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: appTheme.colors.secondaryButton,
    borderRadius: appTheme.radius.pill,
    paddingHorizontal: appTheme.spacing.lg,
    paddingVertical: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { color: appTheme.colors.textSecondary, fontWeight: '700', fontSize: appTheme.typography.body },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.55 },
});
