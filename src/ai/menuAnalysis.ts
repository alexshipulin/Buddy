import { requireApiKey, runWithFallback, sanitizeJsonText } from './geminiClient';

// Re-export for callers that catch this error (e.g. analyzeMenuUseCase).
export class MenuAnalysisInvalidJsonError extends Error {
  raw: string;
  model: string;
  status?: number;

  constructor(params: { raw: string; model: string; status?: number; message?: string }) {
    super(params.message ?? 'Model returned invalid JSON or failed validation');
    this.name = 'MenuAnalysisInvalidJsonError';
    this.raw = params.raw;
    this.model = params.model;
    this.status = params.status;
  }
}

export const PRIMARY_MODEL = process.env.EXPO_PUBLIC_GEMINI_MODEL ?? 'gemini-2.5-flash';

// ── Types ─────────────────────────────────────────────────────────────────────

export type RawDish = {
  name: string;
  nutrition: { caloriesKcal: number; proteinG: number; carbsG: number; fatG: number };
  detected_dislikes: string[];
  detected_allergies: string[];
  diet_flags: {
    vegan: boolean;
    vegetarian: boolean;
    gluten_free: boolean;
    lactose_free: boolean;
    keto: boolean;
    paleo: boolean;
  };
  short_description: string;
};

export type MenuRawAnalysis = {
  dishes: RawDish[];
};

// ── JSON Schema for Gemini responseSchema ─────────────────────────────────────

const MENU_RAW_SCHEMA = {
  type: 'object',
  properties: {
    dishes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          nutrition: {
            type: 'object',
            properties: {
              caloriesKcal: { type: 'number' },
              proteinG: { type: 'number' },
              carbsG: { type: 'number' },
              fatG: { type: 'number' },
            },
            required: ['caloriesKcal', 'proteinG', 'carbsG', 'fatG'],
          },
          detected_dislikes: { type: 'array', items: { type: 'string' } },
          detected_allergies: { type: 'array', items: { type: 'string' } },
          diet_flags: {
            type: 'object',
            properties: {
              vegan: { type: 'boolean' },
              vegetarian: { type: 'boolean' },
              gluten_free: { type: 'boolean' },
              lactose_free: { type: 'boolean' },
              keto: { type: 'boolean' },
              paleo: { type: 'boolean' },
            },
            required: ['vegan', 'vegetarian', 'gluten_free', 'lactose_free', 'keto', 'paleo'],
          },
          short_description: { type: 'string' },
        },
        required: [
          'name',
          'nutrition',
          'detected_dislikes',
          'detected_allergies',
          'diet_flags',
          'short_description',
        ],
      },
    },
  },
  required: ['dishes'],
};

// ── Public API ────────────────────────────────────────────────────────────────

export async function analyzeMenuWithGemini(params: {
  imageBase64: string;
  mimeType: string;
  userGoal: string;
  userDislikes: string[];
}): Promise<MenuRawAnalysis> {
  const key = requireApiKey();

  const prompt = `Return ONLY JSON. No markdown. No extra text.

User goal: ${params.userGoal}
User dislikes (check these specifically): ${params.userDislikes.length > 0 ? params.userDislikes.join(', ') : 'none'}

Detect from the menu photo each dish and for each return:
- name: exact dish name as written on the menu
- nutrition: estimated calories, protein, carbs, fat (assume standard restaurant portion ~300-400g)
- detected_dislikes: match ONLY from this list: Spicy, Avocado, Coriander, Mushrooms, Onions, Garlic, Olives, Seafood, Mayonnaise, Tomatoes
- detected_allergies: match ONLY from this list: Milk, Eggs, Fish, Crustacean shellfish, Tree nuts, Peanuts, Wheat, Soy, Sesame, Celery, Lupin, Molluscs, Mustard, Sulphites
- diet_flags: set true only if the dish genuinely qualifies
- short_description: 1-2 sentences from a diet perspective relevant to the user goal`;

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: prompt },
    { inlineData: { mimeType: params.mimeType, data: params.imageBase64 } },
  ];

  const structuredBody = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: MENU_RAW_SCHEMA,
      temperature: 0.2,
      maxOutputTokens: 16384,
      thinkingConfig: { thinkingBudget: 0 },
    },
  };

  const buildPlainBody = (): object => ({
    contents: [{ role: 'user', parts }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 16384, thinkingConfig: { thinkingBudget: 0 } },
  });

  const buildLightweightBody = (): object => ({
    contents: [{ role: 'user', parts }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0.2, maxOutputTokens: 16384, thinkingConfig: { thinkingBudget: 0 } },
  });

  let rawOutput: string;
  let usedModel: string;
  try {
    const result = await runWithFallback({
      taskType: 'menu_scan',
      apiKey: key,
      body: structuredBody,
      supportsPlainFallback: true,
      buildPlainBody,
      buildLightweightBody,
    });
    rawOutput = result.rawText;
    usedModel = result.model;
  } catch (e) {
    const err = e as Error & { status?: number; model?: string };
    throw new MenuAnalysisInvalidJsonError({
      raw: '',
      model: err.model ?? PRIMARY_MODEL,
      status: err.status,
      message: err.message,
    });
  }

  if (!rawOutput) {
    throw new MenuAnalysisInvalidJsonError({ raw: '', model: usedModel, message: 'Empty model response' });
  }

  const sanitized = sanitizeJsonText(rawOutput);
  let parsed: unknown;
  try {
    parsed = JSON.parse(sanitized);
  } catch {
    throw new MenuAnalysisInvalidJsonError({ raw: rawOutput, model: usedModel, message: 'Model returned invalid JSON' });
  }

  const data = parsed as { dishes?: unknown };
  if (!data || !Array.isArray(data.dishes)) {
    throw new MenuAnalysisInvalidJsonError({ raw: rawOutput, model: usedModel, message: 'Response missing dishes array' });
  }

  return data as MenuRawAnalysis;
}
