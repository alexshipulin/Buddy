import { MenuScanResult } from '../domain/models';
import { createId } from '../utils/id';
import * as FileSystem from 'expo-file-system/legacy';
import { getApiKey, runWithFallback, sanitizeJsonText } from '../ai/geminiClient';

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
    caloriesKcal: { type: 'number' },
    proteinG: { type: 'number' },
    carbsG: { type: 'number' },
    fatG: { type: 'number' },
    description: { type: 'string' },
  },
  required: ['caloriesKcal', 'proteinG', 'carbsG', 'fatG', 'description'],
} as const;

const MEAL_DEFAULTS = { caloriesKcal: 450, proteinG: 30, carbsG: 40, fatG: 15 };

export async function analyzeMealPhoto(imageUri: string): Promise<{ macros: { caloriesKcal: number; proteinG: number; carbsG: number; fatG: number }; description: string }> {
  const apiKey = getApiKey();
  if (!apiKey) return { macros: { ...MEAL_DEFAULTS }, description: 'Meal logged. Add API key for AI analysis.' };

  try {
    const base64Image = await uriToBase64(imageUri);
    if (!base64Image) return { macros: { ...MEAL_DEFAULTS }, description: 'Meal logged. Could not process image.' };

    const prompt = 'Return ONLY JSON. No markdown. No extra text. Analyze this meal photo and return JSON with caloriesKcal, proteinG, carbsG, fatG (numbers) and description (string).';

    const structuredBody = {
      contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: 'image/jpeg', data: base64Image } }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: MEAL_SCHEMA,
        temperature: 0.2,
        maxOutputTokens: 512,
      },
    };

    const buildPlainBody = (): object => ({
      contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: 'image/jpeg', data: base64Image } }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 512 },
    });

    const { rawText } = await runWithFallback({
      taskType: 'meal_photo',
      apiKey,
      body: structuredBody,
      supportsPlainFallback: true,
      buildPlainBody,
    });

    const cleaned = sanitizeJsonText(rawText);
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;

    return {
      macros: {
        caloriesKcal: (parsed.caloriesKcal as number) || MEAL_DEFAULTS.caloriesKcal,
        proteinG: (parsed.proteinG as number) || MEAL_DEFAULTS.proteinG,
        carbsG: (parsed.carbsG as number) || MEAL_DEFAULTS.carbsG,
        fatG: (parsed.fatG as number) || MEAL_DEFAULTS.fatG,
      },
      description: (parsed.description as string) || 'Meal analyzed.',
    };
  } catch (error) {
    console.warn(`Meal photo analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    return { macros: { ...MEAL_DEFAULTS }, description: 'Meal logged. AI analysis unavailable.' };
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
