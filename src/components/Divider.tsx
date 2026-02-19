import React from 'react';
import { StyleSheet, View } from 'react-native';
import { appTheme } from '../design/theme';

export function Divider(): React.JSX.Element {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: appTheme.colors.border, width: '100%' },
});
