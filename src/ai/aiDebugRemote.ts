import { getJson, setJson } from '../data/storage/storage';
import { createId } from '../utils/id';
import type { AIDebugEntry } from './aiDebugLog';

type FirebaseConfig = {
  apiKey: string;
  appId: string;
  projectId: string;
  authDomain?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  measurementId?: string;
};

type FirestoreModuleLike = {
  getFirestore: (app: unknown) => unknown;
  collection: (db: unknown, ...path: string[]) => unknown;
  doc: (db: unknown, ...path: string[]) => unknown;
  setDoc: (ref: unknown, data: Record<string, unknown>, options?: { merge?: boolean }) => Promise<void>;
  query: (...constraints: unknown[]) => unknown;
  orderBy: (fieldPath: string, direction?: 'asc' | 'desc') => unknown;
  limit: (limit: number) => unknown;
  getDocs: (query: unknown) => Promise<{ docs: Array<{ id: string; data: () => Record<string, unknown> }> }>;
};

type FirebaseAppModuleLike = {
  getApps: () => unknown[];
  getApp: () => unknown;
  initializeApp: (options: FirebaseConfig) => unknown;
};

type FirebaseAuthModuleLike = {
  getAuth: (app?: unknown) => { currentUser?: { uid?: string | null } | null };
};

type FirestoreContext = {
  db: unknown;
  firestore: FirestoreModuleLike;
  auth: { currentUser?: { uid?: string | null } | null } | null;
};

const USER_AUTH_KEY = 'buddy_user_auth_state';
const DEVICE_SCOPE_KEY = 'buddy_ai_debug_remote_scope_v1';
const REMOTE_MAX_FETCH_LIMIT = 3000;
const REMOTE_FAIL_DISABLE_MS = 2 * 60 * 1000;

let firestoreContextCache: FirestoreContext | null | undefined;
let consecutiveWriteFailures = 0;
let remoteDisabledUntilTs = 0;

function getFirebaseConfig(): FirebaseConfig | null {
  const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY?.trim();
  const appId = process.env.EXPO_PUBLIC_FIREBASE_APP_ID?.trim();
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  if (!apiKey || !appId || !projectId) return null;

  const config: FirebaseConfig = { apiKey, appId, projectId };
  const authDomain = process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim();
  const storageBucket = process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim();
  const messagingSenderId = process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim();
  const measurementId = process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID?.trim();
  if (authDomain) config.authDomain = authDomain;
  if (storageBucket) config.storageBucket = storageBucket;
  if (messagingSenderId) config.messagingSenderId = messagingSenderId;
  if (measurementId) config.measurementId = measurementId;
  return config;
}

function isRemoteEnabledByEnv(): boolean {
  const raw = process.env.EXPO_PUBLIC_AI_DEBUG_FIREBASE_SYNC?.trim().toLowerCase();
  if (!raw) return true;
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
}

export function isRemoteAIDebugEnabled(): boolean {
  return isRemoteEnabledByEnv() && Boolean(getFirebaseConfig());
}

function getFirestoreContext(): FirestoreContext | null {
  if (firestoreContextCache !== undefined) return firestoreContextCache;
  if (!isRemoteAIDebugEnabled()) {
    firestoreContextCache = null;
    return firestoreContextCache;
  }

  const config = getFirebaseConfig();
  if (!config) {
    firestoreContextCache = null;
    return firestoreContextCache;
  }

  try {
    const appModule = require('firebase/app') as FirebaseAppModuleLike;
    const firestore = require('firebase/firestore') as FirestoreModuleLike;
    const authModule = require('firebase/auth') as FirebaseAuthModuleLike;
    const app = appModule.getApps().length > 0 ? appModule.getApp() : appModule.initializeApp(config);
    firestoreContextCache = {
      db: firestore.getFirestore(app),
      firestore,
      auth: typeof authModule.getAuth === 'function' ? authModule.getAuth(app) : null,
    };
    return firestoreContextCache;
  } catch {
    firestoreContextCache = null;
    return firestoreContextCache;
  }
}

function parseNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return undefined;
}

function parseString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function parseLevel(value: unknown): AIDebugEntry['level'] {
  if (value === 'warn' || value === 'error' || value === 'info') return value;
  return 'info';
}

function pruneUndefinedDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .map((item) => pruneUndefinedDeep(item))
      .filter((item) => item !== undefined);
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const normalized = pruneUndefinedDeep(v);
      if (normalized !== undefined) out[k] = normalized;
    }
    return out;
  }
  if (typeof value === 'number' && !Number.isFinite(value)) return null;
  if (value === undefined) return undefined;
  return value;
}

function serializeForFirestore(entry: AIDebugEntry): Record<string, unknown> {
  return {
    id: entry.id,
    createdAt: entry.createdAt,
    analysisId: typeof entry.analysisId === 'number' ? entry.analysisId : null,
    level: entry.level,
    task: entry.task,
    stage: entry.stage,
    message: entry.message,
    sessionId: entry.sessionId ?? null,
    model: entry.model ?? null,
    status: typeof entry.status === 'number' ? entry.status : null,
    durationMs: typeof entry.durationMs === 'number' ? entry.durationMs : null,
    details: pruneUndefinedDeep(entry.details ?? null) ?? null,
    syncedAt: new Date().toISOString(),
  };
}

function deserializeFromFirestore(docId: string, data: Record<string, unknown>): AIDebugEntry {
  return {
    id: parseString(data.id) ?? docId,
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
    details:
      data.details && typeof data.details === 'object'
        ? (data.details as Record<string, unknown>)
        : undefined,
  };
}

async function getDeviceScopeId(): Promise<string> {
  const existing = await getJson<string>(DEVICE_SCOPE_KEY, '');
  if (typeof existing === 'string' && existing.trim()) return existing.trim();
  const generated = createId('device').replace(/[^a-zA-Z0-9_-]/g, '');
  await setJson(DEVICE_SCOPE_KEY, generated);
  return generated;
}

async function resolveScopeKeys(authUid?: string | null): Promise<string[]> {
  const keys = new Set<string>();
  if (authUid && authUid.trim()) keys.add(`uid_${authUid.trim()}`);

  const storedAuth = await getJson<{ identifier?: string } | null>(USER_AUTH_KEY, null);
  const identifier = storedAuth?.identifier?.trim();
  if (identifier) keys.add(`id_${identifier}`);

  const device = await getDeviceScopeId();
  if (device) keys.add(`device_${device}`);
  return [...keys];
}

function stableSortByCreatedAtDesc(entries: AIDebugEntry[]): AIDebugEntry[] {
  return [...entries].sort((a, b) => {
    const aa = Date.parse(a.createdAt);
    const bb = Date.parse(b.createdAt);
    if (Number.isFinite(aa) && Number.isFinite(bb) && aa !== bb) return bb - aa;
    return b.id.localeCompare(a.id);
  });
}

export async function pushRemoteAIDebugEntry(entry: AIDebugEntry): Promise<void> {
  const context = getFirestoreContext();
  if (!context) return;
  if (Date.now() < remoteDisabledUntilTs) return;

  try {
    const authUid = context.auth?.currentUser?.uid ?? null;
    const scopeKeys = await resolveScopeKeys(authUid);
    if (scopeKeys.length === 0) return;

    for (const scopeKey of scopeKeys) {
      const ref = context.firestore.doc(
        context.db,
        'ai_debug_logs',
        scopeKey,
        'analyses',
        String(entry.analysisId ?? 0),
        'entries',
        entry.id
      );
      await context.firestore.setDoc(ref, serializeForFirestore(entry), { merge: true });
    }
    consecutiveWriteFailures = 0;
  } catch {
    consecutiveWriteFailures += 1;
    if (consecutiveWriteFailures >= 3) {
      remoteDisabledUntilTs = Date.now() + REMOTE_FAIL_DISABLE_MS;
      consecutiveWriteFailures = 0;
    }
  }
}

export async function fetchRemoteAIDebugLogsByAnalysisId(
  analysisId: number,
  limit?: number
): Promise<AIDebugEntry[]> {
  const context = getFirestoreContext();
  const id = Math.max(0, Math.floor(analysisId));
  if (!context || id <= 0) return [];
  if (Date.now() < remoteDisabledUntilTs) return [];

  try {
    const authUid = context.auth?.currentUser?.uid ?? null;
    const scopeKeys = await resolveScopeKeys(authUid);
    if (scopeKeys.length === 0) return [];

    const perScopeLimit = Math.max(
      1,
      Math.min(
        REMOTE_MAX_FETCH_LIMIT,
        Math.ceil(
          (typeof limit === 'number' && Number.isFinite(limit) ? Math.max(1, limit) : REMOTE_MAX_FETCH_LIMIT) /
            Math.max(1, scopeKeys.length)
        )
      )
    );

    const combinedById = new Map<string, AIDebugEntry>();
    for (const scopeKey of scopeKeys) {
      const colRef = context.firestore.collection(
        context.db,
        'ai_debug_logs',
        scopeKey,
        'analyses',
        String(id),
        'entries'
      );
      const q = context.firestore.query(
        colRef,
        context.firestore.orderBy('createdAt', 'desc'),
        context.firestore.limit(perScopeLimit)
      );
      const snap = await context.firestore.getDocs(q);
      for (const doc of snap.docs) {
        combinedById.set(doc.id, deserializeFromFirestore(doc.id, doc.data()));
      }
    }

    const sorted = stableSortByCreatedAtDesc([...combinedById.values()]);
    if (typeof limit === 'number' && Number.isFinite(limit) && limit > 0) {
      return sorted.slice(0, Math.floor(limit));
    }
    return sorted;
  } catch {
    return [];
  }
}
