import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { appTheme } from '../design/theme';

type Props = { label: string; selected?: boolean };

export function Chip({ label, selected = false }: Props): React.JSX.Element {
  return (
    <View style={[styles.chip, selected && styles.selectedChip]}>
      <Text style={[styles.text, selected && styles.selectedText]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: appTheme.radius.pill,
    paddingHorizontal: appTheme.spacing.sm,
    paddingVertical: 7,
    alignSelf: 'flex-start',
  },
  text: { color: appTheme.colors.textSecondary, fontSize: appTheme.typography.small.fontSize, fontWeight: '600' },
  selectedChip: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  selectedText: { color: '#FFFFFF' },
});
