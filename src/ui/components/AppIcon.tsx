import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { uiTheme } from '../theme';

type IconName = 'scan' | 'meal' | 'profile' | 'diet' | 'sparkles' | 'camera';

/** Material Icons (filled). Scan = camera_alt, Track meal = edit; both 24×24 on Home. */
const MATERIAL_ICON_NAMES: Partial<Record<IconName, string>> = {
  diet: 'local-fire-department',       // Lose fat
  sparkles: 'local-florist',          // Maintain weight
  meal: 'edit',                       // Track meal (Material filled edit)
  profile: 'restaurant',               // Eat healthier
  scan: 'camera-alt',                 // Scan menu (Material filled camera_alt)
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

  /** Home tiles: icon strictly 24×24pt inside parent's 56×56 circle (Figma/Swift spec). Goal cards: 44 circle with colored bg. */
  const HOME_TILE_ICON_SIZE = 24;
  const isTileIcon = size === HOME_TILE_ICON_SIZE;
  const containerSize = isTileIcon ? HOME_TILE_ICON_SIZE : 44;
  const iconSizePx = isTileIcon ? HOME_TILE_ICON_SIZE : 24;
  const wrapBg = isTileIcon ? 'transparent' : getBackgroundColor();

  const materialCast = materialName as 'local-fire-department' | 'local-florist' | 'fitness-center' | 'restaurant' | 'camera-alt' | 'edit';

  if (materialName != null) {
    return (
      <View style={[styles.wrap, { width: containerSize, height: containerSize, borderRadius: containerSize / 2, backgroundColor: wrapBg }]}>
        <MaterialIcons name={materialCast} size={iconSizePx} color={getColor()} />
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
