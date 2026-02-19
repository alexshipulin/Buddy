import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { uiTheme } from '../theme';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
};

export function Chip({ label, selected = false, onPress }: Props): React.JSX.Element {
  return (
    <Pressable onPress={onPress} style={[styles.base, selected ? styles.selected : null]}>
      <Text style={[styles.text, selected ? styles.selectedText : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 42,
    borderRadius: uiTheme.radius.pill,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
    backgroundColor: '#FAFBFD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: {
    backgroundColor: uiTheme.colors.primary,
    borderColor: uiTheme.colors.primary,
  },
  text: {
    fontSize: 16,
    color: '#334155',
    fontWeight: '500',
  },
  selectedText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
