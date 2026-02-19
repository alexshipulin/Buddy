import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { appTheme } from '../design/theme';

type Props = { title: string; subtitle?: string; rightText?: string; onPress?: () => void };

export function ListItemRow({ title, subtitle, rightText, onPress }: Props): React.JSX.Element {
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.left}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {rightText ? <Text style={styles.right}>{rightText}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  left: { flexShrink: 1, gap: 4 },
  title: { color: appTheme.colors.textPrimary, fontSize: appTheme.typography.body, fontWeight: '600' },
  subtitle: { color: appTheme.colors.textSecondary, fontSize: appTheme.typography.small },
  right: { color: appTheme.colors.accent, fontSize: appTheme.typography.small, fontWeight: '600' },
  pressed: { opacity: 0.75 },
});
