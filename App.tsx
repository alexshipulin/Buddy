import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { createNavigationContainerRef, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/app/navigation/AppNavigator';
import { RootStackParamList } from './src/app/navigation/types';
import { appTheme } from './src/design/theme';
import { appPrefsRepo, userRepo } from './src/services/container';

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
  const [isNavReady, setIsNavReady] = React.useState(false);

  React.useEffect(() => {
    const runLaunchChecks = async (): Promise<void> => {
      if (!isNavReady || !navRef.isReady()) return;
      const launchCount = await appPrefsRepo.incrementLaunchCount();
      const auth = await userRepo.getAuthState();
      const prefs = await appPrefsRepo.getPrefs();
      if (launchCount === 2 && !auth.signedIn && !prefs.signInNudgeDismissed) {
        navRef.navigate('SignInNudge', { source: 'auto' });
      }
    };
    void runLaunchChecks();
  }, [isNavReady]);

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navRef} theme={navTheme} onReady={() => setIsNavReady(true)}>
        <StatusBar style="dark" />
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
