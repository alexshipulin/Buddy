import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { appTheme } from '../../design/theme';

type Props = {
  calories?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
};

function MacroColumn({ label, value, showBorder }: { label: string; value: string; showBorder: boolean }) {
  return (
    <View style={[styles.column, showBorder && styles.columnBorder]}>
      <Text style={styles.label} maxFontSizeMultiplier={1.2}>{label}</Text>
      <Text style={styles.value} maxFontSizeMultiplier={1.2}>{value}</Text>
    </View>
  );
}

export function MacroBar({ calories, proteinG, carbsG, fatG }: Props): React.JSX.Element | null {
  const hasMacros = calories != null || proteinG != null || carbsG != null || fatG != null;
  if (!hasMacros) return null;

  return (
    <View style={styles.bar}>
      <MacroColumn label="CALS" value={calories != null ? `${calories}` : '—'} showBorder={false} />
      <MacroColumn label="P" value={proteinG != null ? `${proteinG}g` : '—'} showBorder />
      <MacroColumn label="C" value={carbsG != null ? `${carbsG}g` : '—'} showBorder />
      <MacroColumn label="F" value={fatG != null ? `${fatG}g` : '—'} showBorder />
    </View>
  );
}

const MACRO_BAR_BG = '#F8FAFC';

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: MACRO_BAR_BG,
    borderRadius: 32,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  column: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },
  columnBorder: {
    borderLeftWidth: 1,
    borderLeftColor: appTheme.colors.border,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: appTheme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    lineHeight: 15,
    textAlign: 'center',
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
    color: appTheme.colors.textPrimary,
    lineHeight: 20,
    textAlign: 'center',
  },
});
