import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { uiTheme } from '../theme';

type Option<T extends string> = { label: string; value: T };

type Props<T extends string> = {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
};

export function SelectField<T extends string>({ label, value, options, onChange }: Props<T>): React.JSX.Element {
  const currentIdx = options.findIndex((item) => item.value === value);
  const active = options[currentIdx]?.label ?? value;

  const cycle = (): void => {
    if (!options.length) return;
    const nextIdx = currentIdx < 0 ? 0 : (currentIdx + 1) % options.length;
    onChange(options[nextIdx].value);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.field} onPress={cycle}>
        <Text style={styles.value}>{active}</Text>
        <Text style={styles.chevron}>⌄</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 6 },
  label: { fontSize: 13, color: '#6B7280' },
  field: {
    minHeight: 44,
    borderRadius: uiTheme.radius.sm,
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  value: { color: uiTheme.colors.textPrimary, fontSize: 16, fontWeight: '500' },
  chevron: { color: '#6B7280', fontSize: 18, lineHeight: 18 },
});
