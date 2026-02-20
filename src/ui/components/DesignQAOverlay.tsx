import React from 'react';
import { Image, LayoutChangeEvent, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { appTheme } from '../../design/theme';
import { spec } from '../../design/spec';

type Props = {
  /** Reference image URI (local asset or remote) */
  referenceImageUri: string;
  /** Current opacity (0-100) */
  opacity: number;
  /** Callback when opacity changes */
  onOpacityChange: (opacity: number) => void;
  /** Callback to close */
  onClose: () => void;
  visible: boolean;
};

/**
 * Design QA overlay: shows reference image over current UI for pixel-perfect comparison.
 * Usage: Enable via dev gesture (e.g., 5 taps on title) or dev toggle.
 */
export function DesignQAOverlay({ referenceImageUri, opacity, onOpacityChange, onClose, visible }: Props): React.JSX.Element | null {
  const [sliderWidth, setSliderWidth] = React.useState(0);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.controls}>
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
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>
        <Image
          source={{ uri: referenceImageUri }}
          style={[styles.referenceImage, { opacity: opacity / 100 }]}
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
