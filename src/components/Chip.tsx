import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { spec } from '../design/spec';
import { appTheme } from '../design/theme';

type Props = {
  label: string;
  selected?: boolean;
  variant?: 'positive' | 'risk' | 'neutral';
};

/** Legacy Chip (no onPress). Prefer ui/components/Chip for tappable chips. */
export function Chip({ label, selected = false, variant = 'neutral' }: Props): React.JSX.Element {
  return (
    <View
      style={[
        styles.chip,
        selected && styles.selectedChip,
        variant === 'positive' && styles.chipPositive,
        variant === 'risk' && styles.chipRisk,
      ]}
    >
      <Text
        style={[
          styles.text,
          selected && styles.selectedText,
          variant === 'positive' && styles.textPositive,
          variant === 'risk' && styles.textRisk,
        ]}
        maxFontSizeMultiplier={1.2}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: spec.chipHeight,
    borderRadius: spec.chipRadius,
    paddingHorizontal: spec.chipPaddingX,
    backgroundColor: appTheme.colors.surface,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  text: { color: appTheme.colors.textSecondary, fontSize: appTheme.typography.footnote.fontSize, fontWeight: '600' },
  selectedChip: { backgroundColor: appTheme.colors.ink, borderColor: appTheme.colors.ink },
  selectedText: { color: appTheme.colors.primaryText },
  chipPositive: { backgroundColor: '#ECFDF3', borderColor: '#86EFAC' },
  chipRisk: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  textPositive: { color: '#16A34A' },
  textRisk: { color: '#DC2626' },
});
