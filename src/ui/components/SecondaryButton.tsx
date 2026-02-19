import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { uiTheme } from '../theme';

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
      style={({ pressed }) => [styles.button, style, pressed && !blocked ? styles.pressed : null, blocked ? styles.disabled : null]}
    >
      {loading ? <ActivityIndicator color={uiTheme.colors.textSecondary} /> : <Text style={styles.text}>{title}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 56,
    borderRadius: uiTheme.radius.pill,
    backgroundColor: uiTheme.colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: uiTheme.spacing.lg,
  },
  text: { color: '#1F2937', fontWeight: '700', fontSize: 28 / 1.75 },
  pressed: { opacity: 0.9 },
  disabled: { opacity: 0.5 },
});
