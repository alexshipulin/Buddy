#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  collectionGroup,
  documentId,
  getDocs,
  limit as qLimit,
  orderBy,
  query,
  setLogLevel,
  terminate,
  where,
} from 'firebase/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const localConfigFile = path.join(repoRoot, '.tmp', 'ai_debug_firestore_reader.json');

function printUsageAndExit(code = 1) {
  console.error(
    [
      'Usage:',
      '  node scripts/ai-debug-firestore-read-by-scan.mjs <analysisId> [--json] [--scope <scopeKey>] [--limit <n>]',
      '',
      'Examples:',
      '  npm run ai-debug:firestore-scan -- 49',
      '  npm run ai-debug:firestore-scan -- 49 --json',
      '  npm run ai-debug:firestore-scan -- 49 --scope device_device_1773738842039_x9tp9f',
    ].join('\n')
  );
  process.exit(code);
}

function parseArgs(argv) {
  if (!argv.length) printUsageAndExit(1);
  if (argv[0] === '--help' || argv[0] === '-h') {
    printUsageAndExit(0);
  }
  const analysisId = Number(argv[0]);
  if (!Number.isFinite(analysisId) || analysisId <= 0) {
    console.error(`Invalid analysisId: ${argv[0] ?? ''}`);
    printUsageAndExit(1);
  }

  let asJson = false;
  let scopeKey = null;
  let limit = 1500;

  for (let i = 1; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') {
      asJson = true;
      continue;
    }
    if (arg === '--scope') {
      scopeKey = argv[i + 1] ?? null;
      i += 1;
      continue;
    }
    if (arg === '--limit') {
      const raw = Number(argv[i + 1] ?? '');
      if (Number.isFinite(raw) && raw > 0) {
        limit = Math.max(1, Math.floor(raw));
      }
      i += 1;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      printUsageAndExit(0);
    }
  }

  return { analysisId: Math.floor(analysisId), asJson, scopeKey, limit };
}

function cleanEnvValue(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return '';
  const unwrapped =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
      ? trimmed.slice(1, -1)
      : trimmed;
  return unwrapped.trim();
}

function parseEnvText(raw) {
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const withoutExport = trimmed.startsWith('export ') ? trimmed.slice(7).trim() : trimmed;
    const idx = withoutExport.indexOf('=');
    if (idx <= 0) continue;
    const key = withoutExport.slice(0, idx).trim();
    const value = cleanEnvValue(withoutExport.slice(idx + 1));
    if (!key) continue;
    out[key] = value;
  }
  return out;
}

async function loadDotEnvFallback() {
  const files = [path.join(repoRoot, '.env'), path.join(repoRoot, '.env.local')];
  const merged = {};
  for (const file of files) {
    try {
      const raw = await fs.readFile(file, 'utf8');
      Object.assign(merged, parseEnvText(raw));
    } catch {
      // no-op
    }
  }
  return merged;
}

function valueFromEnv(name, fallback = {}) {
  return cleanEnvValue(process.env[name]) || cleanEnvValue(fallback[name]) || '';
}

function normalizeScopeKey(value) {
  const parsed = parseString(value);
  return parsed && parsed.startsWith('device_') ? parsed : null;
}

async function loadLocalConfig() {
  try {
    const raw = await fs.readFile(localConfigFile, 'utf8');
    const data = JSON.parse(raw);
    return {
      defaultScopeKey: normalizeScopeKey(data?.defaultScopeKey),
    };
  } catch {
    return { defaultScopeKey: null };
  }
}

async function saveLocalConfig(defaultScopeKey) {
  const payload = {
    defaultScopeKey,
    updatedAt: new Date().toISOString(),
  };
  await fs.mkdir(path.dirname(localConfigFile), { recursive: true });
  await fs.writeFile(localConfigFile, JSON.stringify(payload, null, 2), 'utf8');
}

function parseNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function parseString(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseLevel(value) {
  if (value === 'warn' || value === 'error' || value === 'info') return value;
  return 'info';
}

function extractScopeFromPath(refPath) {
  const parts = String(refPath || '').split('/');
  // ai_debug_logs/{scope}/analyses/{id}/entries/{entryId}
  if (parts.length >= 2 && parts[0] === 'ai_debug_logs') return parts[1] || null;
  return null;
}

function normalizeEntry(doc) {
  const data = doc.data() ?? {};
  return {
    id: parseString(data.id) ?? doc.id,
    createdAt: parseString(data.createdAt) ?? new Date(0).toISOString(),
    analysisId: parseNumber(data.analysisId),
    level: parseLevel(data.level),
    task: parseString(data.task) ?? 'unknown',
    stage: parseString(data.stage) ?? 'unknown',
    message: parseString(data.message) ?? '',
    sessionId: parseString(data.sessionId),
    model: parseString(data.model),
    status: parseNumber(data.status),
    durationMs: parseNumber(data.durationMs),
    details: data.details && typeof data.details === 'object' ? data.details : undefined,
    scopeKey: extractScopeFromPath(doc.ref?.path),
    docPath: doc.ref?.path ?? '',
  };
}

function sortEntries(entries) {
  return [...entries].sort((a, b) => {
    const aa = Date.parse(a.createdAt);
    const bb = Date.parse(b.createdAt);
    if (Number.isFinite(aa) && Number.isFinite(bb) && aa !== bb) return aa - bb;
    return String(a.id).localeCompare(String(b.id));
  });
}

function dedupeEntries(entries) {
  const byKey = new Map();
  for (const entry of entries) {
    const key = [
      entry.id ?? '',
      entry.createdAt ?? '',
      entry.task ?? '',
      entry.stage ?? '',
      entry.message ?? '',
    ].join('|');
    if (!byKey.has(key)) byKey.set(key, entry);
  }
  return [...byKey.values()];
}

function compactJson(value, maxLen = 1200) {
  try {
    const raw = JSON.stringify(value);
    if (!raw) return '';
    if (raw.length <= maxLen) return raw;
    return `${raw.slice(0, maxLen)}…[truncated ${raw.length - maxLen} chars]`;
  } catch {
    return '[unserializable]';
  }
}

function formatTextReport(params) {
  const { analysisId, entries } = params;
  const lines = [];
  const byScope = new Map();
  for (const entry of entries) {
    const key = entry.scopeKey ?? 'unknown_scope';
    byScope.set(key, (byScope.get(key) ?? 0) + 1);
  }

  lines.push(`Buddy Firestore AI logs | analysisId=${analysisId}`);
  lines.push(`Fetched: ${new Date().toISOString()}`);
  lines.push(`Entries: ${entries.length}`);
  lines.push(`Scopes: ${JSON.stringify(Object.fromEntries(byScope))}`);
  lines.push('');

  for (const e of entries) {
    lines.push(`${e.createdAt} | ${String(e.level).toUpperCase()} | ${e.task} | ${e.stage} | ${e.message}`);
    lines.push(
      `meta: scope=${e.scopeKey ?? '-'} model=${e.model ?? '-'} status=${e.status ?? '-'} durationMs=${e.durationMs ?? '-'} session=${e.sessionId ?? '-'} doc=${e.docPath}`
    );
    if (e.details && Object.keys(e.details).length) {
      lines.push(`details: ${compactJson(e.details, 1400)}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

async function fetchEntriesByScope(params) {
  const { db, analysisId, scopeKey, limit } = params;
  const q = query(
    collection(db, 'ai_debug_logs', scopeKey, 'analyses', String(analysisId), 'entries'),
    orderBy('createdAt', 'asc'),
    qLimit(limit)
  );
  const snap = await getDocs(q);
  return snap.docs;
}

async function fetchDeviceScopeKeys(db, maxScopes = 2000) {
  const q = query(
    collection(db, 'ai_debug_logs'),
    where(documentId(), '>=', 'device_'),
    where(documentId(), '<', 'device_~'),
    qLimit(maxScopes)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((doc) => String(doc.id || '').trim())
    .filter(Boolean);
}

async function fetchEntriesCrossScopeByPath(params) {
  const { db, analysisId, limit } = params;
  const scopeKeys = await fetchDeviceScopeKeys(db);
  if (!scopeKeys.length) return [];

  const perScopeLimit = Math.max(1, Math.ceil(limit / scopeKeys.length));
  const docsByScope = await Promise.all(
    scopeKeys.map((scopeKey) =>
      fetchEntriesByScope({
        db,
        analysisId,
        scopeKey,
        limit: perScopeLimit,
      }).catch(() => [])
    )
  );
  return docsByScope.flat();
}

async function fetchEntriesCrossScopeByField(params) {
  const { db, analysisId, limit } = params;
  const q = query(
    collectionGroup(db, 'entries'),
    where('analysisId', '==', analysisId),
    orderBy('createdAt', 'asc'),
    qLimit(limit)
  );
  const snap = await getDocs(q);
  return snap.docs;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const envFallback = await loadDotEnvFallback();
  setLogLevel('silent');

  const firebaseConfig = {
    apiKey: valueFromEnv('EXPO_PUBLIC_FIREBASE_API_KEY', envFallback),
    appId: valueFromEnv('EXPO_PUBLIC_FIREBASE_APP_ID', envFallback),
    projectId: valueFromEnv('EXPO_PUBLIC_FIREBASE_PROJECT_ID', envFallback),
    authDomain: valueFromEnv('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN', envFallback) || undefined,
    storageBucket: valueFromEnv('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET', envFallback) || undefined,
    messagingSenderId: valueFromEnv('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', envFallback) || undefined,
    measurementId: valueFromEnv('EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID', envFallback) || undefined,
  };

  if (!firebaseConfig.apiKey || !firebaseConfig.appId || !firebaseConfig.projectId) {
    console.error('Missing Firebase config. Set EXPO_PUBLIC_FIREBASE_API_KEY/APP_ID/PROJECT_ID (env or .env).');
    process.exit(2);
  }

  const localConfig = await loadLocalConfig();
  const defaultScopeFromEnv =
    normalizeScopeKey(valueFromEnv('AI_DEBUG_FIRESTORE_SCOPE', envFallback)) ??
    normalizeScopeKey(valueFromEnv('EXPO_PUBLIC_AI_DEBUG_FIRESTORE_SCOPE', envFallback));
  const resolvedScope = normalizeScopeKey(args.scopeKey) ?? defaultScopeFromEnv ?? localConfig.defaultScopeKey;

  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  const db = getFirestore(app);

  try {
    let docs = [];
    const fallbackErrors = [];
    if (resolvedScope) {
      docs = await fetchEntriesByScope({
        db,
        analysisId: args.analysisId,
        scopeKey: resolvedScope,
        limit: args.limit,
      });
      if (normalizeScopeKey(args.scopeKey) === resolvedScope) {
        await saveLocalConfig(resolvedScope);
      }
    } else {
      // Fast path: one query across all entries by field analysisId.
      // Fallback path: scan known device scopes by doc path.
      try {
        docs = await fetchEntriesCrossScopeByField({
          db,
          analysisId: args.analysisId,
          limit: args.limit,
        });
      } catch (error) {
        fallbackErrors.push(`field-query failed: ${error instanceof Error ? error.message : String(error)}`);
        docs = [];
      }

      if (!docs.length) {
        try {
          docs = await fetchEntriesCrossScopeByPath({
            db,
            analysisId: args.analysisId,
            limit: args.limit,
          });
        } catch (error) {
          fallbackErrors.push(`path-query failed: ${error instanceof Error ? error.message : String(error)}`);
          docs = [];
        }
      }

      if (!docs.length && fallbackErrors.length >= 2) {
        throw new Error(
          [
            `Unable to load Firestore logs for scan #${args.analysisId}.`,
            ...fallbackErrors,
            `Tip: run once with --scope device_xxx (it will be saved to ${path.relative(repoRoot, localConfigFile)}).`,
          ].join(' ')
        );
      }
    }

    const entries = sortEntries(dedupeEntries(docs.map(normalizeEntry)));

    if (args.asJson) {
      console.log(
        JSON.stringify(
          {
            analysisId: args.analysisId,
            entriesCount: entries.length,
            scopeHint: resolvedScope ?? null,
            entries,
          },
          null,
          2
        )
      );
      return;
    }

    console.log(formatTextReport({ analysisId: args.analysisId, entries }));
  } finally {
    try {
      await terminate(db);
    } catch {
      // no-op
    }
  }
}

main().catch((error) => {
  console.error(`[ai-debug-firestore-read-by-scan] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(3);
});
