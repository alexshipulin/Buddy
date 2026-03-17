import { getSession, refreshSession, signOut } from '../index';

type AuthenticatedFetchInit = RequestInit & {
  skipAuth?: boolean;
  retryOnUnauthorized?: boolean;
};

function mergeHeaders(
  base: HeadersInit | undefined,
  patch: Record<string, string>
): Headers {
  const headers = new Headers(base);
  Object.entries(patch).forEach(([key, value]) => {
    headers.set(key, value);
  });
  return headers;
}

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init: AuthenticatedFetchInit = {}
): Promise<Response> {
  const { skipAuth = false, retryOnUnauthorized = true, ...requestInit } = init;
  const session = skipAuth ? null : await getSession();
  const accessToken = session?.accessToken;
  const headers = mergeHeaders(requestInit.headers, {
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  });

  const response = await fetch(input, {
    ...requestInit,
    headers,
  });

  if (
    response.status !== 401 ||
    !retryOnUnauthorized ||
    skipAuth
  ) {
    return response;
  }

  const refreshed = await refreshSession();
  if (!refreshed?.accessToken) {
    await signOut();
    return response;
  }

  const retryHeaders = mergeHeaders(requestInit.headers, {
    Authorization: `Bearer ${refreshed.accessToken}`,
  });

  return fetch(input, {
    ...requestInit,
    headers: retryHeaders,
  });
}
