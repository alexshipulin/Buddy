import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../app/navigation/types';
import { spec } from '../design/spec';
import { appTheme } from '../design/theme';
import { PrimaryButton } from '../ui/components/PrimaryButton';
import { typography } from '../ui/typography';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

export function WelcomeScreen({ navigation }: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=1200&auto=format&fit=crop' }}
        style={styles.hero}
      >
        <View style={[styles.topRow, { paddingTop: insets.top + spec.spacing[8] }]}>
          <Pressable
            style={styles.skipPill}
            onPress={() => navigation.navigate('GoalSelection')}
            hitSlop={8}
          >
            <Text style={styles.skipText} maxFontSizeMultiplier={1.2}>Skip</Text>
          </Pressable>
        </View>
      </ImageBackground>
      <View
        style={[
          styles.bottomSheet,
          {
            paddingBottom: insets.bottom + spec.screenPaddingBottomOffset,
            paddingHorizontal: spec.sheetPaddingHorizontal,
            paddingTop: spec.sheetPaddingTop,
          },
        ]}
      >
        <View style={styles.bottomSheetContent}>
          <View style={styles.textBlock}>
            <Text style={styles.title} maxFontSizeMultiplier={1.2}>Pick the best dish fast</Text>
            <Text style={styles.subtitle} maxFontSizeMultiplier={1.2}>
              Scan a menu and get simple picks that fit your goal and preferences.
            </Text>
          </View>
          <View style={styles.actionsBlock}>
            <PrimaryButton title="Get started" onPress={() => navigation.navigate('GoalSelection')} style={styles.cta} />
            <Pressable onPress={() => navigation.navigate('SignInNudge', { source: 'manual' })} style={styles.linkWrap}>
              <Text style={styles.link} maxFontSizeMultiplier={1.2}>Already have an account? Log in</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: appTheme.colors.background },
  hero: { flex: 1, justifyContent: 'flex-start' },
  topRow: { paddingHorizontal: spec.screenPaddingHorizontal, alignItems: 'flex-end' },
  skipPill: {
    minHeight: spec.headerPillHeight,
    borderRadius: spec.headerPillRadius,
    paddingHorizontal: spec.headerPillPaddingX,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: { color: appTheme.colors.primaryText, fontWeight: '600', fontSize: spec.headerPillFontSize },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: appTheme.colors.surface,
    borderTopLeftRadius: spec.sheetRadius,
    borderTopRightRadius: spec.sheetRadius,
    maxHeight: '60%',
    minHeight: 320,
  },
  bottomSheetContent: {
    flex: 1,
    justifyContent: 'space-between',
    maxWidth: 460,
    alignSelf: 'center',
    width: '100%',
  },
  textBlock: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: spec.spacing[8],
  },
  title: {
    ...typography.hero,
    textAlign: 'center',
    marginBottom: spec.spacing[12],
  },
  subtitle: {
    ...typography.body,
    color: appTheme.colors.muted,
    textAlign: 'center',
    maxWidth: 320,
    alignSelf: 'center',
  },
  actionsBlock: {
    paddingTop: spec.spacing[24],
  },
  cta: { marginBottom: spec.spacing[16] },
  linkWrap: { alignItems: 'center', paddingVertical: spec.spacing[8] },
  link: {
    ...typography.body,
    color: appTheme.colors.muted,
    textAlign: 'center',
  },
});
