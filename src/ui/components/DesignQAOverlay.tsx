import React from 'react';
import { Image, LayoutChangeEvent, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { appTheme } from '../../design/theme';
import { spec } from '../../design/spec';

type ReferenceOption = {
  key: string;
  label: string;
  uri: string;
};

type Props = {
  /** Reference image URI (local asset or remote) */
  referenceImageUri: string;
  /** Optional references list to toggle per screen */
  referenceOptions?: ReferenceOption[];
  activeReferenceKey?: string;
  onReferenceChange?: (key: string) => void;
  /** Current opacity (0-100) */
  opacity: number;
  /** Callback when opacity changes */
  onOpacityChange: (opacity: number) => void;
  /** X/Y offset controls in points */
  offsetX?: number;
  offsetY?: number;
  onOffsetXChange?: (x: number) => void;
  onOffsetYChange?: (y: number) => void;
  /** Live layout metrics shown in panel */
  safeAreaTop?: number;
  pagePaddingX?: number;
  titleTextStyleName?: string;
  /** Callback to close */
  onClose: () => void;
  visible: boolean;
};

/**
 * Design QA overlay: shows reference image over current UI for pixel-perfect comparison.
 * Usage: Enable via dev gesture (e.g., 5 taps on title) or dev toggle.
 */
export function DesignQAOverlay({
  referenceImageUri,
  referenceOptions,
  activeReferenceKey,
  onReferenceChange,
  opacity,
  onOpacityChange,
  offsetX = 0,
  offsetY = 0,
  onOffsetXChange,
  onOffsetYChange,
  safeAreaTop,
  pagePaddingX,
  titleTextStyleName,
  onClose,
  visible,
}: Props): React.JSX.Element | null {
  const [sliderWidth, setSliderWidth] = React.useState(0);

  if (!visible) return null;

  const currentRef = referenceOptions?.find((r) => r.key === activeReferenceKey);

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.controls}>
          {referenceOptions && referenceOptions.length > 0 ? (
            <View style={styles.refRow}>
              {referenceOptions.map((option) => (
                <Pressable
                  key={option.key}
                  onPress={() => onReferenceChange?.(option.key)}
                  style={[styles.refPill, option.key === activeReferenceKey && styles.refPillActive]}
                >
                  <Text style={[styles.refPillText, option.key === activeReferenceKey && styles.refPillTextActive]}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <Text style={styles.label}>Reference opacity: {opacity}%</Text>
          <View style={styles.sliderContainer}>
            <Pressable
              style={styles.sliderTrack}
              onLayout={(e: LayoutChangeEvent) => setSliderWidth(e.nativeEvent.layout.width)}
              onPress={(e) => {
                if (sliderWidth > 0) {
                  const newOpacity = Math.round((e.nativeEvent.locationX / sliderWidth) * 100);
                  onOpacityChange(Math.max(0, Math.min(100, newOpacity)));
                }
              }}
            >
              <View style={[styles.sliderFill, { width: `${opacity}%` }]} />
            </Pressable>
          </View>
          <View style={styles.offsetRow}>
            <Text style={styles.metricLabel}>Offset X: {offsetX}pt</Text>
            <View style={styles.offsetActions}>
              <Pressable style={styles.offsetBtn} onPress={() => onOffsetXChange?.(offsetX - 1)}><Text style={styles.offsetBtnText}>-1</Text></Pressable>
              <Pressable style={styles.offsetBtn} onPress={() => onOffsetXChange?.(offsetX + 1)}><Text style={styles.offsetBtnText}>+1</Text></Pressable>
            </View>
          </View>
          <View style={styles.offsetRow}>
            <Text style={styles.metricLabel}>Offset Y: {offsetY}pt</Text>
            <View style={styles.offsetActions}>
              <Pressable style={styles.offsetBtn} onPress={() => onOffsetYChange?.(offsetY - 1)}><Text style={styles.offsetBtnText}>-1</Text></Pressable>
              <Pressable style={styles.offsetBtn} onPress={() => onOffsetYChange?.(offsetY + 1)}><Text style={styles.offsetBtnText}>+1</Text></Pressable>
            </View>
          </View>
          <View style={styles.metricsBox}>
            <Text style={styles.metricLabel}>safeAreaTop: {safeAreaTop ?? '-'}</Text>
            <Text style={styles.metricLabel}>pagePaddingX: {pagePaddingX ?? '-'}</Text>
            <Text style={styles.metricLabel}>titleStyle: {titleTextStyleName ?? '-'}</Text>
          </View>
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>
        <Image
          source={{ uri: currentRef?.uri ?? referenceImageUri }}
          style={[styles.referenceImage, { opacity: opacity / 100, transform: [{ translateX: offsetX }, { translateY: offsetY }] }]}
          resizeMode="contain"
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  controls: {
    position: 'absolute',
    top: 60,
    left: spec.screenPaddingHorizontal,
    right: spec.screenPaddingHorizontal,
    backgroundColor: appTheme.colors.surface,
    borderRadius: spec.radius.input,
    padding: spec.spacing[16],
    zIndex: 1000,
    gap: spec.spacing[12],
  },
  refRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spec.spacing[8],
  },
  refPill: {
    minHeight: 32,
    paddingHorizontal: spec.spacing[8],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    backgroundColor: appTheme.colors.surface,
    justifyContent: 'center',
  },
  refPillActive: {
    backgroundColor: appTheme.colors.accentSoft,
    borderColor: appTheme.colors.accent,
  },
  refPillText: {
    color: appTheme.colors.textSecondary,
    fontSize: appTheme.typography.caption1.fontSize,
    fontWeight: '600',
  },
  refPillTextActive: {
    color: appTheme.colors.accent,
  },
  label: {
    fontSize: appTheme.typography.body.fontSize,
    fontWeight: '600',
    color: appTheme.colors.textPrimary,
  },
  sliderContainer: {
    height: 40,
    justifyContent: 'center',
  },
  sliderTrack: {
    height: 4,
    backgroundColor: appTheme.colors.border,
    borderRadius: 2,
    position: 'relative',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: appTheme.colors.accent,
    borderRadius: 2,
  },
  offsetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  offsetActions: {
    flexDirection: 'row',
    gap: spec.spacing[8],
  },
  offsetBtn: {
    minWidth: 44,
    minHeight: 32,
    paddingHorizontal: spec.spacing[8],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: appTheme.colors.surface,
  },
  offsetBtnText: {
    color: appTheme.colors.textPrimary,
    fontSize: appTheme.typography.caption1.fontSize,
    fontWeight: '600',
  },
  metricsBox: {
    gap: spec.spacing[4],
    paddingTop: spec.spacing[4],
  },
  metricLabel: {
    color: appTheme.colors.textSecondary,
    fontSize: appTheme.typography.caption1.fontSize,
  },
  closeBtn: {
    backgroundColor: appTheme.colors.accent,
    borderRadius: spec.radius.input,
    paddingVertical: spec.spacing[8],
    paddingHorizontal: spec.spacing[16],
    alignItems: 'center',
  },
  closeText: {
    color: appTheme.colors.primaryText,
    fontSize: appTheme.typography.bodySemibold.fontSize,
    fontWeight: '600',
  },
  referenceImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
