export class ConcurrentCallError extends Error {
  constructor() {
    super('Another request is already in progress');
    this.name = 'ConcurrentCallError';
  }
}

type InflightEntry = { abort: AbortController; promise: Promise<unknown> };

const registry = new Map<string, InflightEntry>();

/**
 * Run `fn` with inflight protection per `key`. If a previous call for the same
 * key is still running, it is aborted before starting the new one.
 * Returns the result of `fn`.
 */
export async function withInflight<T>(key: string, fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const prev = registry.get(key);
  if (prev) {
    prev.abort.abort();
    await prev.promise.catch(() => {});
  }

  const ac = new AbortController();
  const promise = fn(ac.signal);
  registry.set(key, { abort: ac, promise });

  try {
    const result = await promise;
    return result;
  } finally {
    if (registry.get(key)?.promise === promise) {
      registry.delete(key);
    }
  }
}

export function isInflight(key: string): boolean {
  return registry.has(key);
}

export function abortInflight(key: string): void {
  const entry = registry.get(key);
  if (!entry) return;
  entry.abort.abort();
}
