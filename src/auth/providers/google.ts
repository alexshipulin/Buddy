import { Platform } from 'react-native';

type AuthSessionResult = {
  type: string;
  params?: Record<string, string>;
};

type AuthRequestInstance = {
  codeVerifier?: string;
  promptAsync: (
    discovery: AuthDiscoveryDocument,
    options?: Record<string, unknown>
  ) => Promise<AuthSessionResult>;
};

type AuthDiscoveryDocument = {
  authorizationEndpoint: string;
  tokenEndpoint: string;
};

type AuthSessionModule = {
  makeRedirectUri: (options: {
    scheme: string;
    path?: string;
  }) => string;
  ResponseType: {
    Code: string;
  };
  AuthRequest: new (config: Record<string, unknown>) => AuthRequestInstance;
  exchangeCodeAsync: (
    config: {
      clientId: string;
      code: string;
      redirectUri: string;
      extraParams?: Record<string, string>;
    },
    discovery: AuthDiscoveryDocument
  ) => Promise<Record<string, unknown>>;
};

type GoogleProviderModule = {
  discovery?: AuthDiscoveryDocument;
};

export type GoogleSignInSuccess = {
  idToken: string;
};

export type GoogleSignInErrorCode =
  | 'config_error'
  | 'request_failed'
  | 'user_cancelled'
  | 'missing_code'
  | 'missing_id_token';

export class GoogleSignInError extends Error {
  readonly code: GoogleSignInErrorCode;

  constructor(code: GoogleSignInErrorCode, message: string) {
    super(message);
    this.name = 'GoogleSignInError';
    this.code = code;
  }
}

const FALLBACK_GOOGLE_DISCOVERY: AuthDiscoveryDocument = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

function getAuthSessionModule(): AuthSessionModule | null {
  try {
    const moduleName = 'expo-auth-session';
    return require(moduleName) as AuthSessionModule;
  } catch {
    return null;
  }
}

function getGoogleProviderModule(): GoogleProviderModule | null {
  try {
    const moduleName = 'expo-auth-session/providers/google';
    return require(moduleName) as GoogleProviderModule;
  } catch {
    return null;
  }
}

function getGoogleClientIds(): {
  iosClientId: string;
  androidClientId: string;
  webClientId?: string;
} {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() ?? '';
  const androidClientId =
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim() ?? '';
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();

  if (!iosClientId || !androidClientId) {
    throw new GoogleSignInError(
      'config_error',
      'Missing Google OAuth client IDs. Set EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID and EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID.'
    );
  }

  return { iosClientId, androidClientId, webClientId };
}

function getClientIdForPlatform(clientIds: {
  iosClientId: string;
  androidClientId: string;
  webClientId?: string;
}): string {
  if (Platform.OS === 'ios') return clientIds.iosClientId;
  if (Platform.OS === 'android') return clientIds.androidClientId;
  return clientIds.webClientId ?? clientIds.iosClientId;
}

export async function signInWithGoogle(): Promise<GoogleSignInSuccess> {
  const authSession = getAuthSessionModule();
  if (!authSession) {
    throw new GoogleSignInError(
      'config_error',
      'Google Sign In module is unavailable. Please reinstall app dependencies.'
    );
  }

  const googleProvider = getGoogleProviderModule();
  const discovery =
    googleProvider?.discovery ?? FALLBACK_GOOGLE_DISCOVERY;
  const clientIds = getGoogleClientIds();
  const clientId = getClientIdForPlatform(clientIds);
  const redirectUri = authSession.makeRedirectUri({
    scheme: 'buddy',
    path: 'oauthredirect',
  });

  const request = new authSession.AuthRequest({
    clientId,
    redirectUri,
    scopes: ['openid', 'email'],
    responseType: authSession.ResponseType.Code,
    usePKCE: true,
    extraParams: { prompt: 'select_account' },
  });

  const authResult = await request.promptAsync(discovery);
  if (authResult.type === 'cancel' || authResult.type === 'dismiss') {
    throw new GoogleSignInError(
      'user_cancelled',
      'Google Sign In was cancelled by the user.'
    );
  }
  if (authResult.type !== 'success') {
    throw new GoogleSignInError(
      'request_failed',
      'Google Sign In failed. Please try again.'
    );
  }

  const code = authResult.params?.code;
  if (!code) {
    throw new GoogleSignInError(
      'missing_code',
      'Google authorization code is missing.'
    );
  }

  const tokenResponse = await authSession.exchangeCodeAsync(
    {
      clientId,
      code,
      redirectUri,
      extraParams: request.codeVerifier
        ? { code_verifier: request.codeVerifier }
        : undefined,
    },
    discovery
  );

  const idToken =
    (typeof tokenResponse.idToken === 'string' ? tokenResponse.idToken : null) ??
    (typeof tokenResponse.id_token === 'string'
      ? tokenResponse.id_token
      : null);

  if (!idToken) {
    throw new GoogleSignInError(
      'missing_id_token',
      'Google did not return id_token.'
    );
  }

  return { idToken };
}
