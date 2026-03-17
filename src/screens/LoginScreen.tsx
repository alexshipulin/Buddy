import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { RootStackParamList } from '../app/navigation/types';
import {
  AuthProvider,
  getUserFacingAuthErrorMessage,
  isAuthCancelledError,
  signInWithProvider,
} from '../auth';
import { ScreenHeader } from '../components/ScreenHeader';
import { appTheme } from '../design/theme';
import { useAppAlert } from '../ui/components/AppAlertProvider';
import { Card } from '../ui/components/Card';
import { PrimaryButton } from '../ui/components/PrimaryButton';
import { Screen } from '../ui/components/Screen';
import { typography } from '../ui/typography';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

type AppleAuthenticationModule = {
  isAvailableAsync: () => Promise<boolean>;
  AppleAuthenticationButton: React.ComponentType<Record<string, unknown>>;
  AppleAuthenticationButtonType: {
    CONTINUE: string | number;
  };
  AppleAuthenticationButtonStyle: {
    BLACK: string | number;
  };
};

function getAppleAuthenticationModule(): AppleAuthenticationModule | null {
  try {
    const moduleName = 'expo-apple-authentication';
    return require(moduleName) as AppleAuthenticationModule;
  } catch {
    return null;
  }
}

export function LoginScreen({ navigation }: Props): React.JSX.Element {
  const { showAlert } = useAppAlert();
  const appleAuth = React.useMemo(() => getAppleAuthenticationModule(), []);

  const [isAppleAvailable, setIsAppleAvailable] = React.useState(false);
  const [isCheckingAvailability, setIsCheckingAvailability] = React.useState(true);
  const [activeProvider, setActiveProvider] = React.useState<AuthProvider | null>(
    null
  );

  React.useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        if (!appleAuth) {
          if (mounted) setIsAppleAvailable(false);
          return;
        }
        const available = await appleAuth.isAvailableAsync();
        if (mounted) setIsAppleAvailable(available);
      } finally {
        if (mounted) setIsCheckingAvailability(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [appleAuth]);

  const handleSignIn = React.useCallback(
    async (provider: AuthProvider): Promise<void> => {
      if (activeProvider) return;
      setActiveProvider(provider);
      try {
        await signInWithProvider(provider);
        navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
      } catch (error) {
        if (!isAuthCancelledError(error)) {
          await showAlert({
            title: 'Sign in failed',
            message: getUserFacingAuthErrorMessage(error),
            actions: [{ text: 'OK', style: 'default' }],
          });
        }
      } finally {
        setActiveProvider(null);
      }
    },
    [activeProvider, navigation, showAlert]
  );

  const isLoading = activeProvider !== null;
  const AppleSignInButton = appleAuth?.AppleAuthenticationButton;

  return (
    <Screen safeTop={false}>
      <ScreenHeader
        title="Login"
        onBack={() => navigation.goBack()}
        style={styles.header}
      />
      <View style={styles.content}>
        <Card style={styles.card}>
          <Text style={styles.title} maxFontSizeMultiplier={1.2}>
            Continue
          </Text>
          <Text style={styles.subtitle} maxFontSizeMultiplier={1.2}>
            Sign in to securely sync your Buddy profile.
          </Text>

          {isCheckingAvailability ? (
            <ActivityIndicator color={appTheme.colors.accent} />
          ) : isAppleAvailable && AppleSignInButton && appleAuth ? (
            <AppleSignInButton
              buttonType={appleAuth.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={appleAuth.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={14}
              style={styles.appleButton}
              onPress={() => void handleSignIn('apple')}
              disabled={isLoading}
            />
          ) : (
            <View style={styles.unavailableBox}>
              <Text style={styles.unavailableText} maxFontSizeMultiplier={1.2}>
                Apple Sign In is unavailable on this device.
              </Text>
            </View>
          )}

          <PrimaryButton
            title="Continue with Google"
            onPress={() => void handleSignIn('google')}
            disabled={isLoading}
            loading={activeProvider === 'google'}
            style={styles.googleButton}
          />

          {activeProvider === 'apple' ? (
            <ActivityIndicator color={appTheme.colors.accent} />
          ) : null}
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 16 },
  content: { flex: 1, justifyContent: 'center' },
  card: {
    gap: 12,
    paddingVertical: 20,
  },
  title: {
    ...typography.h2,
    color: appTheme.colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: appTheme.colors.muted,
    marginBottom: 6,
  },
  appleButton: {
    width: '100%',
    height: 50,
  },
  googleButton: {
    marginTop: 2,
  },
  unavailableBox: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 14,
    borderColor: appTheme.colors.border,
    backgroundColor: appTheme.colors.infoSoft,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  unavailableText: {
    ...typography.body,
    color: appTheme.colors.muted,
    textAlign: 'center',
  },
});
