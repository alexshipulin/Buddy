import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { uiTheme } from '../theme';

type IconName = 'scan' | 'meal' | 'profile' | 'diet' | 'sparkles' | 'camera';

/** Material Icons (filled). Goal cards: 24 in 44px circle; Home tiles: 24×24. */
const MATERIAL_ICON_NAMES: Partial<Record<IconName, string>> = {
  diet: 'local-fire-department',       // Lose fat
  sparkles: 'local-florist',          // Maintain weight
  meal: 'fitness-center',             // Gain muscle / Track meal
  profile: 'restaurant',               // Eat healthier
  scan: 'document-scanner',            // Scan menu
};

type Props = {
  name: IconName;
  size?: number;
};

export function AppIcon({ name, size = 20 }: Props): React.JSX.Element {
  const materialName = MATERIAL_ICON_NAMES[name];
  const getGlyph = (): string => {
    if (name === 'scan') return '⌁';
    if (name === 'meal') return '⋈';
    if (name === 'profile') return '◉';
    if (name === 'diet') return '✿';
    if (name === 'camera') return '◌';
    return '✦';
  };

  const getBackgroundColor = (): string => {
    if (name === 'scan') return '#F1E9FF';
    if (name === 'meal') return '#FFF2E8';
    if (name === 'profile') return '#EEF1F6';
    if (name === 'diet') return '#EAFBF2';
    if (name === 'camera') return '#EEF1F6';
    return '#F3EBFF';
  };

  const getColor = (): string => {
    if (name === 'scan') return '#7C3AED';
    if (name === 'meal') return '#EA580C';
    if (name === 'profile') return '#475569';
    if (name === 'diet') return '#16A34A';
    if (name === 'camera') return '#94A3B8';
    return uiTheme.colors.accent;
  };

  const containerSize = size !== undefined && size !== 20 ? size : 44;
  const iconSize = size !== undefined && size !== 20 ? size : 24;

  const materialCast = materialName as 'local-fire-department' | 'local-florist' | 'fitness-center' | 'restaurant' | 'document-scanner';

  if (materialName != null) {
    return (
      <View style={[styles.wrap, { width: containerSize, height: containerSize, borderRadius: containerSize / 2, backgroundColor: getBackgroundColor() }]}>
        <MaterialIcons name={materialCast} size={iconSize} color={getColor()} />
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { width: containerSize, height: containerSize, borderRadius: containerSize / 2, backgroundColor: getBackgroundColor() }]}>
      <View style={[styles.glyphBox, { width: size, height: size }]}>
        <Text
          style={[styles.glyph, { fontSize: size, lineHeight: size, width: size, height: size, color: getColor() }]}
          numberOfLines={1}
        >
          {getGlyph()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyphBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
  },
});
