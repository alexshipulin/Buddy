import type { Allergy, DietaryPreference, Goal } from '../domain/models';
import { type ValidationIssue, MenuAnalysisValidationError, validateMenuAnalysisResponse } from '../validation/menuAnalysisValidator';
import type { DishPick } from '../domain/models';
import { requireApiKey, runWithFallback, sanitizeJsonText } from './geminiClient';

export type { DishPick };

export type MenuAnalysisResponse = {
  topPicks: DishPick[];
  caution: DishPick[];
  avoid: DishPick[];
};

// Re-export PRIMARY_MODEL for docs/tests that reference it.
export const PRIMARY_MODEL = process.env.EXPO_PUBLIC_GEMINI_MODEL ?? 'gemini-2.5-flash';

// ── Error types ───────────────────────────────────────────────────────────────

export class MenuAnalysisInvalidJsonError extends Error {
  raw: string;
  model: string;
  status?: number;
  issues?: ValidationIssue[];

  constructor(params: {
    raw: string;
    model: string;
    status?: number;
    message?: string;
    issues?: ValidationIssue[];
  }) {
    super(params.message ?? 'Model returned invalid JSON or failed validation');
    this.name = 'MenuAnalysisInvalidJsonError';
    this.raw = params.raw;
    this.model = params.model;
    this.status = params.status;
    this.issues = params.issues;
  }
}

// ── JSON Schema for Gemini responseSchema ─────────────────────────────────────

const MACRO_FIELDS = {
  estimatedCalories: { type: 'number', nullable: true },
  estimatedProteinG: { type: 'number', nullable: true },
  estimatedCarbsG: { type: 'number', nullable: true },
  estimatedFatG: { type: 'number', nullable: true },
};

const TOP_DISH_PICK_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    shortReason: { type: 'string' },
    pins: { type: 'array', items: { type: 'string' } },
    confidencePercent: { type: 'number' },
    dietBadges: { type: 'array', items: { type: 'string' } },
    allergenNote: { type: 'string', nullable: true },
    noLine: { type: 'string', nullable: true },
    ...MACRO_FIELDS,
  },
  required: ['name', 'shortReason', 'pins', 'confidencePercent', 'dietBadges', 'allergenNote', 'noLine'],
};

const CAUTION_DISH_PICK_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    shortReason: { type: 'string' },
    riskPins: { type: 'array', items: { type: 'string' } },
    quickFix: { type: 'string' },
    confidencePercent: { type: 'number' },
    dietBadges: { type: 'array', items: { type: 'string' } },
    allergenNote: { type: 'string', nullable: true },
    noLine: { type: 'string', nullable: true },
    ...MACRO_FIELDS,
  },
  required: ['name', 'shortReason', 'riskPins', 'quickFix', 'confidencePercent', 'dietBadges', 'allergenNote', 'noLine'],
};

const AVOID_DISH_PICK_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    shortReason: { type: 'string' },
    riskPins: { type: 'array', items: { type: 'string' } },
    confidencePercent: { type: 'number' },
    dietBadges: { type: 'array', items: { type: 'string' } },
    allergenNote: { type: 'string', nullable: true },
    noLine: { type: 'string', nullable: true },
    ...MACRO_FIELDS,
  },
  required: ['name', 'shortReason', 'riskPins', 'confidencePercent', 'dietBadges', 'allergenNote', 'noLine'],
};

const MENU_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    topPicks: { type: 'array', items: TOP_DISH_PICK_SCHEMA },
    caution: { type: 'array', items: CAUTION_DISH_PICK_SCHEMA },
    avoid: { type: 'array', items: AVOID_DISH_PICK_SCHEMA },
  },
  required: ['topPicks', 'caution', 'avoid'],
};

const MENU_SCAN_MAX_TOKENS = 4096;

// ── Public API ────────────────────────────────────────────────────────────────

export type AnalyzeMenuImagesInput = { base64: string; mimeType: string }[];

export async function analyzeMenuWithGemini(params: {
  images: AnalyzeMenuImagesInput;
  userGoal: Goal;
  dietPrefs: string[];
  allergies: string[];
  dislikes?: string[];
  pinWhitelistTop: string[];
  pinWhitelistCaution: string[];
  pinWhitelistAvoid: string[];
  dietMismatchPin?: string | null;
}): Promise<MenuAnalysisResponse> {
  const key = requireApiKey();

  const dislikesLine = params.dislikes?.length
    ? `Dislikes (avoid recommending; if a top dish contains one, set noLine e.g. "No tomato"): ${params.dislikes.join(', ')}`
    : '';
  const topPinList = params.pinWhitelistTop.join(', ');
  const cautionPinList = params.pinWhitelistCaution.join(', ');
  const avoidPinList = params.pinWhitelistAvoid.join(', ');
  const quickFixList = [
    'Try: sauce on the side', 'Try: no sauce', 'Try: grilled not fried',
    'Try: swap fries for salad', 'Try: half portion', 'Try: extra veggies',
    'Try: less oil', 'Try: no cheese', 'Try: no mayo', 'Try: skip dessert',
  ].join(', ');

  const { dietMismatchPin } = params;
  const dietMismatchLine = dietMismatchPin
    ? `- If dish conflicts with selected diet preferences, include risk pin "${dietMismatchPin}" in caution/avoid.`
    : '';

  const prompt = `Return ONLY JSON. No markdown. No extra text.

Goal: ${params.userGoal}
Diet preferences (use only these for dietBadges): ${params.dietPrefs.join(', ') || 'none'}
Allergies: ${params.allergies.join(', ') || 'none'}
${dislikesLine}

Top picks positive pins whitelist (choose ONLY from this list; 3-4 unique pins): ${topPinList}
Caution risk pins whitelist (choose ONLY from this list; 1-3 unique pins): ${cautionPinList}
Avoid risk pins whitelist (choose ONLY from this list; 1-3 unique pins): ${avoidPinList}
Allowed quickFix values for caution: ${quickFixList}

Task:
- Analyze ALL provided menu images together as one menu.
- Output language: English for all fields EXCEPT dish name. Dish name must be copied EXACTLY as written on the menu (do not translate).
- Return 3 groups: topPicks (max 3), caution, avoid.
- topPicks item fields: name, shortReason (one short sentence, EN), pins (3-4 unique from top whitelist), confidencePercent (0-100), dietBadges (subset of user diet preferences only), allergenNote, noLine.
- caution item fields: name, shortReason, confidencePercent, riskPins (1-3 unique from caution whitelist), quickFix (one allowed quickFix value), dietBadges, allergenNote, noLine.
- avoid item fields: name, shortReason, confidencePercent, riskPins (1-3 unique from avoid whitelist), dietBadges, allergenNote, noLine.
- For caution/avoid do NOT use positive pins in pins; use riskPins only.
- allergenNote: if user has allergies selected, must be either "Allergen safe" or "May contain allergens - ask the waiter". If user has no allergies: null.
- noLine: only from dislikes; if dish contains a disliked ingredient, set e.g. "No tomato". Otherwise null.
- If a top pick contains a disliked ingredient it may stay in topPicks but you MUST set noLine.
- If user has allergies selected and dish is risky or unknown, include risk pin "Allergen" in caution/avoid.
${dietMismatchLine}
- If dish conflicts with dislikes, include risk pin "Dislike" in caution/avoid and set noLine when modifiable.
- For EVERY dish in all 3 groups, estimate macros: estimatedCalories (kcal, integer), estimatedProteinG (grams, integer), estimatedCarbsG (grams, integer), estimatedFatG (grams, integer). Use your best estimate for a standard restaurant portion. If you cannot estimate, set null.`;

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: prompt },
  ];
  for (const img of params.images) {
    parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
  }

  const structuredBody = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: MENU_RESPONSE_SCHEMA,
      temperature: 0.2,
      maxOutputTokens: MENU_SCAN_MAX_TOKENS,
    },
  };

  const buildPlainBody = (): object => ({
    contents: [{ role: 'user', parts }],
    generationConfig: { temperature: 0.2, maxOutputTokens: MENU_SCAN_MAX_TOKENS },
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
    });
    rawOutput = result.rawText;
    usedModel = result.model;
  } catch (e) {
    const err = e as Error & { status?: number };
    throw new MenuAnalysisInvalidJsonError({
      raw: '',
      model: PRIMARY_MODEL,
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

  try {
    return validateMenuAnalysisResponse({
      response: parsed,
      goal: params.userGoal,
      pinWhitelistTop: params.pinWhitelistTop,
      pinWhitelistCaution: params.pinWhitelistCaution,
      pinWhitelistAvoid: params.pinWhitelistAvoid,
      selectedDietPreferences: params.dietPrefs as DietaryPreference[],
      selectedAllergies: params.allergies as Allergy[],
      dislikes: params.dislikes ?? [],
    });
  } catch (e) {
    if (e instanceof MenuAnalysisValidationError) {
      throw new MenuAnalysisInvalidJsonError({ raw: rawOutput, model: usedModel, message: e.message, issues: e.issues });
    }
    throw e;
  }
}
