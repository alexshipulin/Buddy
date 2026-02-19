import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { appTheme } from '../design/theme';

type Props = ViewProps & { children: React.ReactNode };

export function AppScreen({ children, style, ...rest }: Props): React.JSX.Element {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.container, style]} {...rest}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: appTheme.colors.background },
  container: { flex: 1, paddingHorizontal: appTheme.spacing.md, paddingVertical: appTheme.spacing.md },
});
