import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../app/navigation/types';
import { PrimaryButton } from '../ui/components/PrimaryButton';
import { uiTheme } from '../ui/theme';
import { typography } from '../ui/typography';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

export function WelcomeScreen({ navigation }: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <ImageBackground source={{ uri: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=1200&auto=format&fit=crop' }} style={styles.hero}>
        <View style={[styles.topRow, { paddingTop: insets.top + uiTheme.spacing.sm }]}>
          <Pressable style={styles.skipBtn} hitSlop={8} onPress={() => navigation.navigate('GoalSelection')}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>
      </ImageBackground>
      <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + uiTheme.spacing.md }]}>
        <View style={styles.handle} />
        <View style={styles.content}>
          <Text style={styles.title}>Pick the best dish fast</Text>
          <Text style={styles.subtitle}>Scan a menu and get simple picks that fit your goal and preferences.</Text>
          <PrimaryButton title="Get started" onPress={() => navigation.navigate('GoalSelection')} />
          <Pressable onPress={() => navigation.navigate('SignInNudge', { source: 'manual' })}>
            <Text style={styles.link}>Already have an account? Log in</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: { flex: 1, justifyContent: 'flex-start' },
  topRow: { paddingHorizontal: uiTheme.spacing.md, alignItems: 'flex-end' },
  skipBtn: { backgroundColor: '#00000044', borderRadius: uiTheme.radius.pill, paddingHorizontal: 14, paddingVertical: 7 },
  skipText: { color: '#FFFFFF', fontWeight: '600' },
  bottomSheet: {
    marginTop: -22,
    backgroundColor: uiTheme.colors.surface,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    paddingHorizontal: uiTheme.spacing.md,
    paddingTop: uiTheme.spacing.sm,
  },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 4, backgroundColor: '#E5E7EB', marginTop: 8 },
  content: { gap: uiTheme.spacing.md, marginTop: 6 },
  title: { ...typography.h1, fontSize: 54 / 1.6, lineHeight: 44, textAlign: 'center' },
  subtitle: { ...typography.body, color: uiTheme.colors.textSecondary, textAlign: 'center' },
  link: { color: uiTheme.colors.textSecondary, fontSize: 14, textAlign: 'center', fontWeight: '500' },
});
