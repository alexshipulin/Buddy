type MirrorAIDebugEntry = {
  id: string;
  createdAt: string;
  analysisId?: number;
  level: 'info' | 'warn' | 'error';
  task: string;
  stage: string;
  message: string;
  sessionId?: string;
  model?: string;
  status?: number;
  durationMs?: number;
  details?: Record<string, unknown>;
};

const LOCAL_SINK_QUEUE_LIMIT = 2000;
const LOCAL_SINK_RETRY_DELAY_MS = 1500;
const LOCAL_SINK_REQUEST_TIMEOUT_MS = 2500;

let queue: MirrorAIDebugEntry[] = [];
let isFlushing = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

function normalizeSinkBaseUrl(raw: string | undefined): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

function getSinkBaseUrl(): string | null {
  return normalizeSinkBaseUrl(process.env.EXPO_PUBLIC_AI_DEBUG_LOCAL_SINK_URL);
}

function scheduleRetry(): void {
  if (retryTimer) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void flushQueue();
  }, LOCAL_SINK_RETRY_DELAY_MS);
}

async function postEntry(baseUrl: string, entry: MirrorAIDebugEntry): Promise<boolean> {
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timeoutId =
    controller != null
      ? setTimeout(() => controller.abort(), LOCAL_SINK_REQUEST_TIMEOUT_MS)
      : null;

  try {
    const response = await fetch(`${baseUrl}/ingest`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ entry }),
      signal: controller?.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    if (timeoutId != null) clearTimeout(timeoutId);
  }
}

async function flushQueue(): Promise<void> {
  if (isFlushing || queue.length === 0) return;
  const baseUrl = getSinkBaseUrl();
  if (!baseUrl) {
    queue = [];
    return;
  }

  isFlushing = true;
  try {
    while (queue.length > 0) {
      const next = queue[0];
      const ok = await postEntry(baseUrl, next);
      if (!ok) {
        scheduleRetry();
        return;
      }
      queue.shift();
    }
  } finally {
    isFlushing = false;
  }
}

export function pushLocalAIDebugEntry(entry: MirrorAIDebugEntry): void {
  if (!getSinkBaseUrl()) return;

  if (queue.length >= LOCAL_SINK_QUEUE_LIMIT) {
    queue = queue.slice(queue.length - LOCAL_SINK_QUEUE_LIMIT + 1);
  }
  queue.push(entry);
  void flushQueue();
}

