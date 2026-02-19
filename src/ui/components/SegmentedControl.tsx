import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { uiTheme } from '../theme';

type Props<T extends string> = {
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({ value, options, onChange }: Props<T>): React.JSX.Element {
  return (
    <View style={styles.wrap}>
      {options.map((option) => {
        const active = option === value;
        return (
          <Pressable key={option} style={[styles.item, active ? styles.itemActive : null]} onPress={() => onChange(option)}>
            <Text style={[styles.itemText, active ? styles.itemTextActive : null]}>{option}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#F3F4F7',
    borderRadius: uiTheme.radius.pill,
    padding: 3,
    flexDirection: 'row',
    gap: 4,
  },
  item: {
    flex: 1,
    minHeight: 36,
    borderRadius: uiTheme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemActive: { backgroundColor: uiTheme.colors.primary },
  itemText: { color: '#6B7280', fontSize: 14, fontWeight: '600' },
  itemTextActive: { color: '#FFFFFF' },
});
