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
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
};

export function Screen({
  children,
  scroll = false,
  keyboardAvoiding = false,
  padded = true,
  contentContainerStyle,
  style,
}: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const containerPadding: ViewStyle = padded
    ? {
        paddingHorizontal: spec.screenPaddingHorizontal,
        paddingBottom: insets.bottom + spec.screenPaddingBottomOffset,
      }
    : { paddingBottom: insets.bottom };

  const content = scroll ? (
    <ScrollView
      style={styles.flex}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[containerPadding, styles.scrollGrow, contentContainerStyle]}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, containerPadding, contentContainerStyle]}>{children}</View>
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
