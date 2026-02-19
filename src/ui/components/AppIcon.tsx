import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { uiTheme } from '../theme';

type IconName = 'scan' | 'meal' | 'profile' | 'diet' | 'sparkles' | 'camera';

type Props = {
  name: IconName;
  size?: number;
};

export function AppIcon({ name, size = 20 }: Props): React.JSX.Element {
  if (name === 'scan') {
    return (
      <View style={[styles.wrap, { backgroundColor: '#F1E9FF' }]}>
        <Text style={[styles.glyph, { fontSize: size, color: '#7C3AED' }]}>⌁</Text>
      </View>
    );
  }
  if (name === 'meal') {
    return (
      <View style={[styles.wrap, { backgroundColor: '#FFF2E8' }]}>
        <Text style={[styles.glyph, { fontSize: size, color: '#EA580C' }]}>⋈</Text>
      </View>
    );
  }
  if (name === 'profile') {
    return (
      <View style={[styles.wrap, { backgroundColor: '#EEF1F6' }]}>
        <Text style={[styles.glyph, { fontSize: size, color: '#475569' }]}>◉</Text>
      </View>
    );
  }
  if (name === 'diet') {
    return (
      <View style={[styles.wrap, { backgroundColor: '#EAFBF2' }]}>
        <Text style={[styles.glyph, { fontSize: size, color: '#16A34A' }]}>✿</Text>
      </View>
    );
  }
  if (name === 'camera') {
    return (
      <View style={[styles.wrap, { backgroundColor: '#EEF1F6' }]}>
        <Text style={[styles.glyph, { fontSize: size, color: '#94A3B8' }]}>◌</Text>
      </View>
    );
  }
  return (
    <View style={[styles.wrap, { backgroundColor: '#F3EBFF' }]}>
      <Text style={[styles.glyph, { fontSize: size, color: uiTheme.colors.accent }]}>✦</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: { fontWeight: '700' },
});
