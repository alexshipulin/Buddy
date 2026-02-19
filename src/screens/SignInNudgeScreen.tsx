import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RootStackParamList } from '../app/navigation/types';
import { AppScreen } from '../components/AppScreen';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import { appTheme } from '../design/theme';
import { appPrefsRepo, userRepo } from '../services/container';

type Props = NativeStackScreenProps<RootStackParamList, 'SignInNudge'>;

export function SignInNudgeScreen({ navigation, route }: Props): React.JSX.Element {
  const onContinue = async (): Promise<void> => {
    await userRepo.markSignedIn();
    await appPrefsRepo.markSignInNudgeDismissed();
    navigation.goBack();
  };
  const onNotNow = async (): Promise<void> => {
    if (route.params?.source === 'auto') await appPrefsRepo.markSignInNudgeDismissed();
    navigation.goBack();
  };
  return (
    <AppScreen scroll>
      <View style={styles.wrap}>
        <Text style={styles.title}>Sign in to save your history</Text>
        <Card><Text style={styles.text}>Use Apple Sign In to keep your scans and meals safe on this device. You can skip for now.</Text></Card>
        <PrimaryButton title="Continue with Apple" onPress={() => void onContinue()} />
        <SecondaryButton title="Not now" onPress={() => void onNotNow()} />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: appTheme.spacing.md },
  title: { fontSize: appTheme.typography.h2, color: appTheme.colors.textPrimary, fontWeight: '700' },
  text: { color: appTheme.colors.textSecondary, fontSize: appTheme.typography.body },
});
