import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { createNavigationContainerRef, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/app/navigation/AppNavigator';
import { RootStackParamList } from './src/app/navigation/types';
import { removeLegacyMockDataIfNeeded } from './src/data/seed/removeLegacyMockData';
import { appTheme } from './src/design/theme';
import { appPrefsRepo, userRepo } from './src/services/container';
import { AppAlertProvider } from './src/ui/components/AppAlertProvider';

function maybeCompleteAuthSessionSafely(): void {
  try {
    const moduleName = 'expo-web-browser';
    const webBrowser = require(moduleName) as {
      maybeCompleteAuthSession?: () => void;
    };
    webBrowser.maybeCompleteAuthSession?.();
  } catch {
    // Optional dependency missing; app can still run without OAuth redirect helper.
  }
}

maybeCompleteAuthSessionSafely();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: appTheme.colors.background,
    card: appTheme.colors.surface,
    text: appTheme.colors.textPrimary,
    border: appTheme.colors.border,
    primary: appTheme.colors.accent,
  },
};
const navRef = createNavigationContainerRef<RootStackParamList>();

export default function App(): React.JSX.Element {
  const [isBootstrapped, setIsBootstrapped] = React.useState(false);
  const [isNavReady, setIsNavReady] = React.useState(false);

  React.useEffect(() => {
    const bootstrap = async (): Promise<void> => {
      try {
        await removeLegacyMockDataIfNeeded();
      } catch (error) {
        console.warn('Mock data cleanup failed, continuing startup.', error);
      } finally {
        setIsBootstrapped(true);
      }
    };
    void bootstrap();
  }, []);

  React.useEffect(() => {
    const runLaunchChecks = async (): Promise<void> => {
      if (!isBootstrapped || !isNavReady || !navRef.isReady()) return;
      const launchCount = await appPrefsRepo.incrementLaunchCount();
      const auth = await userRepo.getAuthState();
      const prefs = await appPrefsRepo.getPrefs();
      if (launchCount === 2 && !auth.signedIn && !prefs.signInNudgeDismissed) {
        navRef.navigate('SignInNudge', { source: 'auto' });
      }
    };
    void runLaunchChecks();
  }, [isBootstrapped, isNavReady]);

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navRef} theme={navTheme} onReady={() => setIsNavReady(true)}>
        <AppAlertProvider>
          <StatusBar style="dark" />
          {isBootstrapped ? <AppNavigator /> : null}
        </AppAlertProvider>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
