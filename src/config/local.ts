const useMockEnv = process.env.EXPO_PUBLIC_USE_MOCK_DATA;
export const USE_MOCK_DATA = useMockEnv === '1' || useMockEnv === 'true';
