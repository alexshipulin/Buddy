import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { RootStackParamList } from '../app/navigation/types';
import { AppScreen } from '../components/AppScreen';
import { PrimaryButton } from '../components/PrimaryButton';
import { appTheme } from '../design/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

export function WelcomeScreen({ navigation }: Props): React.JSX.Element {
  return (
    <View style={styles.root}>
      <ImageBackground source={{ uri: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=1200&auto=format&fit=crop' }} style={styles.hero}>
        <View style={styles.topRow}>
          <Pressable style={styles.skipBtn} onPress={() => navigation.navigate('GoalSelection')}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>
      </ImageBackground>
      <AppScreen style={styles.bottomSheet}>
        <View style={styles.handle} />
        <View style={styles.content}>
          <Text style={styles.title}>Pick the best dish fast</Text>
          <Text style={styles.subtitle}>Scan a menu or log a meal. Get clear guidance based on your goal and preferences.</Text>
          <PrimaryButton title="Get started" onPress={() => navigation.navigate('GoalSelection')} />
          <Pressable onPress={() => navigation.navigate('SignInNudge', { source: 'manual' })}>
            <Text style={styles.link}>Already have an account? Log in</Text>
          </Pressable>
        </View>
      </AppScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: { flex: 1, justifyContent: 'flex-start' },
  topRow: { paddingTop: 60, paddingHorizontal: appTheme.spacing.md, alignItems: 'flex-end' },
  skipBtn: { backgroundColor: '#00000044', borderRadius: appTheme.radius.pill, paddingHorizontal: 14, paddingVertical: 7 },
  skipText: { color: '#FFFFFF', fontWeight: '600' },
  bottomSheet: { marginTop: -14, backgroundColor: appTheme.colors.surface, borderTopLeftRadius: 34, borderTopRightRadius: 34 },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 4, backgroundColor: '#E5E7EB', marginTop: 8 },
  content: { flex: 1, justifyContent: 'center', gap: appTheme.spacing.md },
  title: { fontSize: appTheme.typography.title, fontWeight: '800', color: appTheme.colors.textPrimary, textAlign: 'center' },
  subtitle: { fontSize: appTheme.typography.body, color: appTheme.colors.textSecondary, lineHeight: 22, textAlign: 'center' },
  link: { color: appTheme.colors.textSecondary, fontSize: appTheme.typography.small, textAlign: 'center', fontWeight: '500' },
});
