import { AuthSession } from '../api/authApi';

const SESSION_KEY = 'buddy_auth_session_v1';
const SECURE_STORE_OPTIONS = {
  keychainService: 'buddy.auth',
};

type SecureStoreModule = {
  isAvailableAsync: () => Promise<boolean>;
  setItemAsync: (
    key: string,
    value: string,
    options?: Record<string, unknown>
  ) => Promise<void>;
  getItemAsync: (
    key: string,
    options?: Record<string, unknown>
  ) => Promise<string | null>;
  deleteItemAsync: (
    key: string,
    options?: Record<string, unknown>
  ) => Promise<void>;
};

export class SessionStoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionStoreError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isAuthSession(value: unknown): value is AuthSession {
  if (!isRecord(value)) return false;
  return (
    typeof value.accessToken === 'string' &&
    value.accessToken.length > 0 &&
    typeof value.refreshToken === 'string' &&
    value.refreshToken.length > 0
  );
}

function getSecureStoreModule(): SecureStoreModule | null {
  try {
    const moduleName = 'expo-secure-store';
    return require(moduleName) as SecureStoreModule;
  } catch {
    return null;
  }
}

async function ensureSecureStoreAvailable(): Promise<SecureStoreModule> {
  const secureStore = getSecureStoreModule();
  if (!secureStore) {
    throw new SessionStoreError(
      'Secure storage module is unavailable. Please reinstall app dependencies.'
    );
  }

  const available = await secureStore.isAvailableAsync();
  if (!available) {
    throw new SessionStoreError(
      'Secure storage is not available on this device.'
    );
  }

  return secureStore;
}

export async function saveSession(session: AuthSession): Promise<void> {
  const secureStore = await ensureSecureStoreAvailable();
  await secureStore.setItemAsync(
    SESSION_KEY,
    JSON.stringify(session),
    SECURE_STORE_OPTIONS
  );
}

export async function getSession(): Promise<AuthSession | null> {
  const secureStore = await ensureSecureStoreAvailable();
  const raw = await secureStore.getItemAsync(SESSION_KEY, SECURE_STORE_OPTIONS);
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isAuthSession(parsed)) {
      await clearSession();
      return null;
    }
    return parsed;
  } catch {
    await clearSession();
    return null;
  }
}

export async function clearSession(): Promise<void> {
  const secureStore = await ensureSecureStoreAvailable();
  await secureStore.deleteItemAsync(SESSION_KEY, SECURE_STORE_OPTIONS);
}
