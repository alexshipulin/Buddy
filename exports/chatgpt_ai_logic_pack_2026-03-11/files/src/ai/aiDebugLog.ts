import { getJson, setJson } from '../data/storage/storage';
import { createId } from '../utils/id';

const AI_LOGS_KEY = 'buddy_ai_debug_logs_v1';
const AI_LOGS_BY_ANALYSIS_KEY = 'buddy_ai_debug_logs_by_analysis_v1';
const MAX_LOG_ENTRIES = 500;
const MAX_ANALYSIS_GROUPS = 300;
const MAX_ANALYSIS_LOG_ENTRIES = 600;

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

  enqueueWrite(async () => {
    const current = await getJson<AIDebugEntry[]>(AI_LOGS_KEY, []);
    const next = [...current, entry];
    const trimmed = next.length > MAX_LOG_ENTRIES ? next.slice(next.length - MAX_LOG_ENTRIES) : next;
    await setJson(AI_LOGS_KEY, trimmed);

    if (typeof entry.analysisId === 'number' && Number.isFinite(entry.analysisId)) {
      const store = await getJson<AIDebugLogsByAnalysis>(AI_LOGS_BY_ANALYSIS_KEY, initialByAnalysis);
      const id = Math.max(0, Math.floor(entry.analysisId));
      const key = String(id);
      const existing = store.byAnalysisId[key] ?? [];
      const updatedEntries = [...existing, entry];
      store.byAnalysisId[key] =
        updatedEntries.length > MAX_ANALYSIS_LOG_ENTRIES
          ? updatedEntries.slice(updatedEntries.length - MAX_ANALYSIS_LOG_ENTRIES)
          : updatedEntries;

      if (!store.order.includes(id)) {
        store.order = [...store.order, id];
      }
      if (store.order.length > MAX_ANALYSIS_GROUPS) {
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

export async function getAIDebugLogs(limit = 200): Promise<AIDebugEntry[]> {
  const logs = await getJson<AIDebugEntry[]>(AI_LOGS_KEY, []);
  return [...logs].slice(Math.max(0, logs.length - limit)).reverse();
}

export async function getAIDebugLogsByAnalysisId(
  analysisId: number,
  limit = 400
): Promise<AIDebugEntry[]> {
  const id = Math.max(0, Math.floor(analysisId));
  if (id <= 0) return [];
  const store = await getJson<AIDebugLogsByAnalysis>(AI_LOGS_BY_ANALYSIS_KEY, initialByAnalysis);
  const entries = store.byAnalysisId[String(id)] ?? [];
  return [...entries].slice(Math.max(0, entries.length - limit)).reverse();
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

export async function buildAIDebugReport(limit = 400): Promise<string> {
  const logs = await getAIDebugLogs(limit);
  return renderDebugReport(logs, 'Buddy AI debug report');
}

export async function buildAIDebugReportByAnalysisId(
  analysisId: number,
  limit = 600
): Promise<string> {
  const id = Math.max(0, Math.floor(analysisId));
  const logs = await getAIDebugLogsByAnalysisId(id, limit);
  return renderDebugReport(logs, `Buddy AI debug report | analysisId=${id}`);
}
