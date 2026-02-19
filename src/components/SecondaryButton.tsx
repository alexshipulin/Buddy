import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { appTheme } from '../design/theme';

type Props = { title: string; onPress?: () => void; style?: ViewStyle };

export function SecondaryButton({ title, onPress, style }: Props): React.JSX.Element {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.button, style, pressed && styles.pressed]}>
      <Text style={styles.text}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: appTheme.colors.secondaryButton,
    borderRadius: appTheme.radius.pill,
    paddingHorizontal: appTheme.spacing.lg,
    paddingVertical: 15,
    alignItems: 'center',
  },
  text: { color: appTheme.colors.textSecondary, fontWeight: '700', fontSize: appTheme.typography.body },
  pressed: { opacity: 0.85 },
});
