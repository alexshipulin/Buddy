import { MenuScanResult } from '../domain/models';
import { createId } from '../utils/id';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Image as RNImage } from 'react-native';
import { getApiKey, runWithFallback, sanitizeJsonText } from '../ai/geminiClient';

// ── Mocks ─────────────────────────────────────────────────────────────────────

function createMockMenuResult(): MenuScanResult {
  return {
    id: createId('scan'),
    createdAt: new Date().toISOString(),
    inputImages: [],
    topPicks: [
      { name: 'Grilled salmon with greens', shortReason: 'High protein and healthy fats.', pins: ['High protein', 'Lean protein', 'Healthy fats'], confidencePercent: 88, dietBadges: [], allergenNote: null, noLine: null },
      { name: 'Chicken salad', shortReason: 'Lean protein with fiber-rich vegetables.', pins: ['High protein', 'Low-calorie', 'High fiber'], confidencePercent: 85, dietBadges: [], allergenNote: null, noLine: null },
    ],
    caution: [
      { name: 'Teriyaki chicken', shortReason: 'Protein is good, but sauce can add sugar.', pins: [], riskPins: ['High sugar', 'High sodium'], quickFix: 'Try: sauce on the side', confidencePercent: 65, dietBadges: [], allergenNote: null, noLine: null },
    ],
    avoid: [
      { name: 'Deep-fried combo platter', shortReason: 'Very high energy density.', pins: [], riskPins: ['Fried', 'High-calorie'], confidencePercent: 90, dietBadges: [], allergenNote: null, noLine: null },
    ],
    summaryText: 'Buddy analyzed your menu. Add your API key for AI-powered recommendations.',
    disclaimerFlag: true,
  };
}

function createMockChatResponse(): string {
  return 'I can help you with meal planning! Add your Gemini API key to enable AI-powered responses.';
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

export type PreparedVisionImage = {
  base64: string;
  mimeType: string;
  wasCompressed: boolean;
  originalWidth?: number | null;
  outputWidth?: number | null;
  compressionQuality?: number | null;
};

function getImageWidth(uri: string): Promise<number | null> {
  return new Promise((resolve) => {
    RNImage.getSize(
      uri,
      (width) => resolve(width),
      () => resolve(null)
    );
  });
}

function getDataUriMimeType(uri: string): string | null {
  if (!uri.startsWith('data:')) return null;
  const header = uri.slice(5, uri.indexOf(','));
  const semicolonIdx = header.indexOf(';');
  const mime = semicolonIdx >= 0 ? header.slice(0, semicolonIdx) : header;
  return mime || null;
}

function detectMimeTypeFromUri(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.heic')) return 'image/heic';
  if (lower.endsWith('.heif')) return 'image/heif';
  return 'image/jpeg';
}

/**
 * Prepares image bytes for vision models:
 * - converts to JPEG
 * - applies adaptive compression
 * - downsizes wide images while keeping small text readable
 */
export async function prepareImageForVision(
  uri: string,
  options?: { maxWidth?: number; minWidth?: number; compress?: number; targetBase64Len?: number }
): Promise<PreparedVisionImage | null> {
  const maxWidth = options?.maxWidth ?? 1600;
  const minWidth = Math.min(options?.minWidth ?? 1280, maxWidth);
  const baseCompress = options?.compress ?? 0.68;
  const targetBase64Len = options?.targetBase64Len ?? 900_000;

  const clampCompress = (value: number): number => {
    if (value < 0.45) return 0.45;
    if (value > 0.9) return 0.9;
    return value;
  };

  const buildAttempts = (effectiveMaxWidth: number): Array<{ width: number; compress: number }> => {
    const attempts: Array<{ width: number; compress: number }> = [
      { width: effectiveMaxWidth, compress: clampCompress(baseCompress) },
      { width: Math.max(minWidth, Math.round(effectiveMaxWidth * 0.92)), compress: clampCompress(baseCompress - 0.06) },
      { width: Math.max(minWidth, Math.round(effectiveMaxWidth * 0.84)), compress: clampCompress(baseCompress - 0.1) },
      { width: minWidth, compress: clampCompress(baseCompress - 0.14) },
    ];

    const deduped: Array<{ width: number; compress: number }> = [];
    const seen = new Set<string>();
    for (const a of attempts) {
      const key = `${a.width}_${a.compress.toFixed(2)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(a);
    }
    return deduped;
  };

  if (uri.startsWith('data:')) {
    const base64 = uriToBase64(uri);
    const mime = getDataUriMimeType(uri) ?? 'image/jpeg';
    const resolved = await base64;
    return resolved ? { base64: resolved, mimeType: mime, wasCompressed: false } : null;
  }

  if (uri.startsWith('file://')) {
    try {
      const originalWidth = await getImageWidth(uri);
      const effectiveMaxWidth = originalWidth ? Math.min(originalWidth, maxWidth) : maxWidth;
      const attempts = buildAttempts(effectiveMaxWidth);

      let best: PreparedVisionImage | null = null;
      let bestLen = Number.POSITIVE_INFINITY;

      for (const attempt of attempts) {
        const actions = originalWidth && originalWidth > attempt.width ? [{ resize: { width: attempt.width } as const }] : [];
        const manipulated = await manipulateAsync(uri, actions, {
          base64: true,
          compress: attempt.compress,
          format: SaveFormat.JPEG,
        });
        if (!manipulated.base64) continue;

        const len = manipulated.base64.length;
        const candidate: PreparedVisionImage = {
          base64: manipulated.base64,
          mimeType: 'image/jpeg',
          wasCompressed: true,
          originalWidth,
          outputWidth: manipulated.width ?? attempt.width,
          compressionQuality: attempt.compress,
        };

        if (len < bestLen) {
          best = candidate;
          bestLen = len;
        }

        if (len <= targetBase64Len) {
          // First candidate that reaches target keeps the best readability-quality tradeoff.
          return candidate;
        }
      }

      if (best) {
        return best;
      }
    } catch {
      // fallback below
    }
  }

  const fallback = await uriToBase64(uri);
  if (!fallback) return null;
  const fallbackMimeType = getDataUriMimeType(uri) ?? detectMimeTypeFromUri(uri);
  return { base64: fallback, mimeType: fallbackMimeType, wasCompressed: false };
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
      base64Image = await uriToBase64(firstImage);
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

// ── Meal photo analysis ───────────────────────────────────────────────────────

const MEAL_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    caloriesKcal: { type: 'number' },
    proteinG: { type: 'number' },
    carbsG: { type: 'number' },
    fatG: { type: 'number' },
    description: { type: 'string' },
  },
  required: ['title', 'caloriesKcal', 'proteinG', 'carbsG', 'fatG', 'description'],
} as const;

const MEAL_DEFAULTS = { caloriesKcal: 450, proteinG: 30, carbsG: 40, fatG: 15 };
const MEAL_DEFAULT_TITLE = 'meal bowl';
const MEAL_DEFAULT_DESCRIPTION = 'Balanced meal with moderate protein and carbs.';

function toMacroInt(value: unknown, fallback: number): number {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.round(num));
}

function sanitizeMealTitle(value: unknown): string {
  if (typeof value !== 'string') return MEAL_DEFAULT_TITLE;
  const oneLine = value.replace(/\s+/g, ' ').trim();
  if (!oneLine) return MEAL_DEFAULT_TITLE;
  const compact = oneLine.slice(0, 48).replace(/[.!?]+$/, '').trim();
  return compact || MEAL_DEFAULT_TITLE;
}

function sanitizeMealDescription(value: unknown): string {
  if (typeof value !== 'string') return MEAL_DEFAULT_DESCRIPTION;
  const oneLine = value.replace(/\s+/g, ' ').trim();
  if (!oneLine) return MEAL_DEFAULT_DESCRIPTION;
  const limited = oneLine.split(' ').filter(Boolean).slice(0, 12).join(' ');
  if (!limited) return MEAL_DEFAULT_DESCRIPTION;
  if (/[.!?]$/.test(limited)) return limited;
  return `${limited}.`;
}

function extractFirstBalancedObject(text: string): string | null {
  const start = text.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
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
    if (ch === '{') {
      depth += 1;
      continue;
    }
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1).trim();
    }
  }
  return null;
}

function parseMealJsonWithRecovery(rawText: string): Record<string, unknown> | null {
  const seen = new Set<string>();
  const candidates: string[] = [];
  const sanitized = sanitizeJsonText(rawText);
  candidates.push(sanitized);

  const firstBrace = sanitized.indexOf('{');
  const lastBrace = sanitized.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(sanitized.slice(firstBrace, lastBrace + 1).trim());
  }

  const firstBalanced = extractFirstBalancedObject(sanitized);
  if (firstBalanced) candidates.push(firstBalanced);

  for (const candidate of candidates) {
    const text = candidate.trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    try {
      const parsed = JSON.parse(text) as unknown;
      if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>;
    } catch {
      const noTrailingCommas = text.replace(/,\s*([}\]])/g, '$1');
      if (!noTrailingCommas || seen.has(noTrailingCommas)) continue;
      seen.add(noTrailingCommas);
      try {
        const parsed = JSON.parse(noTrailingCommas) as unknown;
        if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>;
      } catch {
        // continue
      }
    }
  }

  return null;
}

export async function analyzeMealPhoto(imageUri: string): Promise<{
  title: string;
  description: string;
  macros: { caloriesKcal: number; proteinG: number; carbsG: number; fatG: number };
}> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return {
      title: MEAL_DEFAULT_TITLE,
      macros: { ...MEAL_DEFAULTS },
      description: 'Meal logged. Add API key for AI analysis.',
    };
  }

  try {
    const prepared = await prepareImageForVision(imageUri, {
      maxWidth: 1600,
      minWidth: 1280,
      compress: 0.82,
      targetBase64Len: 900_000,
    });
    if (!prepared?.base64) {
      return {
        title: MEAL_DEFAULT_TITLE,
        macros: { ...MEAL_DEFAULTS },
        description: 'Meal logged. Could not process image.',
      };
    }

    const prompt = [
      'Return ONLY valid JSON. No markdown. No extra text.',
      'Analyze this meal photo.',
      'Return JSON fields:',
      '- title: short dish name, 2-5 words. Example: "bowl with chicken"',
      '- description: 1-2 short sentences, max 12 words total, diet-relevant',
      '- caloriesKcal, proteinG, carbsG, fatG: integer estimates for the whole visible meal',
      'If uncertain, use your best estimate and still provide all fields.',
    ].join('\n');
    const compactRetryPrompt = [
      prompt,
      '',
      'RETRY MODE: Return compact JSON only with keys: title, description, caloriesKcal, proteinG, carbsG, fatG.',
    ].join('\n');

    const makeBody = (promptText: string, withSchema: boolean): object => ({
      contents: [{ parts: [{ text: promptText }, { inlineData: { mimeType: prepared.mimeType, data: prepared.base64 } }] }],
      generationConfig: {
        ...(withSchema ? { responseMimeType: 'application/json', responseSchema: MEAL_SCHEMA } : {}),
        temperature: 0.2,
        maxOutputTokens: 768,
      },
    });
    const structuredBody = makeBody(prompt, true);
    const buildPlainBody = (): object => makeBody(prompt, false);

    const firstRun = await runWithFallback({
      taskType: 'meal_photo',
      apiKey,
      body: structuredBody,
      supportsPlainFallback: true,
      buildPlainBody,
    });
    let parsed = parseMealJsonWithRecovery(firstRun.rawText);
    if (!parsed) {
      const retryBody = makeBody(compactRetryPrompt, true);
      const retryRun = await runWithFallback({
        taskType: 'meal_photo',
        apiKey,
        body: retryBody,
        supportsPlainFallback: true,
        buildPlainBody: () => makeBody(compactRetryPrompt, false),
      });
      parsed = parseMealJsonWithRecovery(retryRun.rawText);
    }
    if (!parsed) {
      throw new Error('Meal analysis JSON parse failed after retry');
    }

    return {
      title: sanitizeMealTitle(parsed.title),
      macros: {
        caloriesKcal: toMacroInt(parsed.caloriesKcal, MEAL_DEFAULTS.caloriesKcal),
        proteinG: toMacroInt(parsed.proteinG, MEAL_DEFAULTS.proteinG),
        carbsG: toMacroInt(parsed.carbsG, MEAL_DEFAULTS.carbsG),
        fatG: toMacroInt(parsed.fatG, MEAL_DEFAULTS.fatG),
      },
      description: sanitizeMealDescription(parsed.description),
    };
  } catch (error) {
    console.warn(`Meal photo analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    return {
      title: MEAL_DEFAULT_TITLE,
      macros: { ...MEAL_DEFAULTS },
      description: 'Meal logged. AI analysis unavailable.',
    };
  }
}

// ── Chat (askBuddy) ───────────────────────────────────────────────────────────

export async function askBuddy(message: string, context?: unknown): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) return createMockChatResponse();

  try {
    const contextText = context ? `Context: ${JSON.stringify(context)}\n\n` : '';
    const prompt = `${contextText}User question: ${message}\n\nProvide a helpful, concise response about nutrition and meal planning.`;

    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
    };

    const { rawText } = await runWithFallback({ taskType: 'chat', apiKey, body });
    return rawText || createMockChatResponse();
  } catch {
    return createMockChatResponse();
  }
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
