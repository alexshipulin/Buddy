import { getJson, setJson } from '../data/storage/storage';
import { createId } from '../utils/id';
import { fetchRemoteAIDebugLogsByAnalysisId, pushRemoteAIDebugEntry } from './aiDebugRemote';
import { pushLocalAIDebugEntry } from './aiDebugLocalSink';

const AI_LOGS_KEY = 'buddy_ai_debug_logs_v1';
const AI_LOGS_BY_ANALYSIS_KEY = 'buddy_ai_debug_logs_by_analysis_v1';
const MAX_LOG_ENTRIES = 1500;
// 0 = unlimited. Keep per-analysis logs unbounded by default so scan reports stay complete.
const MAX_ANALYSIS_GROUPS = 0;
const MAX_ANALYSIS_LOG_ENTRIES = 0;

export type AIDebugLevel = 'info' | 'warn' | 'error';

export type AIDebugEntry = {
  id: string;
  createdAt: string;
  analysisId?: number;
  level: AIDebugLevel;
  task: string;
  stage: string;
  message: string;
  sessionId?: string;
  model?: string;
  status?: number;
  durationMs?: number;
  details?: Record<string, unknown>;
};

type IncidentContext = {
  errorMessage?: string | null;
  rawAiOutput?: string | null;
  rawAiModel?: string | null;
  user?: {
    goal?: string;
    dietaryPreferences?: string[];
    allergies?: string[];
    dislikes?: string[];
  } | null;
  targets?: {
    caloriesKcal?: number;
    proteinG?: number;
    carbsG?: number;
    fatG?: number;
  } | null;
  today?: {
    dateKey?: string;
    mealsLoggedCount?: number;
    consumed?: {
      calories?: number;
      protein?: number;
      carbs?: number;
      fat?: number;
    };
  } | null;
};

type AIDebugLogsByAnalysis = {
  order: number[];
  byAnalysisId: Record<string, AIDebugEntry[]>;
};

const initialByAnalysis: AIDebugLogsByAnalysis = {
  order: [],
  byAnalysisId: {},
};

let writeQueue: Promise<void> = Promise.resolve();
const sessionAnalysisMap = new Map<string, number>();

function enqueueWrite(op: () => Promise<void>): void {
  writeQueue = writeQueue
    .then(op)
    .catch(() => {
      // Keep logging best-effort: never crash app flow because of diagnostics.
    });
}

export function logAIDebug(input: Omit<AIDebugEntry, 'id' | 'createdAt'>): void {
  const inferredAnalysisId =
    typeof input.analysisId === 'number' && Number.isFinite(input.analysisId)
      ? Math.max(0, Math.floor(input.analysisId))
      : input.sessionId
        ? sessionAnalysisMap.get(input.sessionId)
        : undefined;

  if (input.sessionId && inferredAnalysisId != null) {
    sessionAnalysisMap.set(input.sessionId, inferredAnalysisId);
  }

  const entry: AIDebugEntry = {
    id: createId('ai_log'),
    createdAt: new Date().toISOString(),
    ...input,
    analysisId: inferredAnalysisId,
  };

  if (__DEV__) {
    const prefix = `[AI:${entry.task}]`;
    const meta: Record<string, unknown> = {
      stage: entry.stage,
      sessionId: entry.sessionId,
      analysisId: entry.analysisId,
      model: entry.model,
      status: entry.status,
      durationMs: entry.durationMs,
      ...entry.details,
    };
    console.log(prefix, entry.message, meta);
  }

  pushLocalAIDebugEntry(entry);

  enqueueWrite(async () => {
    const current = await getJson<AIDebugEntry[]>(AI_LOGS_KEY, []);
    const next = [...current, entry];
    const trimmed = next.length > MAX_LOG_ENTRIES ? next.slice(next.length - MAX_LOG_ENTRIES) : next;
    await setJson(AI_LOGS_KEY, trimmed);
    await pushRemoteAIDebugEntry(entry);

    if (typeof entry.analysisId === 'number' && Number.isFinite(entry.analysisId)) {
      const store = await getJson<AIDebugLogsByAnalysis>(AI_LOGS_BY_ANALYSIS_KEY, initialByAnalysis);
      const id = Math.max(0, Math.floor(entry.analysisId));
      const key = String(id);
      const existing = store.byAnalysisId[key] ?? [];
      const updatedEntries = [...existing, entry];
      store.byAnalysisId[key] =
        MAX_ANALYSIS_LOG_ENTRIES > 0 && updatedEntries.length > MAX_ANALYSIS_LOG_ENTRIES
          ? updatedEntries.slice(updatedEntries.length - MAX_ANALYSIS_LOG_ENTRIES)
          : updatedEntries;

      if (!store.order.includes(id)) {
        store.order = [...store.order, id];
      }
      if (MAX_ANALYSIS_GROUPS > 0 && store.order.length > MAX_ANALYSIS_GROUPS) {
        const toDrop = store.order.slice(0, store.order.length - MAX_ANALYSIS_GROUPS);
        store.order = store.order.slice(store.order.length - MAX_ANALYSIS_GROUPS);
        toDrop.forEach((dropId) => {
          delete store.byAnalysisId[String(dropId)];
        });
      }
      await setJson(AI_LOGS_BY_ANALYSIS_KEY, store);
    }
  });
}

export async function flushAIDebugLogs(): Promise<void> {
  await writeQueue;
}

function sliceLatestReversed(logs: AIDebugEntry[], limit?: number): AIDebugEntry[] {
  const safeLimit =
    typeof limit === 'number' && Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 0;
  const picked = safeLimit > 0 ? logs.slice(Math.max(0, logs.length - safeLimit)) : logs;
  return [...picked].reverse();
}

function mergeEntriesKeepingLatest(a: AIDebugEntry[], b: AIDebugEntry[]): AIDebugEntry[] {
  const byId = new Map<string, AIDebugEntry>();
  for (const entry of [...a, ...b]) {
    const existing = byId.get(entry.id);
    if (!existing) {
      byId.set(entry.id, entry);
      continue;
    }
    const existingTs = Date.parse(existing.createdAt);
    const nextTs = Date.parse(entry.createdAt);
    if (!Number.isFinite(existingTs) || (Number.isFinite(nextTs) && nextTs >= existingTs)) {
      byId.set(entry.id, entry);
    }
  }
  return [...byId.values()];
}

function sortByCreatedAtAsc(entries: AIDebugEntry[]): AIDebugEntry[] {
  return [...entries].sort((left, right) => {
    const a = Date.parse(left.createdAt);
    const b = Date.parse(right.createdAt);
    if (Number.isFinite(a) && Number.isFinite(b) && a !== b) return a - b;
    return left.id.localeCompare(right.id);
  });
}

export async function getAIDebugLogs(limit = 400): Promise<AIDebugEntry[]> {
  await flushAIDebugLogs();
  const logs = await getJson<AIDebugEntry[]>(AI_LOGS_KEY, []);
  return sliceLatestReversed(logs, limit);
}

export async function getAIDebugLogsByAnalysisId(
  analysisId: number,
  limit?: number
): Promise<AIDebugEntry[]> {
  await flushAIDebugLogs();
  const id = Math.max(0, Math.floor(analysisId));
  if (id <= 0) return [];
  const store = await getJson<AIDebugLogsByAnalysis>(AI_LOGS_BY_ANALYSIS_KEY, initialByAnalysis);
  const localEntries = store.byAnalysisId[String(id)] ?? [];
  const remoteEntries = await fetchRemoteAIDebugLogsByAnalysisId(id, limit);
  const merged = sortByCreatedAtAsc(mergeEntriesKeepingLatest(localEntries, remoteEntries));
  return sliceLatestReversed(merged, limit);
}

export async function clearAIDebugLogs(): Promise<void> {
  await setJson(AI_LOGS_KEY, []);
  await setJson(AI_LOGS_BY_ANALYSIS_KEY, initialByAnalysis);
}

function renderDebugReport(logs: AIDebugEntry[], title: string): string {
  const lines: string[] = [];
  lines.push(title);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Entries: ${logs.length}`);
  lines.push('');

  for (const log of logs) {
    const parts = [
      log.createdAt,
      log.level.toUpperCase(),
      log.task,
      log.stage,
      log.message,
    ];
    lines.push(parts.join(' | '));
    if (
      log.analysisId != null ||
      log.sessionId ||
      log.model ||
      log.status != null ||
      log.durationMs != null
    ) {
      lines.push(
        `meta: analysisId=${log.analysisId ?? '-'} session=${log.sessionId ?? '-'} model=${log.model ?? '-'} status=${log.status ?? '-'} durationMs=${log.durationMs ?? '-'}`
      );
    }
    if (log.details && Object.keys(log.details).length) {
      lines.push(`details: ${JSON.stringify(log.details)}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

function stringifyCompact(value: unknown, maxLen = 600): string {
  try {
    const raw = JSON.stringify(value);
    if (!raw) return '';
    if (raw.length <= maxLen) return raw;
    const omitted = raw.length - maxLen;
    return `${raw.slice(0, maxLen)}…[truncated ${omitted} chars]`;
  } catch {
    return '[unserializable]';
  }
}

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  const omitted = text.length - maxLen;
  return `${text.slice(0, maxLen)}\n...[truncated ${omitted} chars]`;
}

function pickRequestSnapshot(logs: AIDebugEntry[]): Record<string, unknown> | null {
  const requestPayload = logs.find((entry) => entry.stage === 'menu_analysis.request_payload');
  const requestPrompt = logs.find((entry) => entry.stage === 'menu_analysis.request_prompt');
  const runStart = logs.find((entry) => entry.stage === 'run.start');

  if (!requestPayload && !requestPrompt && !runStart) return null;
  return {
    request_payload: requestPayload?.details ?? null,
    request_prompt: requestPrompt?.details ?? null,
    run_start: runStart?.details ?? null,
  };
}

export async function buildAIDebugIncidentReportByAnalysisId(params: {
  analysisId: number;
  limit?: number;
  context?: IncidentContext;
}): Promise<string> {
  const id = Math.max(0, Math.floor(params.analysisId));
  const logs = await getAIDebugLogsByAnalysisId(id, params.limit ?? 500);
  const chronological = [...logs].reverse();
  const lines: string[] = [];
  const context = params.context ?? null;

  lines.push(`Buddy AI incident report | analysisId=${id}`);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Entries: ${logs.length}`);
  lines.push('');

  lines.push('=== USER CONTEXT ===');
  lines.push(
    stringifyCompact({
      goal: context?.user?.goal ?? null,
      dietaryPreferences: context?.user?.dietaryPreferences ?? [],
      allergies: context?.user?.allergies ?? [],
      dislikes: context?.user?.dislikes ?? [],
    })
  );
  lines.push('');

  lines.push('=== TODAY NUTRITION ===');
  lines.push(
    stringifyCompact({
      dateKey: context?.today?.dateKey ?? null,
      mealsLoggedCount: context?.today?.mealsLoggedCount ?? null,
      consumed: context?.today?.consumed ?? null,
      targets: context?.targets ?? null,
    })
  );
  lines.push('');

  lines.push('=== AI REQUEST SNAPSHOT ===');
  lines.push(stringifyCompact(pickRequestSnapshot(chronological), 2400));
  lines.push('');

  lines.push('=== AI RESPONSE SNAPSHOT ===');
  lines.push(`rawModel: ${context?.rawAiModel ?? '-'}`);
  lines.push(`uiErrorMessage: ${context?.errorMessage ?? '-'}`);
  const raw = (context?.rawAiOutput ?? '').trim();
  if (raw) {
    lines.push(`rawLength: ${raw.length}`);
    lines.push('rawOutput:');
    lines.push(truncateText(raw, 8000));
  } else {
    lines.push('rawOutput: -');
  }
  lines.push('');

  lines.push('=== ERROR / WARN EVENTS ===');
  const errorWarn = chronological.filter((entry) => entry.level !== 'info');
  if (errorWarn.length === 0) {
    lines.push('none');
  } else {
    for (const entry of errorWarn) {
      lines.push(
        `${entry.createdAt} | ${entry.level.toUpperCase()} | ${entry.task} | ${entry.stage} | ${entry.message}`
      );
      lines.push(
        `meta: model=${entry.model ?? '-'} status=${entry.status ?? '-'} durationMs=${entry.durationMs ?? '-'}`
      );
      if (entry.details && Object.keys(entry.details).length) {
        lines.push(`details: ${stringifyCompact(entry.details, 1000)}`);
      }
      lines.push('');
    }
  }

  lines.push('=== STAGE TIMELINE (compact) ===');
  const timeline = chronological.slice(-120);
  for (const entry of timeline) {
    lines.push(
      `${entry.createdAt} | ${entry.level.toUpperCase()} | ${entry.stage} | model=${entry.model ?? '-'} | status=${entry.status ?? '-'}`
    );
  }

  return lines.join('\n');
}

export async function buildAIDebugReport(limit = 1200): Promise<string> {
  const logs = await getAIDebugLogs(limit);
  return renderDebugReport(logs, 'Buddy AI debug report');
}

export async function buildAIDebugReportByAnalysisId(
  analysisId: number,
  limit?: number
): Promise<string> {
  const id = Math.max(0, Math.floor(analysisId));
  const logs = await getAIDebugLogsByAnalysisId(id, limit);
  return renderDebugReport(logs, `Buddy AI debug report | analysisId=${id}`);
}
