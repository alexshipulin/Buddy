import React from 'react';
import { StyleProp, StyleSheet, View, ViewProps, ViewStyle } from 'react-native';
import { appTheme } from '../../design/theme';
import { spec } from '../../design/spec';

type Props = ViewProps & {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Card({ children, style, ...rest }: Props): React.JSX.Element {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: appTheme.colors.surface,
    borderRadius: spec.cardRadius,
    borderWidth: spec.cardBorderWidth,
    borderColor: appTheme.colors.border,
    padding: spec.cardPadding,
    ...appTheme.shadows.card,
  },
});
