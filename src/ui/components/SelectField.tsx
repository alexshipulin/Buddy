import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { appTheme } from '../../design/theme';
import { spec } from '../../design/spec';

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
        <Text style={styles.value} numberOfLines={1}>{active}</Text>
        <Text style={styles.chevron}>⌄</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 6 },
  label: {
    fontSize: appTheme.typography.caption.fontSize,
    color: appTheme.colors.muted,
  },
  field: {
    minHeight: spec.inputHeight,
    borderRadius: spec.inputRadius,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    backgroundColor: appTheme.colors.surface,
    paddingHorizontal: spec.inputPaddingX,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  value: {
    flex: 1,
    fontSize: appTheme.typography.body.fontSize,
    color: appTheme.colors.textPrimary,
    fontWeight: '500',
  },
  chevron: { color: appTheme.colors.muted, fontSize: 18, lineHeight: 18 },
});
