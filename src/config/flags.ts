const testModeEnv = process.env.EXPO_PUBLIC_TEST_MODE;
export const TEST_MODE = testModeEnv === '1' || testModeEnv === 'true';
