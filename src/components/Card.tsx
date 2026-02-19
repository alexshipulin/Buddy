import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { appTheme } from '../design/theme';

type Props = ViewProps & { children: React.ReactNode };

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
    borderRadius: appTheme.radius.xl,
    padding: appTheme.spacing.md,
    borderWidth: 1,
    borderColor: '#F1F3F5',
    ...appTheme.shadows.card,
  },
});
