export type TaskType = 'menu_scan' | 'meal_photo' | 'chat' | 'nutrition_targets' | 'legacy_menu';

export type ErrorCategory = 'RATE_LIMIT' | 'SERVER' | 'CLIENT' | 'NETWORK' | 'ABORT' | 'UNKNOWN';

type GeminiResponseJson = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  error?: { message?: string; code?: number };
};

type CallResult = { rawText: string; httpStatus: number; rawJson: GeminiResponseJson };

export type GeminiCallError = Error & {
  status?: number;
  category: ErrorCategory;
  isStructuredUnsupported: boolean;
};

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

const STRUCTURED_MARKERS = [
  'json mode is not enabled',
  'responsemimetype',
  'responseschema',
  'not supported',
  'structured output',
  'is not supported for generatecontent',
];

// ── Model chains per task ─────────────────────────────────────────────────────

export function buildModelChain(taskType: TaskType): string[] {
  let chain: string[];
  switch (taskType) {
    case 'menu_scan':
      chain = [process.env.EXPO_PUBLIC_GEMINI_MODEL ?? 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];
      break;
    case 'meal_photo':
    case 'chat':
    case 'nutrition_targets':
    case 'legacy_menu':
      chain = ['gemini-2.5-flash-lite', 'gemini-2.5-flash'];
      break;
  }
  return chain.filter((m, i) => chain.indexOf(m) === i);
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
  if (err instanceof DOMException && err.name === 'AbortError') return 'ABORT';
  if (status === 429) return 'RATE_LIMIT';
  if (status != null && status >= 500) return 'SERVER';
  if (status != null && status >= 400) return 'CLIENT';
  if (err instanceof TypeError && /fetch|network/i.test(err.message)) return 'NETWORK';
  if (err instanceof Error && /network|timeout|econnrefused|enotfound/i.test(err.message)) return 'NETWORK';
  return 'UNKNOWN';
}

// ── Single-model call ─────────────────────────────────────────────────────────

export async function callGenerateContent(params: {
  model: string;
  apiKey: string;
  body: object;
  signal?: AbortSignal;
}): Promise<CallResult> {
  const url = `${GEMINI_BASE}/${params.model}:generateContent?key=${encodeURIComponent(params.apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params.body),
    signal: params.signal,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    const category = classifyError(null, res.status);
    const structured = isStructuredUnsupportedError(res.status, errText);
    const err = Object.assign(
      new Error(`Gemini ${res.status} (${params.model}): ${errText.slice(0, 300)}`),
      { status: res.status, category, isStructuredUnsupported: structured },
    ) as GeminiCallError;
    throw err;
  }

  const rawJson = (await res.json()) as GeminiResponseJson;
  return { rawText: extractTextFromResponse(rawJson), httpStatus: res.status, rawJson };
}

// ── Unified fallback runner ───────────────────────────────────────────────────

export type RunOpts = {
  taskType: TaskType;
  apiKey: string;
  body: object;
  signal?: AbortSignal;
  /** When true, on structured-unsupported the runner will retry without schema. */
  supportsPlainFallback?: boolean;
  /** Callback to produce body without responseSchema/responseMimeType. Prompt should include "Return only valid JSON." */
  buildPlainBody?: () => object;
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function runWithFallback(opts: RunOpts): Promise<{ rawText: string; model: string }> {
  const models = buildModelChain(opts.taskType);
  let lastErr: unknown;

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const isLast = i === models.length - 1;

    try {
      const result = await callGenerateContent({ model, apiKey: opts.apiKey, body: opts.body, signal: opts.signal });
      return { rawText: result.rawText, model };
    } catch (e) {
      lastErr = e;
      const callErr = e as GeminiCallError;

      // Structured unsupported → try plain fallback on same model first
      if (callErr.isStructuredUnsupported && opts.supportsPlainFallback && opts.buildPlainBody) {
        try {
          const plainBody = opts.buildPlainBody();
          const result = await callGenerateContent({ model, apiKey: opts.apiKey, body: plainBody, signal: opts.signal });
          return { rawText: result.rawText, model };
        } catch {
          // plain also failed on this model → continue to next model
          if (!isLast) continue;
          throw e;
        }
      }

      // 429 → skip to next model immediately
      if (callErr.category === 'RATE_LIMIT') {
        if (!isLast) continue;
        throw e;
      }

      // 5xx → one retry with backoff, then next model
      if (callErr.category === 'SERVER') {
        const jitter = Math.random() * 300;
        await sleep(300 + jitter);
        try {
          const result = await callGenerateContent({ model, apiKey: opts.apiKey, body: opts.body, signal: opts.signal });
          return { rawText: result.rawText, model };
        } catch {
          if (!isLast) continue;
          throw e;
        }
      }

      // 4xx (non-structured) → config error, do not retry/fallback
      if (callErr.category === 'CLIENT') {
        throw e;
      }

      // NETWORK / UNKNOWN → try next model
      if (!isLast) continue;
      throw e;
    }
  }

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
