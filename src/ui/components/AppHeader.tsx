import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { uiTheme } from '../theme';

type Props = {
  title?: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
};

export function AppHeader({ title, onBack, rightAction }: Props): React.JSX.Element {
  return (
    <View style={styles.row}>
      <View style={styles.side}>
        {onBack ? (
          <Pressable onPress={onBack} style={styles.iconBtn} hitSlop={8}>
            <Text style={styles.backGlyph}>‹</Text>
          </Pressable>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>
      <Text numberOfLines={1} style={styles.title}>
        {title ?? ''}
      </Text>
      <View style={styles.side}>{rightAction ?? <View style={styles.placeholder} />}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 40, flexDirection: 'row', alignItems: 'center', marginBottom: uiTheme.spacing.sm },
  side: { width: 40, alignItems: 'center', justifyContent: 'center' },
  placeholder: { width: 24, height: 24 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFFCC',
  },
  backGlyph: { color: uiTheme.colors.textPrimary, fontSize: 28, lineHeight: 28, marginTop: -2 },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
    color: uiTheme.colors.textPrimary,
  },
});
