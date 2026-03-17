import { AppleSignInName } from '../providers/apple';

export type OAuthProvider = 'apple' | 'google';

export type OAuthExchangePayload = {
  provider: OAuthProvider;
  idToken: string;
  nonce?: string;
  fullName?: AppleSignInName;
};

export type RefreshPayload = {
  refreshToken: string;
};

export type AuthUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  [key: string]: unknown;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user?: AuthUser;
};

export type AuthApiErrorCode =
  | 'config_error'
  | 'network_error'
  | 'backend_error'
  | 'invalid_response';

export class AuthApiError extends Error {
  readonly code: AuthApiErrorCode;
  readonly status?: number;

  constructor(code: AuthApiErrorCode, message: string, status?: number) {
    super(message);
    this.name = 'AuthApiError';
    this.code = code;
    this.status = status;
  }
}

type FirebaseAuthMode = 'backend' | 'firebase' | 'unconfigured';

type FirebaseConfig = {
  apiKey: string;
  appId: string;
  projectId: string;
  authDomain?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  measurementId?: string;
};

type FirebaseUserLike = {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  refreshToken?: string | null;
  stsTokenManager?: { refreshToken?: string | null } | null;
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
};

type FirebaseAuthLike = {
  currentUser?: FirebaseUserLike | null;
};

type FirebaseAuthModuleLike = {
  getAuth: (app?: unknown) => FirebaseAuthLike;
  initializeAuth?: (app: unknown, options: Record<string, unknown>) => FirebaseAuthLike;
  OAuthProvider: new (providerId: string) => {
    credential: (params: { idToken: string; rawNonce?: string }) => unknown;
  };
  GoogleAuthProvider?: {
    credential: (idToken: string, accessToken?: string | null) => unknown;
  };
  signInWithCredential: (
    auth: FirebaseAuthLike,
    credential: unknown
  ) => Promise<{ user: FirebaseUserLike }>;
  updateProfile?: (
    user: FirebaseUserLike,
    profile: { displayName?: string | null }
  ) => Promise<void>;
  signOut: (auth: FirebaseAuthLike) => Promise<void>;
};

let firebaseAuthCache:
  | {
      auth: FirebaseAuthLike;
      authModule: FirebaseAuthModuleLike;
      config: FirebaseConfig;
    }
  | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getApiBaseUrl(): string | null {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (!baseUrl) return null;
  return baseUrl.replace(/\/+$/, '');
}

function getFirebaseConfig(): FirebaseConfig | null {
  const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY?.trim();
  const appId = process.env.EXPO_PUBLIC_FIREBASE_APP_ID?.trim();
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID?.trim();

  if (!apiKey || !appId || !projectId) return null;

  const config: FirebaseConfig = {
    apiKey,
    appId,
    projectId,
  };

  const authDomain = process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim();
  const storageBucket = process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim();
  const messagingSenderId = process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim();
  const measurementId = process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID?.trim();

  if (authDomain) config.authDomain = authDomain;
  if (storageBucket) config.storageBucket = storageBucket;
  if (messagingSenderId) config.messagingSenderId = messagingSenderId;
  if (measurementId) config.measurementId = measurementId;

  return config;
}

function resolveAuthMode(): FirebaseAuthMode {
  if (getApiBaseUrl()) return 'backend';
  if (getFirebaseConfig()) return 'firebase';
  return 'unconfigured';
}

function parseJsonSafely(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function extractBackendMessage(payload: unknown): string | null {
  if (!isRecord(payload)) return null;
  if (typeof payload.message === 'string' && payload.message.trim()) {
    return payload.message;
  }
  if (typeof payload.error === 'string' && payload.error.trim()) {
    return payload.error;
  }
  const nestedError = payload.error;
  if (isRecord(nestedError) && typeof nestedError.message === 'string') {
    return nestedError.message;
  }
  return null;
}

function parseAuthSession(payload: unknown): AuthSession {
  const source =
    isRecord(payload) && isRecord(payload.session) ? payload.session : payload;
  if (!isRecord(source)) {
    throw new AuthApiError(
      'invalid_response',
      'Auth API returned an invalid response body.'
    );
  }

  const accessToken = source.accessToken;
  const refreshToken = source.refreshToken;
  const user = source.user;

  if (typeof accessToken !== 'string' || !accessToken) {
    throw new AuthApiError(
      'invalid_response',
      'Auth API response is missing accessToken.'
    );
  }
  if (typeof refreshToken !== 'string' || !refreshToken) {
    throw new AuthApiError(
      'invalid_response',
      'Auth API response is missing refreshToken.'
    );
  }

  const session: AuthSession = {
    accessToken,
    refreshToken,
  };

  if (isRecord(user) && typeof user.id === 'string' && user.id) {
    session.user = user as AuthUser;
  }

  return session;
}

async function postAndParse(url: string, body: unknown): Promise<AuthSession> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AuthApiError('network_error', 'Network error while contacting auth server.');
  }

  const raw = await response.text();
  const parsed = raw ? parseJsonSafely(raw) : null;

  if (!response.ok) {
    const message =
      extractBackendMessage(parsed) ??
      `Authentication failed with status ${response.status}.`;
    throw new AuthApiError('backend_error', message, response.status);
  }

  return parseAuthSession(parsed);
}

function getFirebaseAuthContext(): {
  auth: FirebaseAuthLike;
  authModule: FirebaseAuthModuleLike;
  config: FirebaseConfig;
} {
  if (firebaseAuthCache) return firebaseAuthCache;

  const config = getFirebaseConfig();
  if (!config) {
    throw new AuthApiError(
      'config_error',
      'Missing Firebase Auth config. Set EXPO_PUBLIC_FIREBASE_API_KEY, EXPO_PUBLIC_FIREBASE_APP_ID, and EXPO_PUBLIC_FIREBASE_PROJECT_ID.'
    );
  }

  let appModule: {
    getApps: () => unknown[];
    getApp: () => unknown;
    initializeApp: (options: FirebaseConfig) => unknown;
  };
  let authModule: FirebaseAuthModuleLike;
  try {
    appModule = require('firebase/app') as {
      getApps: () => unknown[];
      getApp: () => unknown;
      initializeApp: (options: FirebaseConfig) => unknown;
    };
    authModule = require('firebase/auth') as FirebaseAuthModuleLike;
  } catch {
    throw new AuthApiError(
      'config_error',
      'Firebase SDK is unavailable. Install the `firebase` package and rebuild.'
    );
  }

  const app = appModule.getApps().length > 0 ? appModule.getApp() : appModule.initializeApp(config);

  let auth: FirebaseAuthLike | null = null;
  if (typeof authModule.initializeAuth === 'function') {
    try {
      const reactNativeAuth = require('firebase/auth/react-native') as {
        getReactNativePersistence: (storage: unknown) => unknown;
      };
      const asyncStorageModule = require('@react-native-async-storage/async-storage') as {
        default: unknown;
      };
      auth = authModule.initializeAuth(app, {
        persistence: reactNativeAuth.getReactNativePersistence(asyncStorageModule.default),
      });
    } catch {
      auth = null;
    }
  }

  if (!auth) {
    auth = authModule.getAuth(app);
  }

  firebaseAuthCache = { auth, authModule, config };
  return firebaseAuthCache;
}

async function mapFirebaseUserToSession(user: FirebaseUserLike): Promise<AuthSession> {
  const accessToken = await user.getIdToken();
  const refreshToken = user.refreshToken || user.stsTokenManager?.refreshToken || '';

  if (!accessToken || !refreshToken) {
    throw new AuthApiError(
      'invalid_response',
      'Firebase Auth response is missing token data.'
    );
  }

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.uid,
      email: user.email ?? null,
      name: user.displayName ?? null,
    },
  };
}

async function maybeApplyAppleDisplayName(
  authModule: FirebaseAuthModuleLike,
  user: FirebaseUserLike,
  fullName?: AppleSignInName
): Promise<void> {
  if (!fullName || user.displayName || typeof authModule.updateProfile !== 'function') {
    return;
  }

  const pretty = [fullName.givenName, fullName.familyName]
    .map((part) => (part ?? '').trim())
    .filter(Boolean)
    .join(' ')
    .trim();

  if (!pretty) return;

  try {
    await authModule.updateProfile(user, { displayName: pretty });
  } catch {
    // Non-fatal: profile name patch should not block login.
  }
}

function buildFirebaseCredential(
  authModule: FirebaseAuthModuleLike,
  payload: OAuthExchangePayload
): unknown {
  if (payload.provider === 'apple') {
    const provider = new authModule.OAuthProvider('apple.com');
    return provider.credential({
      idToken: payload.idToken,
      rawNonce: payload.nonce,
    });
  }

  if (authModule.GoogleAuthProvider?.credential) {
    return authModule.GoogleAuthProvider.credential(payload.idToken, null);
  }

  const provider = new authModule.OAuthProvider('google.com');
  return provider.credential({ idToken: payload.idToken });
}

async function exchangeWithFirebase(
  payload: OAuthExchangePayload
): Promise<AuthSession> {
  const { auth, authModule } = getFirebaseAuthContext();
  const credential = buildFirebaseCredential(authModule, payload);
  const result = await authModule.signInWithCredential(auth, credential);
  await maybeApplyAppleDisplayName(authModule, result.user, payload.fullName);
  return mapFirebaseUserToSession(result.user);
}

async function refreshWithFirebase(payload: RefreshPayload): Promise<AuthSession> {
  const { auth, config } = getFirebaseAuthContext();

  const currentUser = auth.currentUser;
  if (currentUser) {
    return mapFirebaseUserToSession(currentUser);
  }

  let response: Response;
  try {
    response = await fetch(
      `https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(config.apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: payload.refreshToken,
        }).toString(),
      }
    );
  } catch {
    throw new AuthApiError(
      'network_error',
      'Network error while refreshing Firebase session.'
    );
  }

  const raw = await response.text();
  const parsed = raw ? parseJsonSafely(raw) : null;

  if (!response.ok || !isRecord(parsed)) {
    const message =
      extractBackendMessage(parsed) ??
      `Firebase session refresh failed with status ${response.status}.`;
    throw new AuthApiError('backend_error', message, response.status);
  }

  const accessToken = parsed.id_token;
  const refreshToken = parsed.refresh_token;
  const userId = parsed.user_id;

  if (
    typeof accessToken !== 'string' ||
    !accessToken ||
    typeof refreshToken !== 'string' ||
    !refreshToken
  ) {
    throw new AuthApiError(
      'invalid_response',
      'Firebase token refresh returned invalid payload.'
    );
  }

  const session: AuthSession = {
    accessToken,
    refreshToken,
  };

  if (typeof userId === 'string' && userId) {
    session.user = { id: userId };
  }

  return session;
}

export async function exchangeOAuthToken(
  payload: OAuthExchangePayload
): Promise<AuthSession> {
  const mode = resolveAuthMode();

  if (mode === 'backend') {
    const baseUrl = getApiBaseUrl();
    if (!baseUrl) {
      throw new AuthApiError(
        'config_error',
        'Missing EXPO_PUBLIC_API_BASE_URL env variable.'
      );
    }
    return postAndParse(`${baseUrl}/v1/auth/oauth`, payload);
  }

  if (mode === 'firebase') {
    return exchangeWithFirebase(payload);
  }

  throw new AuthApiError(
    'config_error',
    'Auth is not configured. Set EXPO_PUBLIC_API_BASE_URL or Firebase Auth env vars.'
  );
}

export async function refresh(payload: RefreshPayload): Promise<AuthSession> {
  const mode = resolveAuthMode();

  if (mode === 'backend') {
    const baseUrl = getApiBaseUrl();
    if (!baseUrl) {
      throw new AuthApiError(
        'config_error',
        'Missing EXPO_PUBLIC_API_BASE_URL env variable.'
      );
    }
    return postAndParse(`${baseUrl}/v1/auth/refresh`, payload);
  }

  if (mode === 'firebase') {
    return refreshWithFirebase(payload);
  }

  throw new AuthApiError(
    'config_error',
    'Auth is not configured. Set EXPO_PUBLIC_API_BASE_URL or Firebase Auth env vars.'
  );
}

export async function signOutProviderSession(): Promise<void> {
  if (resolveAuthMode() !== 'firebase') return;

  try {
    const { auth, authModule } = getFirebaseAuthContext();
    await authModule.signOut(auth);
  } catch {
    // Local logout should still proceed if provider logout fails.
  }
}
