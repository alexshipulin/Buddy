type AppleAuthenticationCredential = {
  identityToken?: string | null;
  fullName?: {
    givenName?: string | null;
    familyName?: string | null;
  } | null;
};

type AppleAuthenticationModule = {
  isAvailableAsync: () => Promise<boolean>;
  signInAsync: (options: {
    requestedScopes: Array<string | number>;
    nonce: string;
  }) => Promise<AppleAuthenticationCredential>;
  AppleAuthenticationScope: {
    FULL_NAME: string | number;
    EMAIL: string | number;
  };
};

type ExpoCryptoModule = {
  getRandomBytesAsync: (byteCount: number) => Promise<Uint8Array>;
};

export type AppleSignInName = {
  givenName?: string;
  familyName?: string;
};

export type AppleSignInSuccess = {
  identityToken: string;
  nonce: string;
  fullName?: AppleSignInName;
};

export type AppleSignInErrorCode =
  | 'not_available'
  | 'user_cancelled'
  | 'missing_identity_token'
  | 'request_failed';

export class AppleSignInError extends Error {
  readonly code: AppleSignInErrorCode;

  constructor(code: AppleSignInErrorCode, message: string) {
    super(message);
    this.name = 'AppleSignInError';
    this.code = code;
  }
}

const BASE64_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function getAppleAuthenticationModule(): AppleAuthenticationModule | null {
  try {
    const moduleName = 'expo-apple-authentication';
    return require(moduleName) as AppleAuthenticationModule;
  } catch {
    return null;
  }
}

function getExpoCryptoModule(): ExpoCryptoModule | null {
  try {
    const moduleName = 'expo-crypto';
    return require(moduleName) as ExpoCryptoModule;
  } catch {
    return null;
  }
}

function toBase64Url(bytes: Uint8Array): string {
  let base64 = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0;
    const b = bytes[i + 1] ?? 0;
    const c = bytes[i + 2] ?? 0;
    const triplet = (a << 16) | (b << 8) | c;
    base64 += BASE64_ALPHABET[(triplet >> 18) & 0x3f];
    base64 += BASE64_ALPHABET[(triplet >> 12) & 0x3f];
    base64 += i + 1 < bytes.length ? BASE64_ALPHABET[(triplet >> 6) & 0x3f] : '=';
    base64 += i + 2 < bytes.length ? BASE64_ALPHABET[triplet & 0x3f] : '=';
  }
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function createNonce(): Promise<string> {
  const crypto = getExpoCryptoModule();
  if (!crypto) {
    throw new AppleSignInError(
      'not_available',
      'Crypto module is unavailable. Please reinstall app dependencies.'
    );
  }
  const bytes = await crypto.getRandomBytesAsync(32);
  return toBase64Url(bytes);
}

export async function signInWithApple(): Promise<AppleSignInSuccess> {
  const appleAuth = getAppleAuthenticationModule();
  if (!appleAuth) {
    throw new AppleSignInError(
      'not_available',
      'Apple Sign In module is unavailable. Please reinstall app dependencies.'
    );
  }

  const isAvailable = await appleAuth.isAvailableAsync();
  if (!isAvailable) {
    throw new AppleSignInError(
      'not_available',
      'Apple Sign In is not available on this device.'
    );
  }

  const nonce = await createNonce();
  let credential: AppleAuthenticationCredential;
  try {
    credential = await appleAuth.signInAsync({
      requestedScopes: [
        appleAuth.AppleAuthenticationScope.EMAIL,
      ],
      nonce,
    });
  } catch (error) {
    const code =
      typeof error === 'object' && error && 'code' in error
        ? String((error as { code?: string }).code ?? '')
        : '';
    if (code === 'ERR_REQUEST_CANCELED') {
      throw new AppleSignInError(
        'user_cancelled',
        'Apple Sign In was cancelled by the user.'
      );
    }
    throw new AppleSignInError(
      'request_failed',
      'Apple Sign In request failed. Please try again.'
    );
  }

  if (!credential.identityToken) {
    throw new AppleSignInError(
      'missing_identity_token',
      'Apple did not return an identity token.'
    );
  }

  const givenName = credential.fullName?.givenName ?? undefined;
  const familyName = credential.fullName?.familyName ?? undefined;
  const fullName =
    givenName || familyName ? { givenName, familyName } : undefined;

  return {
    identityToken: credential.identityToken,
    nonce,
    fullName,
  };
}
