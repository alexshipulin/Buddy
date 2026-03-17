import { appPrefsRepo, userRepo } from '../services/container';
import { AuthApiError, AuthSession, exchangeOAuthToken, refresh } from './api/authApi';
import { AppleSignInError, signInWithApple } from './providers/apple';
import { GoogleSignInError, signInWithGoogle } from './providers/google';
import {
  SessionStoreError,
  clearSession,
  getSession as getStoredSession,
  saveSession,
} from './session/sessionStore';

export type AuthProvider = 'apple' | 'google';

export type AuthErrorCode =
  | 'user_cancelled'
  | 'provider_unavailable'
  | 'config_error'
  | 'network_error'
  | 'backend_error'
  | 'invalid_response'
  | 'session_store_error'
  | 'unknown';

export class AuthError extends Error {
  readonly code: AuthErrorCode;
  readonly cause?: unknown;

  constructor(code: AuthErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.cause = cause;
  }
}

function toAuthError(error: unknown): AuthError {
  if (error instanceof AuthError) return error;

  if (error instanceof AppleSignInError) {
    if (error.code === 'user_cancelled') {
      return new AuthError('user_cancelled', error.message, error);
    }
    if (error.code === 'not_available') {
      return new AuthError('provider_unavailable', error.message, error);
    }
    return new AuthError('invalid_response', error.message, error);
  }

  if (error instanceof GoogleSignInError) {
    if (error.code === 'user_cancelled') {
      return new AuthError('user_cancelled', error.message, error);
    }
    if (error.code === 'config_error') {
      return new AuthError('config_error', error.message, error);
    }
    if (error.code === 'request_failed') {
      return new AuthError('provider_unavailable', error.message, error);
    }
    return new AuthError('invalid_response', error.message, error);
  }

  if (error instanceof AuthApiError) {
    if (error.code === 'network_error') {
      return new AuthError('network_error', error.message, error);
    }
    if (error.code === 'backend_error') {
      return new AuthError('backend_error', error.message, error);
    }
    if (error.code === 'config_error') {
      return new AuthError('config_error', error.message, error);
    }
    return new AuthError('invalid_response', error.message, error);
  }

  if (error instanceof SessionStoreError) {
    return new AuthError('session_store_error', error.message, error);
  }

  const message =
    error instanceof Error ? error.message : 'Unexpected auth error.';
  return new AuthError('unknown', message, error);
}

export function isAuthCancelledError(error: unknown): boolean {
  return error instanceof AuthError && error.code === 'user_cancelled';
}

export function getUserFacingAuthErrorMessage(error: unknown): string {
  const authError = toAuthError(error);
  switch (authError.code) {
    case 'provider_unavailable':
      return 'Sign in is unavailable on this device.';
    case 'config_error':
      return 'Sign in is not configured yet. Please try again later.';
    case 'network_error':
      return 'No internet connection. Please try again.';
    case 'backend_error':
      return 'Could not complete sign in. Please try again.';
    case 'session_store_error':
      return 'Could not securely save your session. Please try again.';
    case 'invalid_response':
      return 'Sign in response was invalid. Please try again.';
    case 'unknown':
      return 'Unexpected sign-in error. Please try again.';
    case 'user_cancelled':
      return 'Sign in was cancelled.';
    default:
      return 'Sign in failed. Please try again.';
  }
}

async function persistAndMarkSignedIn(session: AuthSession): Promise<void> {
  await saveSession(session);
  const displayName =
    typeof session.user?.name === 'string' && session.user.name.trim()
      ? session.user.name.trim()
      : undefined;
  const identifier =
    typeof session.user?.id === 'string' && session.user.id
      ? session.user.id
      : undefined;
  await userRepo.markSignedIn(displayName, identifier);
  await appPrefsRepo.markSignInNudgeDismissed();
}

export async function signInWithProvider(
  provider: AuthProvider
): Promise<AuthSession> {
  try {
    const session =
      provider === 'apple'
        ? await (async () => {
            const { identityToken, nonce, fullName } = await signInWithApple();
            return exchangeOAuthToken({
              provider: 'apple',
              idToken: identityToken,
              nonce,
              fullName,
            });
          })()
        : await (async () => {
            const { idToken } = await signInWithGoogle();
            return exchangeOAuthToken({
              provider: 'google',
              idToken,
            });
          })();

    await persistAndMarkSignedIn(session);
    return session;
  } catch (error) {
    throw toAuthError(error);
  }
}

export async function getSession(): Promise<AuthSession | null> {
  try {
    return await getStoredSession();
  } catch (error) {
    throw toAuthError(error);
  }
}

export async function refreshSession(): Promise<AuthSession | null> {
  try {
    const session = await getStoredSession();
    if (!session?.refreshToken) return null;

    const next = await refresh({ refreshToken: session.refreshToken });
    await saveSession(next);
    return next;
  } catch (error) {
    throw toAuthError(error);
  }
}

export async function signOut(): Promise<void> {
  try {
    await clearSession();
    await userRepo.saveAuthState({ signedIn: false });
  } catch (error) {
    throw toAuthError(error);
  }
}
