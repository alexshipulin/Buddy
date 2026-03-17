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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getApiBaseUrl(): string {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (!baseUrl) {
    throw new AuthApiError(
      'config_error',
      'Missing EXPO_PUBLIC_API_BASE_URL env variable.'
    );
  }
  return baseUrl.replace(/\/+$/, '');
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

export async function exchangeOAuthToken(
  payload: OAuthExchangePayload
): Promise<AuthSession> {
  const url = `${getApiBaseUrl()}/v1/auth/oauth`;
  return postAndParse(url, payload);
}

export async function refresh(payload: RefreshPayload): Promise<AuthSession> {
  const url = `${getApiBaseUrl()}/v1/auth/refresh`;
  return postAndParse(url, payload);
}
