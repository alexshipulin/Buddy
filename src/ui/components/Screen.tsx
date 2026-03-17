import React from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleProp,
  StyleSheet,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getContentMaxWidth, getPagePaddingX, layout } from '../../design/layout';
import { spec } from '../../design/spec';
import { appTheme } from '../../design/theme';

type Props = {
  children: React.ReactNode;
  scroll?: boolean;
  keyboardAvoiding?: boolean;
  padded?: boolean;
  /**
   * Apply top safe-area spacing for content screens.
   * Disable (`false`) when a dedicated header already handles top safe area.
   */
  safeTop?: boolean;
  /** Keep bottom safe-area spacing for non-CTA content */
  safeBottom?: boolean;
  /** Reserve content space for fixed BottomCTA */
  hasBottomCTA?: boolean;
  /** Optional override for tablet max width */
  maxContentWidth?: number;
  /** Padding bottom offset when BottomCTA is present */
  bottomCTAPadding?: number;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
};

export function Screen({
  children,
  scroll = false,
  keyboardAvoiding = false,
  padded = true,
  safeTop = true,
  safeBottom = true,
  hasBottomCTA = false,
  maxContentWidth,
  bottomCTAPadding = 0,
  contentContainerStyle,
  style,
}: Props): React.JSX.Element {
  // Audit note: previous wrapper used a fixed max width on iPhone and had no default top safe-area inset.
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pagePaddingX = getPagePaddingX(width);
  const topPadding = safeTop ? insets.top + layout.topContentOffset : 0;
  const reservedBottomForCTA = hasBottomCTA ? insets.bottom + spec.primaryButtonHeight + layout.itemSpacingY + layout.bottomContentOffset : 0;
  const safeBottomPadding = safeBottom ? insets.bottom + layout.bottomContentOffset : 0;
  const basePaddingBottom = bottomCTAPadding > 0 ? bottomCTAPadding : Math.max(safeBottomPadding, reservedBottomForCTA);
  const containerPadding: ViewStyle = padded
    ? {
        paddingHorizontal: pagePaddingX,
        paddingTop: topPadding,
        paddingBottom: basePaddingBottom,
      }
    : { paddingTop: topPadding, paddingBottom: basePaddingBottom };

  const contentMaxWidth = getContentMaxWidth(width);
  const contentWrapperStyle: ViewStyle = contentMaxWidth != null
    ? {
        maxWidth: maxContentWidth ?? contentMaxWidth,
        width: '100%',
        alignSelf: 'center',
      }
    : {};

  const content = scroll ? (
    <ScrollView
      style={[styles.flex, styles.scrollBg]}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[containerPadding, styles.scrollGrow, contentWrapperStyle, styles.contentBg, contentContainerStyle]}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, containerPadding, contentWrapperStyle, styles.contentBg, contentContainerStyle]}>{children}</View>
  );

  if (!keyboardAvoiding) {
    return <SafeAreaView edges={['left', 'right']} style={[styles.root, style]}>{content}</SafeAreaView>;
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <SafeAreaView edges={['left', 'right']} style={[styles.root, style]}>
        {content}
        </SafeAreaView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: appTheme.colors.background },
  flex: { flex: 1 },
  scrollGrow: { flexGrow: 1 },
  scrollBg: { backgroundColor: appTheme.colors.background },
  contentBg: { backgroundColor: appTheme.colors.background },
});
