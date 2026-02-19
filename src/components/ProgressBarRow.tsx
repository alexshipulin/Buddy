import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { appTheme } from '../design/theme';

type Props = { label: string; valueLabel: string; progress: number };

export function ProgressBarRow({ label, valueLabel, progress }: Props): React.JSX.Element {
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{valueLabel}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${clamped * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: appTheme.spacing.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { color: appTheme.colors.textSecondary, fontSize: appTheme.typography.small.fontSize },
  value: { color: appTheme.colors.textPrimary, fontSize: appTheme.typography.small.fontSize, fontWeight: '600' },
  track: { backgroundColor: appTheme.colors.progressTrack, borderRadius: appTheme.radius.pill, height: 8, overflow: 'hidden' },
  fill: { backgroundColor: appTheme.colors.accent, height: '100%', borderRadius: appTheme.radius.pill },
});
