import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { appTheme } from '../design/theme';

type Props = { title: string; onPress?: () => void; style?: StyleProp<ViewStyle>; disabled?: boolean; loading?: boolean };

export function PrimaryButton({ title, onPress, style, disabled, loading = false }: Props): React.JSX.Element {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.button, style, pressed && !isDisabled ? styles.pressed : null, isDisabled ? styles.disabled : null]}
      disabled={isDisabled}
      hitSlop={4}
    >
      {loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.text}>{title}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: appTheme.colors.primaryButton,
    borderRadius: appTheme.radius.pill,
    paddingHorizontal: appTheme.spacing.lg,
    paddingVertical: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { color: '#FFFFFF', fontWeight: '700', fontSize: appTheme.typography.body.fontSize },
  pressed: { opacity: 0.9 },
  disabled: { opacity: 0.45 },
});
