import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { appTheme } from '../../design/theme';
import { spec } from '../../design/spec';

type Props = TextInputProps & {
  label?: string;
};

export function TextField({ label, style, placeholderTextColor, ...rest }: Props): React.JSX.Element {
  return (
    <View style={styles.container}>
      {label != null ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor={placeholderTextColor ?? appTheme.colors.muted}
        maxFontSizeMultiplier={1.2}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: {
    fontSize: appTheme.typography.caption.fontSize,
    fontWeight: appTheme.typography.caption.fontWeight,
    color: appTheme.colors.muted,
  },
  input: {
    height: spec.inputHeight,
    borderRadius: spec.inputRadius,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    paddingHorizontal: spec.inputPaddingX,
    backgroundColor: appTheme.colors.surface,
    fontSize: appTheme.typography.body.fontSize,
    lineHeight: appTheme.typography.body.lineHeight,
    color: appTheme.colors.textPrimary,
  },
});
