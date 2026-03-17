import { MenuScanResult } from '../domain/models';
import { createId } from '../utils/id';
import * as FileSystem from 'expo-file-system/legacy';
import { Image as RNImage } from 'react-native';
import { getApiKey, runWithFallback, sanitizeJsonText } from '../ai/geminiClient';
import { withInflight } from '../ai/inflight';
import { getCached, hashCacheKey, setCache, TTL_24H } from '../ai/aiCache';
import { logAIDebug } from '../ai/aiDebugLog';
import { nextAnalysisRunId } from '../ai/analysisRunId';

// ── Mocks ─────────────────────────────────────────────────────────────────────

function createMockMenuResult(): MenuScanResult {
  return {
    id: createId('scan'),
    createdAt: new Date().toISOString(),
    inputImages: [],
    topPicks: [
      { name: 'Grilled salmon with greens', shortReason: 'High protein and healthy fats.', pins: ['High protein', 'Lean protein', 'Healthy fats'], confidencePercent: 88, dietBadges: [], allergenNote: null, noLine: null },
      { name: 'Chicken salad', shortReason: 'Lean protein with fiber-rich vegetables.', pins: ['High protein', 'Low calorie', 'High fiber'], confidencePercent: 85, dietBadges: [], allergenNote: null, noLine: null },
    ],
    caution: [
      { name: 'Teriyaki chicken', shortReason: 'Protein is good, but sauce can add sugar.', pins: [], riskPins: ['High Sugar', 'High Sodium'], quickFix: 'Try: sauce on the side', confidencePercent: 65, dietBadges: [], allergenNote: null, noLine: null },
    ],
    avoid: [
      { name: 'Deep-fried combo platter', shortReason: 'Very high energy density.', pins: [], riskPins: ['Deep-fried', 'High calories'], confidencePercent: 90, dietBadges: [], allergenNote: null, noLine: null },
    ],
    summaryText: 'Buddy analyzed your menu. Add your API key for AI-powered recommendations.',
    disclaimerFlag: true,
  };
}

function createMockChatResponse(): string {
  return 'I can help you with meal planning! Add your Gemini API key to enable AI-powered responses.';
}

const AI_IMAGE_MAX_SIDE = 1280;
const AI_IMAGE_JPEG_QUALITY = 0.72;
const MEAL_AI_IMAGE_MAX_SIDE = 960;
const MEAL_AI_IMAGE_JPEG_QUALITY = 0.62;

type ImagePayload = { base64: string | null; mimeType: string; optimized: boolean };
type ImageOptimizationOptions = { maxSide?: number; jpegQuality?: number };

type ImageManipulatorModule = {
  manipulateAsync?: (
    uri: string,
    actions: Array<{ resize: { width?: number; height?: number } }>,
    saveOptions: { compress?: number; format?: string; base64?: boolean }
  ) => Promise<{ uri: string; base64?: string | null }>;
  SaveFormat?: { JPEG?: string };
};

function detectMimeType(uri: string): string {
  const normalizedUri = uri.toLowerCase();
  if (normalizedUri.endsWith('.png')) return 'image/png';
  if (normalizedUri.endsWith('.jpg') || normalizedUri.endsWith('.jpeg')) return 'image/jpeg';
  if (normalizedUri.endsWith('.webp')) return 'image/webp';
  if (normalizedUri.endsWith('.heic') || normalizedUri.endsWith('.heif')) return 'image/heic';
  return 'image/jpeg';
}

async function getImageSize(uri: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    RNImage.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      () => resolve(null)
    );
  });
}

// ── uriToBase64 (public, unchanged) ───────────────────────────────────────────

export async function uriToBase64(uri: string): Promise<string | null> {
  if (uri.startsWith('data:')) {
    return uri.split(',')[1] || null;
  }
  if (uri.startsWith('file://')) {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      return base64;
    } catch {
      return null;
    }
  }
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string)?.split(',')[1];
          resolve(base64 || null);
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }
  return uri;
}

export async function prepareImagePayloadForAI(
  uri: string,
  options?: ImageOptimizationOptions
): Promise<ImagePayload> {
  const originalMimeType = detectMimeType(uri);
  const maxSide = Math.max(480, Math.round(options?.maxSide ?? AI_IMAGE_MAX_SIDE));
  const jpegQuality = Math.max(0.3, Math.min(0.95, options?.jpegQuality ?? AI_IMAGE_JPEG_QUALITY));

  if (uri.startsWith('data:')) {
    return { base64: uri.split(',')[1] || null, mimeType: originalMimeType, optimized: false };
  }

  let imageManipulator: ImageManipulatorModule | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    imageManipulator = require('expo-image-manipulator') as ImageManipulatorModule;
  } catch {
    imageManipulator = null;
  }

  if (imageManipulator?.manipulateAsync) {
    try {
      const actions: Array<{ resize: { width?: number; height?: number } }> = [];
      const size = await getImageSize(uri);
      if (size) {
        const { width, height } = size;
        const longestSide = Math.max(width, height);
        if (longestSide > maxSide) {
          const scale = maxSide / longestSide;
          actions.push({
            resize: {
              width: Math.max(1, Math.round(width * scale)),
              height: Math.max(1, Math.round(height * scale)),
            },
          });
        }
      }

      const optimized = await imageManipulator.manipulateAsync(uri, actions, {
        compress: jpegQuality,
        format: imageManipulator.SaveFormat?.JPEG ?? 'jpeg',
        base64: true,
      });

      const optimizedBase64 = optimized.base64 ?? (await uriToBase64(optimized.uri));
      if (optimizedBase64) {
        return { base64: optimizedBase64, mimeType: 'image/jpeg', optimized: true };
      }
    } catch {
      // fall through to raw fallback
    }
  }

  return {
    base64: await uriToBase64(uri),
    mimeType: originalMimeType,
    optimized: false,
  };
}

// ── Legacy analyzeMenu (kept for backwards compat, not used by scan flow) ─────

function parseMenuAnalysis(text: string, images: string[]): MenuScanResult {
  try {
    const parsed = JSON.parse(text) as Partial<MenuScanResult>;
    return {
      id: createId('scan'),
      createdAt: new Date().toISOString(),
      inputImages: images,
      topPicks: parsed.topPicks || [],
      caution: parsed.caution || [],
      avoid: parsed.avoid || [],
      summaryText: parsed.summaryText || 'Menu analysis complete.',
      disclaimerFlag: true,
    };
  } catch {
    return createMockMenuResult();
  }
}

export async function analyzeMenu(input: string | string[] | { base64: string; mimeType: string }): Promise<MenuScanResult> {
  const apiKey = getApiKey();
  if (!apiKey) return createMockMenuResult();

  try {
    let base64Image: string | null = null;
    let mimeType = 'image/jpeg';
    let imageUris: string[] = [];

    if (typeof input === 'object' && 'base64' in input) {
      base64Image = input.base64;
      mimeType = input.mimeType;
      imageUris = [];
    } else {
      const images = Array.isArray(input) ? input : [input];
      imageUris = images;
      const firstImage = images[0];
      if (!firstImage) return createMockMenuResult();
      const prepared = await prepareImagePayloadForAI(firstImage);
      base64Image = prepared.base64;
      mimeType = prepared.mimeType;
      if (!base64Image) return createMockMenuResult();
    }

    const prompt = `Analyze this menu image and return JSON with:
{
  "topPicks": [{"name": "...", "reasonShort": "...", "tags": [...]}],
  "caution": [{"name": "...", "reasonShort": "...", "tags": [...]}],
  "avoid": [{"name": "...", "reasonShort": "...", "tags": [...]}],
  "summaryText": "..."
}`;

    const body = {
      contents: [{
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data: base64Image } },
        ],
      }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
    };

    const { rawText } = await runWithFallback({ taskType: 'legacy_menu', apiKey, body });
    return parseMenuAnalysis(rawText, imageUris);
  } catch {
    return createMockMenuResult();
  }
}

// ── Meal analysis (photo + text) ──────────────────────────────────────────────

const MEAL_ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    shortReason: { type: 'string' },
    caloriesKcal: { type: 'number' },
    proteinG: { type: 'number' },
    carbsG: { type: 'number' },
    fatG: { type: 'number' },
    pins: { type: 'array', items: { type: 'string' } },
    riskPins: { type: 'array', items: { type: 'string' } },
    dietBadges: { type: 'array', items: { type: 'string' } },
    confidencePercent: { type: 'number' },
    allergenNote: { type: 'string' },
    noLine: { type: 'string' },
    menuSection: { type: 'string' },
  },
  required: [
    'title',
    'shortReason',
    'caloriesKcal',
    'proteinG',
    'carbsG',
    'fatG',
    'confidencePercent',
  ],
} as const;

const MEAL_DEFAULTS = { caloriesKcal: 450, proteinG: 30, carbsG: 40, fatG: 15 };

export type MealAnalysisResult = {
  analysisId?: number;
  title: string;
  shortReason: string;
  macros: { caloriesKcal: number; proteinG: number; carbsG: number; fatG: number };
  pins: string[];
  riskPins?: string[];
  dietBadges: string[];
  confidencePercent: number;
  allergenNote: string | null;
  noLine: string | null;
  menuSection: 'top' | 'caution' | 'avoid';
};

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function normalizeUniqueTextList(value: unknown, maxItems: number): string[] {
  if (!Array.isArray(value)) return [];
  const result: string[] = [];
  const seen = new Set<string>();
  value.forEach((entry) => {
    if (typeof entry !== 'string') return;
    const trimmed = entry.trim();
    if (!trimmed) return;
    const key = trimmed.toLocaleLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push(trimmed);
  });
  return result.slice(0, maxItems);
}

function derivePinsFromMacros(macros: { caloriesKcal: number; proteinG: number; carbsG: number; fatG: number }): {
  pins: string[];
  riskPins: string[];
  menuSection: 'top' | 'caution' | 'avoid';
} {
  const pins: string[] = [];
  const riskPins: string[] = [];

  if (macros.proteinG >= 35) pins.push('High protein');
  if (macros.caloriesKcal <= 650) pins.push('Portion-aware');
  if (macros.fatG <= 22) pins.push('Lower fat');
  if (macros.carbsG <= 45) pins.push('Balanced');

  if (macros.caloriesKcal >= 900) riskPins.push('High calories');
  if (macros.fatG >= 38) riskPins.push('High fat');
  if (macros.carbsG >= 75) riskPins.push('High carbs');
  if (macros.proteinG < 20) riskPins.push('Low protein');

  const menuSection: 'top' | 'caution' | 'avoid' =
    riskPins.length >= 3 ? 'avoid' : riskPins.length >= 1 ? 'caution' : 'top';

  return { pins: pins.slice(0, 4), riskPins: riskPins.slice(0, 3), menuSection };
}

function fallbackTitleFromText(input: string, source: 'photo' | 'text'): string {
  const normalized = input.toLocaleLowerCase();
  const has = (token: string): boolean => normalized.includes(token);
  if (has('pasta') && has('chicken')) return 'Pasta with chicken';
  if (has('pasta')) return 'Pasta';
  if (has('bowl')) return 'Bowl';
  if (has('salad')) return 'Salad bowl';
  if (has('soup')) return 'Soup';
  if (has('rice') && has('chicken')) return 'Rice with chicken';
  if (has('rice')) return 'Rice bowl';
  if (has('fish') || has('salmon') || has('tuna')) return 'Fish bowl';
  if (has('omelet') || has('egg')) return 'Egg plate';
  if (source === 'photo') return 'Meal bowl';
  return 'Meal';
}

function fallbackShortReasonFromMacros(macros: {
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}): string {
  if (macros.proteinG >= 35 && macros.caloriesKcal <= 700) {
    return 'Protein-forward meal with balanced calories for your daily plan.';
  }
  if (macros.caloriesKcal >= 900 || macros.fatG >= 38 || macros.carbsG >= 75) {
    return 'Energy-dense option, so keep later meals lighter and higher in protein.';
  }
  return 'Balanced meal estimate aligned to your current daily targets.';
}

function normalizeNullableText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isAbortError(error: unknown): boolean {
  const domExceptionCtor: unknown =
    typeof globalThis !== 'undefined' && 'DOMException' in globalThis
      ? (globalThis as Record<string, unknown>).DOMException
      : undefined;
  const isDomAbort =
    typeof domExceptionCtor === 'function' &&
    error instanceof (domExceptionCtor as typeof Error) &&
    (error as Error).name === 'AbortError';
  if (isDomAbort) return true;
  if (error instanceof Error && error.name === 'AbortError') return true;
  return false;
}

function autoCloseLikelyTruncatedJson(sanitized: string): string | null {
  const firstBrace = sanitized.indexOf('{');
  if (firstBrace < 0) return null;

  let candidate = sanitized.slice(firstBrace).trim();
  if (!candidate) return null;

  let inString = false;
  let escaped = false;
  const stack: Array<'{' | '['> = [];

  for (let i = 0; i < candidate.length; i += 1) {
    const ch = candidate[i];
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{' || ch === '[') {
      stack.push(ch);
      continue;
    }
    if (ch === '}' || ch === ']') {
      const open = stack.pop();
      if (!open) return null;
      if ((open === '{' && ch !== '}') || (open === '[' && ch !== ']')) return null;
    }
  }

  candidate = candidate.trimEnd().replace(/[,:]\s*$/g, '');
  if (!candidate) return null;
  if (inString) candidate += '"';
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    candidate += stack[i] === '{' ? '}' : ']';
  }
  return candidate;
}

function parseJsonWithRecovery(rawText: string): { parsed: Record<string, unknown>; strategy: string } | null {
  const seen = new Set<string>();
  const candidates: Array<{ strategy: string; text: string }> = [];

  const sanitized = sanitizeJsonText(rawText);
  candidates.push({ strategy: 'direct', text: sanitized });

  const firstBrace = sanitized.indexOf('{');
  const lastBrace = sanitized.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const bounded = sanitized.slice(firstBrace, lastBrace + 1).trim();
    if (bounded) candidates.push({ strategy: 'bounded_json', text: bounded });
    const noTrailingCommas = bounded.replace(/,\s*([}\]])/g, '$1');
    if (noTrailingCommas) candidates.push({ strategy: 'drop_trailing_commas', text: noTrailingCommas });
  }

  const autoClosed = autoCloseLikelyTruncatedJson(sanitized);
  if (autoClosed) {
    candidates.push({ strategy: 'auto_close_truncated', text: autoClosed });
    candidates.push({
      strategy: 'auto_close_truncated_no_trailing_commas',
      text: autoClosed.replace(/,\s*([}\]])/g, '$1'),
    });
  }

  for (const candidate of candidates) {
    const text = candidate.text.trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      return { parsed, strategy: candidate.strategy };
    } catch {
      // try next strategy
    }
  }

  return null;
}

function normalizeMealAnalysis(
  parsed: Record<string, unknown>,
  params: { fallbackSeed: string; source: 'photo' | 'text' }
): MealAnalysisResult {
  const macros = {
    caloriesKcal: clampNumber(parsed.caloriesKcal, MEAL_DEFAULTS.caloriesKcal, 80, 2500),
    proteinG: clampNumber(parsed.proteinG, MEAL_DEFAULTS.proteinG, 0, 200),
    carbsG: clampNumber(parsed.carbsG, MEAL_DEFAULTS.carbsG, 0, 350),
    fatG: clampNumber(parsed.fatG, MEAL_DEFAULTS.fatG, 0, 180),
  };

  const derived = derivePinsFromMacros(macros);
  const aiPins = normalizeUniqueTextList(parsed.pins, 4);
  const aiRiskPins = normalizeUniqueTextList(parsed.riskPins, 3);
  const aiDietBadges = normalizeUniqueTextList(parsed.dietBadges, 3);

  const rawSection = typeof parsed.menuSection === 'string' ? parsed.menuSection.trim().toLocaleLowerCase() : '';
  let menuSection: 'top' | 'caution' | 'avoid' =
    rawSection === 'top' || rawSection === 'caution' || rawSection === 'avoid'
      ? rawSection
      : derived.menuSection;

  let pins = aiPins.length > 0 ? aiPins : derived.pins;
  let riskPins = aiRiskPins.length > 0 ? aiRiskPins : (menuSection === 'top' ? [] : derived.riskPins);

  if (menuSection === 'top' && riskPins.length > 0) {
    menuSection = riskPins.length >= 3 ? 'avoid' : 'caution';
  }
  if (menuSection !== 'top' && riskPins.length === 0) {
    riskPins = derived.riskPins;
    if (riskPins.length === 0) menuSection = 'top';
  }
  if (pins.length === 0) pins = ['Balanced'];

  const rawTitle = typeof parsed.title === 'string' ? parsed.title.trim() : '';
  const title = (rawTitle || fallbackTitleFromText(params.fallbackSeed, params.source)).slice(0, 48);

  const rawShortReason = typeof parsed.shortReason === 'string' ? parsed.shortReason.trim() : '';
  const shortReason = (rawShortReason || fallbackShortReasonFromMacros(macros)).slice(0, 140);

  const confidencePercent = clampNumber(parsed.confidencePercent, 72, 1, 100);

  return {
    title,
    shortReason,
    macros,
    pins,
    riskPins: riskPins.length > 0 ? riskPins : undefined,
    dietBadges: aiDietBadges,
    confidencePercent,
    allergenNote: normalizeNullableText(parsed.allergenNote),
    noLine: normalizeNullableText(parsed.noLine),
    menuSection,
  };
}

function createFallbackMealAnalysis(params: {
  source: 'photo' | 'text';
  analysisId?: number;
  fallbackSeed: string;
  reasonSuffix: string;
}): MealAnalysisResult {
  const macros = { ...MEAL_DEFAULTS };
  const derived = derivePinsFromMacros(macros);
  return {
    analysisId: params.analysisId,
    title: fallbackTitleFromText(params.fallbackSeed, params.source),
    shortReason: `Estimated meal analysis. ${params.reasonSuffix}`,
    macros,
    pins: derived.pins.length > 0 ? derived.pins : ['Balanced'],
    riskPins: derived.riskPins.length > 0 ? derived.riskPins : undefined,
    dietBadges: [],
    confidencePercent: 55,
    allergenNote: null,
    noLine: null,
    menuSection: derived.menuSection,
  };
}

function buildMealPrompt(source: 'photo' | 'text', textInput?: string): string {
  const task =
    source === 'photo'
      ? 'Analyze this meal photo.'
      : `Analyze this meal description: "${textInput ?? ''}"`;
  return [
    'Return ONLY valid JSON. No markdown. No extra text.',
    task,
    'Generate concise meal output for mobile UI.',
    '- title: short dish title (1-4 words), e.g. "Bowl", "Pasta with chicken".',
    '- shortReason: one sentence, max 85 chars.',
    '- caloriesKcal/proteinG/carbsG/fatG: numeric estimates.',
    '- confidencePercent: 1..100.',
    '- Optional: pins, riskPins, dietBadges, allergenNote, noLine, menuSection.',
  ].join('\n');
}

async function analyzeMealWithAI(params: {
  source: 'photo' | 'text';
  sessionId: string;
  analysisId?: number;
  signal?: AbortSignal;
  imagePayload?: { base64: string; mimeType: string };
  textInput?: string;
  cacheKey: string;
  startedAt: number;
  apiKey: string;
}): Promise<MealAnalysisResult> {
  const cached = await getCached<MealAnalysisResult>(params.cacheKey);
  if (cached) {
    logAIDebug({
      level: 'info',
      task: params.source === 'photo' ? 'meal_photo' : 'meal_text',
      stage: `${params.source}.cache_hit`,
      message: 'Returning cached meal analysis',
      sessionId: params.sessionId,
      durationMs: Date.now() - params.startedAt,
    });
    return { ...cached, analysisId: params.analysisId };
  }

  const prompt = buildMealPrompt(params.source, params.textInput);
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [{ text: prompt }];
  if (params.imagePayload) {
    parts.push({ inlineData: { mimeType: params.imagePayload.mimeType, data: params.imagePayload.base64 } });
  }

  const PRIMARY_MODEL = process.env.EXPO_PUBLIC_GEMINI_MODEL ?? 'gemini-2.5-flash';
  const baseOutputTokens = 280;
  const structuredBody = {
    contents: [{ parts }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: MEAL_ANALYSIS_SCHEMA,
      temperature: 0.2,
      maxOutputTokens: baseOutputTokens,
    },
  };

  const buildPlainBody = (): object => ({
    contents: [{ parts }],
    generationConfig: { temperature: 0.2, maxOutputTokens: baseOutputTokens },
  });

  let usedModel = '';
  let rawOutput = '';
  const runResult = await runWithFallback({
    taskType: params.source === 'photo' ? 'meal_photo' : 'meal_text',
    apiKey: params.apiKey,
    body: structuredBody,
    signal: params.signal,
    debugSessionId: params.sessionId,
    debugAnalysisId: params.analysisId,
    debugMeta: { stage: params.source },
    supportsPlainFallback: true,
    buildPlainBody,
  });
  rawOutput = runResult.rawText;
  usedModel = runResult.model;

  const looksTruncated = !rawOutput.trimEnd().endsWith('}');
  const firstParsed = parseJsonWithRecovery(rawOutput);
  let recovered = firstParsed;

  if (!firstParsed || looksTruncated) {
    logAIDebug({
      level: 'warn',
      task: params.source === 'photo' ? 'meal_photo' : 'meal_text',
      stage: `${params.source}.parse_retry_needed`,
      message: 'Meal JSON parse is incomplete, running compact retry',
      sessionId: params.sessionId,
      model: usedModel,
      details: { looksTruncated, rawLen: rawOutput.length, hasFirstParse: Boolean(firstParsed) },
    });

    const compactPrompt = [
      'Return ONLY valid compact JSON.',
      params.source === 'photo'
        ? 'Analyze this meal photo.'
        : `Analyze this meal description: "${params.textInput ?? ''}"`,
      'Required keys only: title, shortReason, caloriesKcal, proteinG, carbsG, fatG, confidencePercent.',
      'Keep shortReason <= 70 chars.',
    ].join('\n');
    const compactParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
      { text: compactPrompt },
    ];
    if (params.imagePayload) {
      compactParts.push({
        inlineData: { mimeType: params.imagePayload.mimeType, data: params.imagePayload.base64 },
      });
    }
    const compactBody = {
      contents: [{ parts: compactParts }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 180,
      },
    };
    try {
      const compactResult = await runWithFallback({
        taskType: params.source === 'photo' ? 'meal_photo' : 'meal_text',
        modelChain: [PRIMARY_MODEL],
        apiKey: params.apiKey,
        body: compactBody,
        signal: params.signal,
        debugSessionId: params.sessionId,
        debugAnalysisId: params.analysisId,
        debugMeta: { stage: `${params.source}_compact_retry` },
      });
      rawOutput = compactResult.rawText;
      usedModel = compactResult.model;
      recovered = parseJsonWithRecovery(rawOutput);
    } catch (retryErr) {
      logAIDebug({
        level: 'error',
        task: params.source === 'photo' ? 'meal_photo' : 'meal_text',
        stage: `${params.source}.compact_retry.error`,
        message: 'Meal compact retry failed',
        sessionId: params.sessionId,
        model: PRIMARY_MODEL,
        details: {
          errName: (retryErr as Error)?.name,
          errMsg: (retryErr as Error)?.message?.slice(0, 240),
        },
      });
    }
  }

  if (!recovered) {
    throw new Error('Meal AI returned invalid JSON');
  }
  if (recovered.strategy !== 'direct') {
    logAIDebug({
      level: 'warn',
      task: params.source === 'photo' ? 'meal_photo' : 'meal_text',
      stage: `${params.source}.parse_recovered`,
      message: 'Recovered meal JSON with local sanitizer',
      sessionId: params.sessionId,
      model: usedModel,
      details: { strategy: recovered.strategy },
    });
  }

  const normalized = normalizeMealAnalysis(recovered.parsed, {
    fallbackSeed: params.textInput ?? '',
    source: params.source,
  });
  normalized.analysisId = params.analysisId;
  await setCache(params.cacheKey, normalized, TTL_24H);
  return normalized;
}

export async function analyzeMealPhoto(
  imageUri: string,
  options?: { analysisId?: number }
): Promise<MealAnalysisResult> {
  const analysisId =
    typeof options?.analysisId === 'number' && Number.isFinite(options.analysisId)
      ? Math.max(1, Math.floor(options.analysisId))
      : await nextAnalysisRunId();
  const sessionId = createId('meal_photo');
  const startedAt = Date.now();
  const apiKey = getApiKey();

  if (!apiKey) {
    logAIDebug({
      level: 'warn',
      task: 'meal_photo',
      stage: 'meal_photo.missing_api_key',
      message: 'Missing Gemini API key, using local fallback',
      sessionId,
      analysisId,
    });
    return createFallbackMealAnalysis({
      source: 'photo',
      analysisId,
      fallbackSeed: 'photo meal',
      reasonSuffix: 'Add API key for richer title and badges.',
    });
  }

  logAIDebug({
    level: 'info',
    task: 'meal_photo',
    stage: 'meal_photo.start',
    message: 'Meal photo analysis started',
    sessionId,
    analysisId,
  });

  return withInflight('meal_photo', async (signal) => {
    try {
      const prepared = await prepareImagePayloadForAI(imageUri, {
        maxSide: MEAL_AI_IMAGE_MAX_SIDE,
        jpegQuality: MEAL_AI_IMAGE_JPEG_QUALITY,
      });
      if (!prepared.base64) {
        return createFallbackMealAnalysis({
          source: 'photo',
          analysisId,
          fallbackSeed: 'photo meal',
          reasonSuffix: 'Could not process image bytes.',
        });
      }

      const imageFingerprint = hashCacheKey([
        `mime:${prepared.mimeType}`,
        `len:${prepared.base64.length}`,
        prepared.base64,
      ]);
      const cacheKey = hashCacheKey([imageFingerprint, 'meal_details_photo_v1']);

      const result = await analyzeMealWithAI({
        source: 'photo',
        sessionId,
        analysisId,
        signal,
        imagePayload: { base64: prepared.base64, mimeType: prepared.mimeType },
        cacheKey,
        startedAt,
        apiKey,
      });

      logAIDebug({
        level: 'info',
        task: 'meal_photo',
        stage: 'meal_photo.success',
        message: 'Meal photo analysis completed',
        sessionId,
        analysisId,
        durationMs: Date.now() - startedAt,
        details: {
          title: result.title,
          caloriesKcal: result.macros.caloriesKcal,
          proteinG: result.macros.proteinG,
          carbsG: result.macros.carbsG,
          fatG: result.macros.fatG,
        },
      });
      return result;
    } catch (error) {
      if (isAbortError(error)) {
        logAIDebug({
          level: 'warn',
          task: 'meal_photo',
        stage: 'meal_photo.aborted',
        message: 'Meal photo analysis aborted by user',
        sessionId,
        analysisId,
        durationMs: Date.now() - startedAt,
      });
        throw error;
      }
      console.warn(`Meal photo analysis failed: ${error instanceof Error ? error.message : String(error)}`);
      logAIDebug({
        level: 'error',
        task: 'meal_photo',
        stage: 'meal_photo.error',
        message: 'Meal photo analysis failed',
        sessionId,
        analysisId,
        durationMs: Date.now() - startedAt,
        details: {
          errName: (error as Error)?.name,
          errMsg: (error as Error)?.message?.slice(0, 240),
        },
      });
      return createFallbackMealAnalysis({
        source: 'photo',
        analysisId,
        fallbackSeed: 'photo meal',
        reasonSuffix: 'AI analysis temporarily unavailable.',
      });
    }
  });
}

export async function analyzeMealText(
  textInput: string,
  options?: { analysisId?: number }
): Promise<MealAnalysisResult> {
  const analysisId =
    typeof options?.analysisId === 'number' && Number.isFinite(options.analysisId)
      ? Math.max(1, Math.floor(options.analysisId))
      : await nextAnalysisRunId();
  const sessionId = createId('meal_text');
  const startedAt = Date.now();
  const normalizedInput = textInput.trim().slice(0, 700);
  const apiKey = getApiKey();

  if (!normalizedInput) {
    return createFallbackMealAnalysis({
      source: 'text',
      analysisId,
      fallbackSeed: 'meal',
      reasonSuffix: 'Add meal description for better precision.',
    });
  }

  if (!apiKey) {
    logAIDebug({
      level: 'warn',
      task: 'meal_text',
      stage: 'meal_text.missing_api_key',
      message: 'Missing Gemini API key, using local fallback',
      sessionId,
      analysisId,
    });
    return createFallbackMealAnalysis({
      source: 'text',
      analysisId,
      fallbackSeed: normalizedInput,
      reasonSuffix: 'Add API key for richer title and badges.',
    });
  }

  logAIDebug({
    level: 'info',
    task: 'meal_text',
    stage: 'meal_text.start',
    message: 'Meal text analysis started',
    sessionId,
    analysisId,
    details: { textLength: normalizedInput.length },
  });

  return withInflight('meal_text', async (signal) => {
    try {
      const cacheKey = hashCacheKey(['meal_details_text_v1', normalizedInput.toLocaleLowerCase()]);
      const result = await analyzeMealWithAI({
        source: 'text',
        sessionId,
        analysisId,
        signal,
        textInput: normalizedInput,
        cacheKey,
        startedAt,
        apiKey,
      });
      logAIDebug({
        level: 'info',
        task: 'meal_text',
        stage: 'meal_text.success',
        message: 'Meal text analysis completed',
        sessionId,
        analysisId,
        durationMs: Date.now() - startedAt,
        details: {
          title: result.title,
          caloriesKcal: result.macros.caloriesKcal,
          proteinG: result.macros.proteinG,
          carbsG: result.macros.carbsG,
          fatG: result.macros.fatG,
        },
      });
      return result;
    } catch (error) {
      if (isAbortError(error)) {
        logAIDebug({
          level: 'warn',
          task: 'meal_text',
        stage: 'meal_text.aborted',
        message: 'Meal text analysis aborted by user',
        sessionId,
        analysisId,
        durationMs: Date.now() - startedAt,
      });
        throw error;
      }
      console.warn(`Meal text analysis failed: ${error instanceof Error ? error.message : String(error)}`);
      logAIDebug({
        level: 'error',
        task: 'meal_text',
        stage: 'meal_text.error',
        message: 'Meal text analysis failed',
        sessionId,
        analysisId,
        durationMs: Date.now() - startedAt,
        details: {
          errName: (error as Error)?.name,
          errMsg: (error as Error)?.message?.slice(0, 240),
        },
      });
      return createFallbackMealAnalysis({
        source: 'text',
        analysisId,
        fallbackSeed: normalizedInput,
        reasonSuffix: 'AI analysis temporarily unavailable.',
      });
    }
  });
}

// ── Chat (askBuddy) ───────────────────────────────────────────────────────────

const MAX_CONTEXT_CHARS = 6000;

function truncateContext(context: unknown): string {
  if (!context) return '';
  const raw = JSON.stringify(context);
  if (raw.length <= MAX_CONTEXT_CHARS) return `Context: ${raw}\n\n`;
  return `Context: ${raw.slice(0, MAX_CONTEXT_CHARS)}…\n\n`;
}

export async function askBuddy(message: string, context?: unknown): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) return createMockChatResponse();

  return withInflight('chat', async (signal) => {
    try {
      const contextText = truncateContext(context);
      const prompt = `${contextText}User question: ${message}\n\nProvide a helpful, concise response about nutrition and meal planning.`;

      const body = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
      };

      const { rawText } = await runWithFallback({ taskType: 'chat', apiKey, body, signal });
      return rawText || createMockChatResponse();
    } catch {
      return createMockChatResponse();
    }
  });
}

// ── Test helper ───────────────────────────────────────────────────────────────

export async function geminiTextTest(prompt: string): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('Missing EXPO_PUBLIC_GEMINI_API_KEY');

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  };

  const { rawText } = await runWithFallback({ taskType: 'chat', apiKey, body });
  if (!rawText) throw new Error('Empty response from Gemini');
  return rawText;
}
