import { StyleSheet } from 'react-native';
import { uiTheme } from './theme';

export const typography = StyleSheet.create({
  h1: {
    fontSize: 44,
    lineHeight: 50,
    fontWeight: '800',
    color: uiTheme.colors.textPrimary,
  },
  h2: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    color: uiTheme.colors.textPrimary,
  },
  h3: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    color: uiTheme.colors.textPrimary,
  },
  body: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '500',
    color: uiTheme.colors.textPrimary,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    color: uiTheme.colors.textSecondary,
  },
});
