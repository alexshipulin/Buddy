import React from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ScrollViewProps,
  StyleProp,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
  ViewProps,
  ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { layout } from '../design/layout';
import { spec } from '../design/spec';
import { appTheme } from '../design/theme';

type Props = ViewProps & {
  children: React.ReactNode;
  scroll?: boolean;
  keyboardAvoiding?: boolean;
  keyboardVerticalOffset?: number;
  keyboardShouldPersistTaps?: ScrollViewProps['keyboardShouldPersistTaps'];
  background?: 'default' | 'surface';
  contentStyle?: StyleProp<ViewStyle>;
  padded?: boolean;
  respectInsets?: boolean;
  dismissKeyboardOnTouch?: boolean;
};

export function AppScreen({
  children,
  style,
  scroll = false,
  keyboardAvoiding = false,
  keyboardVerticalOffset = 0,
  keyboardShouldPersistTaps = 'handled',
  background = 'default',
  contentStyle,
  padded = true,
  respectInsets = true,
  dismissKeyboardOnTouch = false,
  ...rest
}: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const topInset = respectInsets ? insets.top : 0;
  const bottomInset = respectInsets ? insets.bottom : 0;
  const paddingStyle: ViewStyle = padded
    ? {
        paddingHorizontal: spec.screenPaddingHorizontal,
        paddingTop: topInset + layout.topContentOffset,
        paddingBottom: bottomInset + spec.screenPaddingBottomOffset,
      }
    : { paddingTop: topInset + layout.topContentOffset, paddingBottom: bottomInset };
  const backgroundColor = background === 'surface' ? appTheme.colors.surface : appTheme.colors.background;

  const containerContent = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      contentContainerStyle={[styles.scrollContent, paddingStyle, contentStyle]}
      style={styles.flex}
      {...rest}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, paddingStyle, contentStyle]} {...rest}>
      {children}
    </View>
  );

  const keyboardWrapped = keyboardAvoiding ? (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      {containerContent}
    </KeyboardAvoidingView>
  ) : (
    containerContent
  );

  const wrappedContent = dismissKeyboardOnTouch ? (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      {keyboardWrapped}
    </TouchableWithoutFeedback>
  ) : (
    keyboardWrapped
  );

  return <SafeAreaView style={[styles.root, { backgroundColor }, style]}>{wrappedContent}</SafeAreaView>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  content: { flex: 1 },
  scrollContent: { flexGrow: 1 },
});
