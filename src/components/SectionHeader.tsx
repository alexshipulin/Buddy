import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { appTheme } from '../design/theme';

type Props = { title: string; rightText?: string };

export function SectionHeader({ title, rightText }: Props): React.JSX.Element {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {rightText ? <Text style={styles.right}>{rightText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: appTheme.typography.h3.fontSize, fontWeight: '700', color: appTheme.colors.textPrimary },
  right: { fontSize: appTheme.typography.small.fontSize, color: appTheme.colors.textSecondary },
});
