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
import { TrackMealScreen } from '../../screens/TrackMealScreen';
import { WelcomeScreen } from '../../screens/WelcomeScreen';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{
        headerStyle: { backgroundColor: appTheme.colors.background },
        headerShadowVisible: false,
        headerTintColor: appTheme.colors.textPrimary,
        contentStyle: { backgroundColor: appTheme.colors.background },
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="GoalSelection" component={GoalSelectionScreen} options={{ headerShown: false }} />
      <Stack.Screen name="DietaryProfile" component={DietaryProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ScanMenu" component={ScanMenuScreen} options={{ title: 'Scan menu', headerShown: false }} />
      <Stack.Screen name="MenuResults" component={MenuResultsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="TrackMeal" component={TrackMealScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'Chat with Buddy' }} />
      <Stack.Screen name="Paywall" component={PaywallScreen} options={{ title: 'Premium', presentation: 'modal' }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="SignInNudge" component={SignInNudgeScreen} options={{ title: 'Sign in', presentation: 'modal' }} />
    </Stack.Navigator>
  );
}
