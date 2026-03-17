import { requireApiKey, runWithFallback, sanitizeJsonText } from './geminiClient';
import type { ExtractedDish } from '../domain/models';

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

/**
 * Backward-compatible shape used by legacy classifiers/adapters.
 * Kept as a type export while extraction now returns `ExtractedDish`.
 */
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

export type MenuExtractionAIResponse = {
  dishes: ExtractedDish[];
};

// ── JSON Schema for Gemini responseSchema ─────────────────────────────────────

const MENU_EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    dishes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          menuSection: { type: 'string' },
          shortDescription: { type: 'string' },
          estimatedCalories: { type: 'number' },
          estimatedProteinG: { type: 'number' },
          estimatedCarbsG: { type: 'number' },
          estimatedFatG: { type: 'number' },
          confidencePercent: { type: 'number' },
          flags: {
            type: 'object',
            properties: {
              leanProtein: { type: 'boolean' },
              veggieForward: { type: 'boolean' },
              wholeFood: { type: 'boolean' },
              fried: { type: 'boolean' },
              dessert: { type: 'boolean' },
              sugaryDrink: { type: 'boolean' },
              refinedCarbHeavy: { type: 'boolean' },
              highFatSauce: { type: 'boolean' },
              processed: { type: 'boolean' }
            },
            required: ['leanProtein','veggieForward','wholeFood','fried','dessert','sugaryDrink','refinedCarbHeavy','highFatSauce','processed']
          },
          allergenSignals: {
            type: 'object',
            properties: {
              contains: { type: 'array', items: { type: 'string' } },
              unclear: { type: 'boolean' },
              noListedAllergen: { type: 'boolean' }
            }
          },
          dislikes: {
            type: 'object',
            properties: {
              containsDislikedIngredient: { type: 'boolean' },
              removableDislikedIngredients: { type: 'array', items: { type: 'string' } }
            }
          }
        },
        required: ['name','estimatedCalories','estimatedProteinG','estimatedCarbsG','estimatedFatG','confidencePercent','flags']
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
  selectedAllergies: string[];
}): Promise<MenuExtractionAIResponse> {
  const key = requireApiKey();

  const prompt = `Return ONLY JSON. No markdown. No extra text.

User goal: ${params.userGoal}
User dislikes (check these specifically): ${params.userDislikes.length > 0 ? params.userDislikes.join(', ') : 'none'}
User allergies (check these specifically): ${params.selectedAllergies.length > 0 ? params.selectedAllergies.join(', ') : 'none'}

Detect from the menu photo each dish and for each return:
- name: exact dish name as written on the menu
- menuSection: section name from menu (e.g. "Starters", "Mains") or null
- shortDescription: 1-2 sentences about this dish from diet perspective for the user goal
- estimatedCalories, estimatedProteinG, estimatedCarbsG, estimatedFatG: estimated macros (standard restaurant portion ~300-400g)
- confidencePercent: your confidence 50-95 as integer
- flags: set true only if genuinely applies:
    leanProtein: grilled/baked lean meat or fish without heavy sauce
    veggieForward: vegetables are main component
    wholeFood: minimally processed, whole ingredients
    fried: deep-fried, pan-fried, or battered
    dessert: sweet dessert dish
    sugaryDrink: sweetened beverages
    refinedCarbHeavy: white bread, white rice, pasta as dominant component
    highFatSauce: cream sauce, gravy, teriyaki glaze, thick dressing
    processed: clearly processed/packaged food, fast food style, processed meat
- allergenSignals:
    contains: list only allergens from this list that are definitely present: ${params.selectedAllergies.length > 0 ? params.selectedAllergies.join(', ') : 'none selected'}
    unclear: true if allergen presence is uncertain for user's selected allergies
    noListedAllergen: true if none of user's selected allergens are present
- dislikes:
    containsDislikedIngredient: true if dish contains any of user's dislikes
    removableDislikedIngredients: list of disliked ingredients that can be omitted on request`;

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: prompt },
    { inlineData: { mimeType: params.mimeType, data: params.imageBase64 } },
  ];

  const structuredBody = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: MENU_EXTRACTION_SCHEMA,
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

  return data as MenuExtractionAIResponse;
}
