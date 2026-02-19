import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { appTheme } from '../design/theme';

type Props = { title: string; onPress?: () => void; style?: ViewStyle; disabled?: boolean };

export function PrimaryButton({ title, onPress, style, disabled }: Props): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.button, style, pressed && !disabled ? styles.pressed : null, disabled ? styles.disabled : null]}
      disabled={disabled}
    >
      <Text style={styles.text}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: appTheme.colors.primaryButton,
    borderRadius: appTheme.radius.pill,
    paddingHorizontal: appTheme.spacing.lg,
    paddingVertical: 15,
    alignItems: 'center',
  },
  text: { color: '#FFFFFF', fontWeight: '700', fontSize: appTheme.typography.body },
  pressed: { opacity: 0.9 },
  disabled: { opacity: 0.45 },
});
