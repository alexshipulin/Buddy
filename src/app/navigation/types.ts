export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  GoalSelection: undefined;
  DietaryProfile: undefined;
  Home: undefined;
  ScanMenu: undefined;
  MenuResults: { resultId?: string; analysisId?: number; paywallAfterOpen?: boolean; trialDaysLeft?: number } | undefined;
  TrackMeal: { mealId?: string; readOnly?: boolean } | undefined;
  Chat: { resultId?: string; systemMessage?: string } | undefined;
  Paywall: { trialDaysLeft?: number; source?: 'first_result' | 'limit' | 'chat' } | undefined;
  SignInNudge: { source?: 'auto' | 'manual' } | undefined;
  Profile: { section?: 'baseParams' } | undefined;
  AIDebugLogs: undefined;
};
