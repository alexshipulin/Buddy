import { getJson, setJson } from '../data/storage/storage';
import { createId } from '../utils/id';

const AI_LOGS_KEY = 'buddy_ai_debug_logs_v1';
const MAX_LOG_ENTRIES = 500;

export type AIDebugLevel = 'info' | 'warn' | 'error';

export type AIDebugEntry = {
  id: string;
  createdAt: string;
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

let writeQueue: Promise<void> = Promise.resolve();

function enqueueWrite(op: () => Promise<void>): void {
  writeQueue = writeQueue
    .then(op)
    .catch(() => {
      // Keep logging best-effort: never crash app flow because of diagnostics.
    });
}

export function logAIDebug(input: Omit<AIDebugEntry, 'id' | 'createdAt'>): void {
  const entry: AIDebugEntry = {
    id: createId('ai_log'),
    createdAt: new Date().toISOString(),
    ...input,
  };

  if (__DEV__) {
    const prefix = `[AI:${entry.task}]`;
    const meta: Record<string, unknown> = {
      stage: entry.stage,
      sessionId: entry.sessionId,
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
  });
}

export async function getAIDebugLogs(limit = 200): Promise<AIDebugEntry[]> {
  const logs = await getJson<AIDebugEntry[]>(AI_LOGS_KEY, []);
  return [...logs].slice(Math.max(0, logs.length - limit)).reverse();
}

export async function clearAIDebugLogs(): Promise<void> {
  await setJson(AI_LOGS_KEY, []);
}

export async function buildAIDebugReport(limit = 400): Promise<string> {
  const logs = await getAIDebugLogs(limit);
  const lines: string[] = [];
  lines.push(`Buddy AI debug report`);
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
    if (log.sessionId || log.model || log.status != null || log.durationMs != null) {
      lines.push(
        `meta: session=${log.sessionId ?? '-'} model=${log.model ?? '-'} status=${log.status ?? '-'} durationMs=${log.durationMs ?? '-'}`
      );
    }
    if (log.details && Object.keys(log.details).length) {
      lines.push(`details: ${JSON.stringify(log.details)}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}
