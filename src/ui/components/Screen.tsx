import React from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleProp,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spec } from '../../design/spec';
import { appTheme } from '../../design/theme';

type Props = {
  children: React.ReactNode;
  scroll?: boolean;
  keyboardAvoiding?: boolean;
  padded?: boolean;
  /** Max content width on wide screens (default: 460). Set to 0 to disable. */
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
  maxContentWidth = 460,
  bottomCTAPadding = 0,
  contentContainerStyle,
  style,
}: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const basePaddingBottom = bottomCTAPadding > 0 ? bottomCTAPadding : insets.bottom + spec.screenPaddingBottomOffset;
  const containerPadding: ViewStyle = padded
    ? {
        paddingHorizontal: spec.screenPaddingHorizontal,
        paddingBottom: basePaddingBottom,
      }
    : { paddingBottom: basePaddingBottom };

  const contentWrapperStyle: ViewStyle = maxContentWidth > 0
    ? {
        maxWidth: maxContentWidth,
        width: '100%',
        alignSelf: 'center',
      }
    : {};

  const content = scroll ? (
    <ScrollView
      style={styles.flex}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[containerPadding, styles.scrollGrow, contentWrapperStyle, contentContainerStyle]}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, containerPadding, contentWrapperStyle, contentContainerStyle]}>{children}</View>
  );

  if (!keyboardAvoiding) {
    return <View style={[styles.root, style]}>{content}</View>;
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.root, style]}>
        {content}
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: appTheme.colors.background },
  flex: { flex: 1 },
  scrollGrow: { flexGrow: 1 },
});
