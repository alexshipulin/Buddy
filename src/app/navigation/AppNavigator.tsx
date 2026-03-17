import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { appTheme } from '../../design/theme';
import { ChatScreen } from '../../screens/ChatScreen';
import { DietaryProfileScreen } from '../../screens/DietaryProfileScreen';
import { GoalSelectionScreen } from '../../screens/GoalSelectionScreen';
import { HomeScreen } from '../../screens/HomeScreen';
import { MenuResultsScreen } from '../../screens/MenuResultsScreen';
import { PaywallScreen } from '../../screens/PaywallScreen';
import { ProfileScreen } from '../../screens/ProfileScreen';
import { ScanMenuScreen } from '../../screens/ScanMenuScreen';
import { SignInNudgeScreen } from '../../screens/SignInNudgeScreen';
import { LoginScreen } from '../../screens/LoginScreen';
import { AIDebugLogsScreen } from '../../screens/AIDebugLogsScreen';
import { TrackMealScreen } from '../../screens/TrackMealScreen';
import { WelcomeScreen } from '../../screens/WelcomeScreen';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

type AppNavigatorProps = {
  initialRouteName?: keyof RootStackParamList;
};

export function AppNavigator({ initialRouteName = 'Welcome' }: AppNavigatorProps): React.JSX.Element {
  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: 'transparent' },
        headerShadowVisible: false,
        headerTintColor: appTheme.colors.textPrimary,
        contentStyle: { backgroundColor: appTheme.colors.background },
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="GoalSelection" component={GoalSelectionScreen} />
      <Stack.Screen name="DietaryProfile" component={DietaryProfileScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="ScanMenu" component={ScanMenuScreen} />
      <Stack.Screen name="MenuResults" component={MenuResultsScreen} />
      <Stack.Screen name="TrackMeal" component={TrackMealScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen
        name="Paywall"
        component={PaywallScreen}
        options={{ presentation: 'fullScreenModal' }}
      />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="AIDebugLogs" component={AIDebugLogsScreen} />
      <Stack.Screen name="SignInNudge" component={SignInNudgeScreen} options={{ presentation: 'modal' }} />
    </Stack.Navigator>
  );
}
