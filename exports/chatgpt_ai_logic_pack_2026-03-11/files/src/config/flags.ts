const testModeEnv = process.env.EXPO_PUBLIC_TEST_MODE;
export const TEST_MODE = testModeEnv === '1' || testModeEnv === 'true';

const betaChatOpenEnv = process.env.EXPO_PUBLIC_BUDDY_CHAT_BETA_OPEN?.trim().toLowerCase();
export const BETA_CHAT_OPEN =
  betaChatOpenEnv === undefined ? true : betaChatOpenEnv === '1' || betaChatOpenEnv === 'true';

const appleOnlyAuthEnv = process.env.EXPO_PUBLIC_AUTH_APPLE_ONLY?.trim().toLowerCase();
export const APPLE_ONLY_AUTH =
  appleOnlyAuthEnv === undefined ? true : appleOnlyAuthEnv === '1' || appleOnlyAuthEnv === 'true';
