import { logAIDebug } from './aiDebugLog';
import { createId } from '../utils/id';

export type TaskType = 'menu_scan' | 'meal_photo' | 'meal_text' | 'chat' | 'nutrition_targets' | 'legacy_menu';

export type ErrorCategory = 'RATE_LIMIT' | 'SERVER' | 'CLIENT' | 'NETWORK' | 'ABORT' | 'UNKNOWN';

type GeminiResponseJson = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  error?: { message?: string; code?: number };
};

type CallResult = { rawText: string; httpStatus: number; rawJson: GeminiResponseJson };

export type GeminiCallError = Error & {
  status?: number;
  model?: string;
  category: ErrorCategory;
  isStructuredUnsupported: boolean;
};

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_GEMINI_TIMEOUT_MS = (() => {
  const parsed = Number(process.env.EXPO_PUBLIC_GEMINI_TIMEOUT_MS ?? 45000);
  if (!Number.isFinite(parsed)) return 45000;
  return Math.max(5000, Math.round(parsed));
})();

const HEAVY_MODEL_TIMEOUT_MS = (() => {
  const parsed = Number(process.env.EXPO_PUBLIC_GEMINI_HEAVY_TIMEOUT_MS ?? 65000);
  if (!Number.isFinite(parsed)) return Math.max(DEFAULT_GEMINI_TIMEOUT_MS, 65000);
  return Math.max(DEFAULT_GEMINI_TIMEOUT_MS, Math.round(parsed));
})();

const STRUCTURED_MARKERS = [
  'json mode is not enabled',
  'responsemimetype',
  'responseschema',
  'response_schema',
  'not supported',
  'structured output',
  'is not supported for generatecontent',
  'specified schema produces a constraint that has too many states for serving',
  'too many states for serving',
  'unknown name "additionalproperties"',
];

// ── Model chains per task ─────────────────────────────────────────────────────

function parseModelListEnv(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function dedupeModels(models: string[]): string[] {
  return models.filter((model, index) => models.indexOf(model) === index);
}

function modelCostRank(model: string): number {
  const lower = model.toLowerCase();
  if (lower.includes('pro')) return 90;
  if (lower.includes('2.5-flash') && !lower.includes('lite')) return 70;
  if (lower.includes('2.0-flash') && !lower.includes('lite')) return 60;
  if (lower.includes('1.5-flash') && !lower.includes('8b')) return 50;
  if (lower.includes('2.5-flash-lite')) return 40;
  if (lower.includes('2.0-flash-lite')) return 30;
  if (lower.includes('1.5-flash-8b')) return 20;
  if (lower.includes('lite')) return 35;
  if (lower.includes('8b')) return 15;
  return 55;
}

function findNextRateLimitCandidate(models: string[], currentIndex: number): number {
  const current = models[currentIndex];
  const currentRank = modelCostRank(current);
  for (let i = currentIndex + 1; i < models.length; i++) {
    const candidate = models[i];
    if (modelCostRank(candidate) <= currentRank) return i;
  }
  return -1;
}

export function buildModelChain(taskType: TaskType): string[] {
  let chain: string[];
  switch (taskType) {
    case 'menu_scan': {
      const explicitMenuScanModels = parseModelListEnv(process.env.EXPO_PUBLIC_GEMINI_MENU_SCAN_MODELS);
      const defaultMenuScanModels = [process.env.EXPO_PUBLIC_GEMINI_MODEL ?? 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];
      const rateLimitDowngradeModels = parseModelListEnv(process.env.EXPO_PUBLIC_GEMINI_RATE_LIMIT_DOWNGRADE_MODELS);
      chain = [...(explicitMenuScanModels.length > 0 ? explicitMenuScanModels : defaultMenuScanModels), ...rateLimitDowngradeModels];
      break;
    }
    case 'meal_photo':
    case 'meal_text':
    case 'chat':
    case 'nutrition_targets':
    case 'legacy_menu':
      chain = ['gemini-2.5-flash-lite', 'gemini-2.5-flash'];
      break;
  }
  return dedupeModels(chain.filter(Boolean));
}

function timeoutForModel(model: string): number {
  return /flash-lite/i.test(model) ? DEFAULT_GEMINI_TIMEOUT_MS : HEAVY_MODEL_TIMEOUT_MS;
}

// ── Low-level helpers ─────────────────────────────────────────────────────────

export function extractTextFromResponse(json: GeminiResponseJson): string {
  return (
    json?.candidates?.[0]?.content?.parts
      ?.map((p) => p?.text)
      .filter(Boolean)
      .join('') ?? ''
  );
}

export function sanitizeJsonText(text: string): string {
  let t = text.trim();
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  return t.trim();
}

export function isStructuredUnsupportedError(status: number, responseText: string): boolean {
  if (status !== 400 && status !== 422) return false;
  const lower = responseText.toLowerCase();
  return STRUCTURED_MARKERS.some((m) => lower.includes(m));
}

export function classifyError(err: unknown, status?: number): ErrorCategory {
  const domExceptionCtor: unknown =
    typeof globalThis !== 'undefined' && 'DOMException' in globalThis
      ? (globalThis as Record<string, unknown>).DOMException
      : undefined;
  const isDomAbort =
    typeof domExceptionCtor === 'function' &&
    err instanceof (domExceptionCtor as typeof Error) &&
    (err as Error).name === 'AbortError';
  if (isDomAbort) return 'ABORT';
  if (err instanceof Error && err.name === 'AbortError') return 'ABORT';
  if (status === 429) return 'RATE_LIMIT';
  if (status != null && status >= 500) return 'SERVER';
  if (status != null && status >= 400) return 'CLIENT';
  if (err instanceof TypeError && /fetch|network/i.test(err.message)) return 'NETWORK';
  if (err instanceof Error && /network|timeout|econnrefused|enotfound/i.test(err.message)) return 'NETWORK';
  return 'UNKNOWN';
}

function buildFetchSignal(parent: AbortSignal | undefined, timeoutMs: number): {
  signal: AbortSignal;
  cleanup: () => void;
  timedOut: () => boolean;
} {
  const ac = new AbortController();
  let timedOut = false;

  const onParentAbort = (): void => ac.abort();
  if (parent) {
    if (parent.aborted) ac.abort();
    else parent.addEventListener('abort', onParentAbort);
  }

  const timer = setTimeout(() => {
    timedOut = true;
    ac.abort();
  }, timeoutMs);

  return {
    signal: ac.signal,
    timedOut: () => timedOut,
    cleanup: () => {
      clearTimeout(timer);
      if (parent) parent.removeEventListener('abort', onParentAbort);
    },
  };
}

// ── Single-model call ─────────────────────────────────────────────────────────

export async function callGenerateContent(params: {
  model: string;
  apiKey: string;
  body: object;
  signal?: AbortSignal;
  timeoutMs?: number;
}): Promise<CallResult> {
  const timeoutMs = Math.max(5000, Math.round(params.timeoutMs ?? DEFAULT_GEMINI_TIMEOUT_MS));
  const { signal, cleanup, timedOut } = buildFetchSignal(params.signal, timeoutMs);
  const url = `${GEMINI_BASE}/${params.model}:generateContent?key=${encodeURIComponent(params.apiKey)}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params.body),
      signal,
    });
  } catch (fetchErr) {
    if (timedOut() && !params.signal?.aborted) {
      const timeoutError = Object.assign(
        new Error(`Gemini timeout after ${timeoutMs}ms (${params.model})`),
        { status: 408, model: params.model, category: 'NETWORK' as ErrorCategory, isStructuredUnsupported: false },
      ) as GeminiCallError;
      throw timeoutError;
    }
    const category = classifyError(fetchErr);
    const err = Object.assign(
      new Error(`Gemini request failed (${params.model}): ${(fetchErr as Error)?.message ?? 'Unknown error'}`),
      { model: params.model, category, isStructuredUnsupported: false },
    ) as GeminiCallError;
    throw err;
  } finally {
    cleanup();
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    const category = classifyError(null, res.status);
    const structured = isStructuredUnsupportedError(res.status, errText);
    const err = Object.assign(
      new Error(`Gemini ${res.status} (${params.model}): ${errText.slice(0, 300)}`),
      { status: res.status, model: params.model, category, isStructuredUnsupported: structured },
    ) as GeminiCallError;
    throw err;
  }

  const rawJson = (await res.json()) as GeminiResponseJson;
  return { rawText: extractTextFromResponse(rawJson), httpStatus: res.status, rawJson };
}

// ── Unified fallback runner ───────────────────────────────────────────────────

export type RunOpts = {
  taskType: TaskType;
  /** Optional explicit model order override for this run. */
  modelChain?: string[];
  apiKey: string;
  body: object;
  signal?: AbortSignal;
  /** Correlation id to stitch multi-step logs from one request. */
  debugSessionId?: string;
  /** Optional analysis id used to group all logs for one AI request across screens. */
  debugAnalysisId?: number;
  /** Optional light context for diagnostics (do not include secrets). */
  debugMeta?: Record<string, unknown>;
  /** When true, on structured-unsupported the runner will retry without schema. */
  supportsPlainFallback?: boolean;
  /** Callback to produce body without responseSchema/responseMimeType. Prompt should include "Return only valid JSON." */
  buildPlainBody?: () => object;
  /** Optional callback to produce a smaller/faster body for timeout recovery. */
  buildLightweightBody?: () => object;
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export class AllModelsRateLimitedError extends Error {
  constructor() {
    super('All models returned 429 (rate limited)');
    this.name = 'AllModelsRateLimitedError';
  }
}

export async function runWithFallback(opts: RunOpts): Promise<{ rawText: string; model: string }> {
  const models = (opts.modelChain && opts.modelChain.length > 0 ? opts.modelChain : buildModelChain(opts.taskType)).filter(
    (m, i, arr) => Boolean(m) && arr.indexOf(m) === i
  );
  const sessionId = opts.debugSessionId ?? createId(opts.taskType);
  const analysisId = opts.debugAnalysisId;
  const runStartedAt = Date.now();
  let lastErr: unknown;
  let allRateLimited = true;
  let lightweightRetryUsed = false;
  logAIDebug({
    level: 'info',
    task: opts.taskType,
    stage: 'run.start',
    message: 'AI request started',
    sessionId,
    analysisId,
    details: { models, supportsPlainFallback: Boolean(opts.supportsPlainFallback), ...opts.debugMeta },
  });

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const isLast = i === models.length - 1;

    try {
      const attemptStartedAt = Date.now();
      const timeoutMs = timeoutForModel(model);
      logAIDebug({
        level: 'info',
        task: opts.taskType,
        stage: 'attempt.start',
        message: `Calling model ${model}`,
        sessionId,
        analysisId,
        model,
        details: { attempt: i + 1, totalModels: models.length, timeoutMs },
      });
      const result = await callGenerateContent({
        model,
        apiKey: opts.apiKey,
        body: opts.body,
        signal: opts.signal,
        timeoutMs,
      });
      const attemptDurationMs = Date.now() - attemptStartedAt;
      logAIDebug({
        level: 'info',
        task: opts.taskType,
        stage: 'attempt.success',
        message: `Model ${model} succeeded`,
        sessionId,
        analysisId,
        model,
        status: result.httpStatus,
        durationMs: attemptDurationMs,
        details: { rawLen: result.rawText.length, attempt: i + 1 },
      });
      logAIDebug({
        level: 'info',
        task: opts.taskType,
        stage: 'run.success',
        message: 'AI request finished',
        sessionId,
        analysisId,
        model,
        durationMs: Date.now() - runStartedAt,
      });
      return { rawText: result.rawText, model };
    } catch (e) {
      lastErr = e;
      const callErr = e as GeminiCallError;
      const category = callErr.category ?? classifyError(e);
      logAIDebug({
        level: category === 'CLIENT' || category === 'ABORT' ? 'error' : 'warn',
        task: opts.taskType,
        stage: 'attempt.error',
        message: `Model ${model} failed (${category})`,
        sessionId,
        analysisId,
        model,
        status: callErr.status,
        details: {
          attempt: i + 1,
          isLast,
          category,
          errName: (e as Error)?.name,
          errMsg: (e as Error)?.message?.slice(0, 240),
          structuredUnsupported: Boolean(callErr.isStructuredUnsupported),
        },
      });

      // ABORT → never fallback, rethrow immediately
      if (category === 'ABORT') {
        logAIDebug({
          level: 'warn',
          task: opts.taskType,
          stage: 'run.abort',
          message: 'AI request aborted',
          sessionId,
          analysisId,
          model,
          durationMs: Date.now() - runStartedAt,
        });
        throw e;
      }

      if (category !== 'RATE_LIMIT') allRateLimited = false;

      // Structured unsupported → try plain fallback on same model first
      if (callErr.isStructuredUnsupported && opts.supportsPlainFallback && opts.buildPlainBody) {
        const plainStartedAt = Date.now();
        logAIDebug({
          level: 'warn',
          task: opts.taskType,
          stage: 'plain_fallback.start',
          message: `Trying plain fallback on ${model}`,
          sessionId,
          analysisId,
          model,
        });
        try {
          const plainBody = opts.buildPlainBody();
          const result = await callGenerateContent({
            model,
            apiKey: opts.apiKey,
            body: plainBody,
            signal: opts.signal,
            timeoutMs: timeoutForModel(model),
          });
          logAIDebug({
            level: 'info',
            task: opts.taskType,
            stage: 'plain_fallback.success',
            message: `Plain fallback succeeded on ${model}`,
            sessionId,
            analysisId,
            model,
            durationMs: Date.now() - plainStartedAt,
            status: result.httpStatus,
            details: { rawLen: result.rawText.length },
          });
          logAIDebug({
            level: 'info',
            task: opts.taskType,
            stage: 'run.success',
            message: 'AI request finished via plain fallback',
            sessionId,
            analysisId,
            model,
            durationMs: Date.now() - runStartedAt,
          });
          return { rawText: result.rawText, model };
        } catch (plainErr) {
          logAIDebug({
            level: 'warn',
            task: opts.taskType,
            stage: 'plain_fallback.error',
            message: `Plain fallback failed on ${model}`,
            sessionId,
            analysisId,
            model,
            durationMs: Date.now() - plainStartedAt,
            details: {
              errName: (plainErr as Error)?.name,
              errMsg: (plainErr as Error)?.message?.slice(0, 240),
            },
          });
          if (classifyError(plainErr) === 'ABORT') {
            logAIDebug({
              level: 'warn',
              task: opts.taskType,
              stage: 'run.abort',
              message: 'AI request aborted during plain fallback',
              sessionId,
              analysisId,
              model,
              durationMs: Date.now() - runStartedAt,
            });
            throw plainErr;
          }
          if (!isLast) continue;
          throw e;
        }
      }

      // 429 → skip to next model immediately
      if (category === 'RATE_LIMIT') {
        const nextRateLimitIndex = findNextRateLimitCandidate(models, i);
        const nextModel = nextRateLimitIndex >= 0 ? models[nextRateLimitIndex] : null;
        const skippedHeavierModels =
          nextRateLimitIndex > i + 1 ? models.slice(i + 1, nextRateLimitIndex) : [];
        const waitMs = 300 + Math.round(Math.random() * 500);
        logAIDebug({
          level: 'warn',
          task: opts.taskType,
          stage: 'rate_limit.downgrade',
          message: `Rate limit on ${model}, trying lighter fallback`,
          sessionId,
          analysisId,
          model,
          details: { waitMs, nextModel, skippedHeavierModels },
        });
        await sleep(waitMs);
        if (nextRateLimitIndex >= 0) {
          i = nextRateLimitIndex - 1;
          continue;
        }
        if (!isLast) {
          logAIDebug({
            level: 'warn',
            task: opts.taskType,
            stage: 'rate_limit.no_lower_model',
            message: `Rate limit on ${model}, no cheaper model left`,
            sessionId,
            analysisId,
            model,
            details: {
              remainingModels: models.slice(i + 1),
            },
          });
        }
        logAIDebug({
          level: 'error',
          task: opts.taskType,
          stage: 'run.rate_limited',
          message: 'All models returned rate limit',
          sessionId,
          analysisId,
          durationMs: Date.now() - runStartedAt,
        });
        throw allRateLimited ? new AllModelsRateLimitedError() : e;
      }

      const isTimeout =
        callErr.status === 408 || /timeout/i.test((e as Error)?.message ?? '');
      if (isTimeout && !lightweightRetryUsed && opts.buildLightweightBody) {
        lightweightRetryUsed = true;
        const lightweightModel =
          models.find((candidate) => /flash-lite/i.test(candidate) && candidate !== model) ?? model;
        const lightweightTimeoutMs = timeoutForModel(lightweightModel);
        const lightweightStartedAt = Date.now();
        logAIDebug({
          level: 'warn',
          task: opts.taskType,
          stage: 'lightweight_retry.start',
          message: `Timeout on ${model}, trying lightweight retry`,
          sessionId,
          analysisId,
          model: lightweightModel,
          details: { sourceModel: model, timeoutMs: lightweightTimeoutMs },
        });
        try {
          const lightweightBody = opts.buildLightweightBody();
          const lightweightResult = await callGenerateContent({
            model: lightweightModel,
            apiKey: opts.apiKey,
            body: lightweightBody,
            signal: opts.signal,
            timeoutMs: lightweightTimeoutMs,
          });
          logAIDebug({
            level: 'info',
            task: opts.taskType,
            stage: 'lightweight_retry.success',
            message: `Lightweight retry succeeded on ${lightweightModel}`,
            sessionId,
            analysisId,
            model: lightweightModel,
            status: lightweightResult.httpStatus,
            durationMs: Date.now() - lightweightStartedAt,
            details: { rawLen: lightweightResult.rawText.length, sourceModel: model },
          });
          logAIDebug({
            level: 'info',
            task: opts.taskType,
            stage: 'run.success',
            message: 'AI request finished via lightweight retry',
            sessionId,
            analysisId,
            model: lightweightModel,
            durationMs: Date.now() - runStartedAt,
          });
          return { rawText: lightweightResult.rawText, model: lightweightModel };
        } catch (lightErr) {
          logAIDebug({
            level: 'warn',
            task: opts.taskType,
            stage: 'lightweight_retry.error',
            message: `Lightweight retry failed on ${lightweightModel}`,
            sessionId,
            analysisId,
            model: lightweightModel,
            durationMs: Date.now() - lightweightStartedAt,
            details: {
              sourceModel: model,
              errName: (lightErr as Error)?.name,
              errMsg: (lightErr as Error)?.message?.slice(0, 240),
            },
          });
          if (classifyError(lightErr) === 'ABORT') {
            logAIDebug({
              level: 'warn',
              task: opts.taskType,
              stage: 'run.abort',
              message: 'AI request aborted during lightweight retry',
              sessionId,
              analysisId,
              model: lightweightModel,
              durationMs: Date.now() - runStartedAt,
            });
            throw lightErr;
          }
          if (!isLast) continue;
          throw e;
        }
      }

      // 5xx → one retry with backoff, then next model
      if (category === 'SERVER') {
        const jitter = Math.random() * 300;
        logAIDebug({
          level: 'warn',
          task: opts.taskType,
          stage: 'retry.wait',
          message: `Server error on ${model}, waiting before retry`,
          sessionId,
          analysisId,
          model,
          details: { waitMs: 300 + jitter },
        });
        await sleep(300 + jitter);
        try {
          const retryStartedAt = Date.now();
          const result = await callGenerateContent({
            model,
            apiKey: opts.apiKey,
            body: opts.body,
            signal: opts.signal,
            timeoutMs: timeoutForModel(model),
          });
          logAIDebug({
            level: 'info',
            task: opts.taskType,
            stage: 'retry.success',
            message: `Retry succeeded on ${model}`,
            sessionId,
            analysisId,
            model,
            status: result.httpStatus,
            durationMs: Date.now() - retryStartedAt,
            details: { rawLen: result.rawText.length },
          });
          logAIDebug({
            level: 'info',
            task: opts.taskType,
            stage: 'run.success',
            message: 'AI request finished after retry',
            sessionId,
            analysisId,
            model,
            durationMs: Date.now() - runStartedAt,
          });
          return { rawText: result.rawText, model };
        } catch (retryErr) {
          logAIDebug({
            level: 'warn',
            task: opts.taskType,
            stage: 'retry.error',
            message: `Retry failed on ${model}`,
            sessionId,
            analysisId,
            model,
            details: {
              errName: (retryErr as Error)?.name,
              errMsg: (retryErr as Error)?.message?.slice(0, 240),
            },
          });
          if (classifyError(retryErr) === 'ABORT') {
            logAIDebug({
              level: 'warn',
              task: opts.taskType,
              stage: 'run.abort',
              message: 'AI request aborted during retry',
              sessionId,
              analysisId,
              model,
              durationMs: Date.now() - runStartedAt,
            });
            throw retryErr;
          }
          if (!isLast) continue;
          throw e;
        }
      }

      // 4xx (non-structured) → config error, do not retry/fallback
      if (category === 'CLIENT') {
        logAIDebug({
          level: 'error',
          task: opts.taskType,
          stage: 'run.client_error',
          message: 'Client-side API error; stopping fallback',
          sessionId,
          analysisId,
          model,
          status: callErr.status,
          durationMs: Date.now() - runStartedAt,
        });
        throw e;
      }

      // NETWORK / UNKNOWN → try next model
      if (!isLast) continue;
      logAIDebug({
        level: 'error',
        task: opts.taskType,
        stage: 'run.failed',
        message: 'AI request failed after trying all models',
        sessionId,
        analysisId,
        durationMs: Date.now() - runStartedAt,
        details: { category },
      });
      throw e;
    }
  }

  logAIDebug({
    level: 'error',
    task: opts.taskType,
    stage: 'run.failed',
    message: 'All models exhausted',
    sessionId,
    analysisId,
    durationMs: Date.now() - runStartedAt,
    details: {
      errName: (lastErr as Error)?.name,
      errMsg: (lastErr as Error)?.message?.slice(0, 240),
    },
  });
  throw lastErr ?? new Error('All models exhausted');
}

// ── API key helper ────────────────────────────────────────────────────────────

export function getApiKey(): string | null {
  const key = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!key || key === 'your_key_here' || key.trim() === '') return null;
  return key;
}

export function requireApiKey(): string {
  const key = getApiKey();
  if (!key) throw new Error('Missing EXPO_PUBLIC_GEMINI_API_KEY');
  return key;
}
