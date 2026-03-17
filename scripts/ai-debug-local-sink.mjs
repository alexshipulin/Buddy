#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const port = Number(process.env.AI_DEBUG_SINK_PORT ?? 8787);
const sinkRoot = path.resolve(
  process.env.AI_DEBUG_SINK_DIR ?? path.join(repoRoot, '.tmp', 'ai_debug_local_sink')
);
const analysesDir = path.join(sinkRoot, 'analyses');
const allEntriesFile = path.join(sinkRoot, 'all_entries.jsonl');

function normalizeAnalysisId(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function normalizeEntry(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const input = raw;
  const entry = {
    id: typeof input.id === 'string' && input.id.trim() ? input.id.trim() : `sink_${Date.now()}`,
    createdAt:
      typeof input.createdAt === 'string' && input.createdAt.trim()
        ? input.createdAt.trim()
        : new Date().toISOString(),
    analysisId: normalizeAnalysisId(input.analysisId),
    level:
      input.level === 'warn' || input.level === 'error' || input.level === 'info'
        ? input.level
        : 'info',
    task: typeof input.task === 'string' ? input.task : 'unknown',
    stage: typeof input.stage === 'string' ? input.stage : 'unknown',
    message: typeof input.message === 'string' ? input.message : '',
    sessionId: typeof input.sessionId === 'string' ? input.sessionId : undefined,
    model: typeof input.model === 'string' ? input.model : undefined,
    status: typeof input.status === 'number' && Number.isFinite(input.status) ? input.status : undefined,
    durationMs:
      typeof input.durationMs === 'number' && Number.isFinite(input.durationMs)
        ? input.durationMs
        : undefined,
    details: input.details && typeof input.details === 'object' && !Array.isArray(input.details)
      ? input.details
      : undefined,
  };
  return entry;
}

async function ensureSinkDirs() {
  await fs.mkdir(analysesDir, { recursive: true });
}

async function appendJsonLine(filePath, payload) {
  await fs.appendFile(filePath, `${JSON.stringify(payload)}\n`, 'utf8');
}

async function persistEntries(entries) {
  if (!entries.length) return;
  await ensureSinkDirs();
  for (const entry of entries) {
    await appendJsonLine(allEntriesFile, entry);
    if (entry.analysisId > 0) {
      const perAnalysisPath = path.join(analysesDir, `${entry.analysisId}.jsonl`);
      await appendJsonLine(perAnalysisPath, entry);
    }
  }
}

async function loadEntriesByAnalysisId(analysisId) {
  const id = normalizeAnalysisId(analysisId);
  if (id <= 0) return [];
  const filePath = path.join(analysesDir, `${id}.jsonl`);
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return raw
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => {
      chunks.push(chunk);
      const size = chunks.reduce((acc, c) => acc + c.length, 0);
      if (size > 5 * 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('error', reject);
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
  });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  const method = req.method ?? 'GET';
  const url = req.url ?? '/';

  if (method === 'GET' && url === '/health') {
    sendJson(res, 200, { ok: true, sinkRoot });
    return;
  }

  if (method === 'GET' && url.startsWith('/analysis/')) {
    const idText = url.replace('/analysis/', '').split('?')[0];
    const id = Number(idText);
    const entries = await loadEntriesByAnalysisId(id);
    sendJson(res, 200, { analysisId: normalizeAnalysisId(id), entriesCount: entries.length, entries });
    return;
  }

  if (method === 'POST' && url === '/ingest') {
    try {
      const payload = await parseJsonBody(req);
      const inputEntries = Array.isArray(payload?.entries)
        ? payload.entries
        : payload?.entry
          ? [payload.entry]
          : [];
      const entries = inputEntries.map(normalizeEntry).filter(Boolean);
      await persistEntries(entries);
      sendJson(res, 200, { ok: true, accepted: entries.length });
      return;
    } catch (error) {
      sendJson(res, 400, { ok: false, error: error instanceof Error ? error.message : 'invalid_payload' });
      return;
    }
  }

  sendJson(res, 404, { ok: false, error: 'not_found' });
});

server.listen(port, '127.0.0.1', async () => {
  await ensureSinkDirs();
  console.log(
    `[ai-debug-local-sink] listening on http://127.0.0.1:${port} | sinkRoot=${sinkRoot}`
  );
});
