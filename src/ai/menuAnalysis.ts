import type { ExtractedDish } from '../domain/models';
import { logAIDebug } from './aiDebugLog';
import { requireApiKey, runWithFallback, sanitizeJsonText } from './geminiClient';

// Kept for UI/debug flows that need raw model output when JSON parsing fails.
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

export const PRIMARY_MODEL = 'gemini-2.5-flash';

export type CookingFlags = {
  fried: boolean;
  high_sugar: boolean;
  heavy_sauce: boolean;
  processed: boolean;
};

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
  cooking_flags: CookingFlags;
  short_description: string;
};

export type MenuExtractionAIResponse = {
  dishes: RawDish[];
};

const MENU_EXTRACTION_SCHEMA = {
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
          cooking_flags: {
            type: 'object',
            properties: {
              fried: { type: 'boolean' },
              high_sugar: { type: 'boolean' },
              heavy_sauce: { type: 'boolean' },
              processed: { type: 'boolean' },
            },
            required: ['fried', 'high_sugar', 'heavy_sauce', 'processed'],
          },
          short_description: { type: 'string' },
        },
        required: [
          'name',
          'nutrition',
          'detected_dislikes',
          'detected_allergies',
          'diet_flags',
          'cooking_flags',
          'short_description',
        ],
      },
    },
  },
  required: ['dishes'],
} as const;

function getMenuScanMaxTokens(imagesCount: number): number {
  // A single dense menu page can have 25-35 items × ~200 tokens each = ~7000 tokens
  // 3 pages = up to ~20000 tokens needed
  if (imagesCount >= 3) return 24576;
  if (imagesCount >= 2) return 16384;
  return 12288;
}

function shouldRetryForCompleteness(imagesCount: number, dishCount: number): boolean {
  if (dishCount === 0) return true;
  // Per page, a typical restaurant menu has 8-15 items
  // We retry if result seems too sparse relative to image count
  if (imagesCount >= 3 && dishCount < 20) return true;
  if (imagesCount >= 2 && dishCount < 14) return true;
  if (imagesCount === 1 && dishCount < 10) return true;
  return false;
}

function buildExtractionPrompt(params: {
  userGoal: string;
  userDislikes: string[];
  selectedAllergies: string[];
  imagesCount: number;
}): string {
  const imageNote =
    params.imagesCount > 1
      ? `There are ${params.imagesCount} menu photos. Treat them as ONE menu. Combine all items from all photos into a single dishes array.`
      : 'Analyze the menu photo.';

  return [
    'Return ONLY valid JSON. No markdown. No extra text.',
    '',
    imageNote,
    '',
    `User goal: ${params.userGoal}`,
    `User dislikes: ${params.userDislikes.length > 0 ? params.userDislikes.join(', ') : 'none'}`,
    `User allergies: ${params.selectedAllergies.length > 0 ? params.selectedAllergies.join(', ') : 'none'}`,
    '',
    'YOU MUST list every single item printed on this menu — no exceptions.',
    'Include ALL sections: Small Plates, Big Plates, Starters, Mains, Sides, Desserts, Drinks, Snacks, Specials, Salads, Sandwiches, Burgers — whatever sections exist.',
    'Do NOT skip sides, desserts, beverages, or any item you consider minor.',
    'Do NOT apply any limit on number of items returned.',
    'If you skip even one printed menu item, the response is incomplete and wrong.',
    '',
    'For each menu item return:',
    '- name: exact item name as written on the menu',
    '- menuSection: section name from menu (e.g. "Starters", "Sides") or null',
    '- shortDescription: 1-2 sentences, max 12 words total, from diet perspective for the user goal',
    '- estimatedCalories, estimatedProteinG, estimatedCarbsG, estimatedFatG: integer estimates (standard restaurant portion ~300-400g)',
    '- confidencePercent: integer 0-100 (use 30-60 for unclear items, still include them)',
    '- flags: boolean fields — set true when the dish CLEARLY matches. Be decisive, not conservative:',
    '    leanProtein: true for grilled/baked/poached chicken, fish, turkey WITHOUT cream sauce',
    '    veggieForward: true when vegetables make up more than half the dish volume',
    '    wholeFood: true for minimally processed ingredients (salads, grilled meats, eggs, fresh fish)',
    '    fried: TRUE for: french fries, croquettes, fried chicken, tempura, battered fish, schnitzel, any deep-fried item — DO NOT leave this false for fried foods',
    '    dessert: TRUE for: brownie, cake, tiramisu, gelato, ice cream, mousse, tart, pudding, cheesecake, any sweet dessert — DO NOT leave this false for desserts',
    '    sugaryDrink: true for sodas, juices, milkshakes, smoothies, sweetened beverages',
    '    refinedCarbHeavy: true when white pasta, white rice, white bread, or pizza dough is the dominant ingredient',
    '    highFatSauce: true for cream sauces, cheese sauces, truffle mayo, hollandaise, gravy, rich dressings',
    '    processed: true for burgers with processed buns, hot dogs, deli meats, packaged/fast-food style items',
    'Important: fried and dessert flags are the most critical for correct recommendations.',
    'When in doubt about fried or dessert — set to TRUE.',
    '- allergenSignals:',
    `    contains: list only allergens definitely present from: ${params.selectedAllergies.length > 0 ? params.selectedAllergies.join(', ') : 'none selected'}`,
    '    unclear: true if allergen presence is uncertain',
    '    noListedAllergen: true if none of user selected allergens are present',
    '- dislikes:',
    '    containsDislikedIngredient: true if dish contains any user dislike',
    '    removableDislikedIngredients: list of disliked ingredients that can be omitted on request',
    '',
    'FINAL CHECK: Before writing your response, scan every section header visible on the menu.',
    'Count items under each section and verify your dishes array matches that count.',
    'If any section is missing items — add them now.',
  ].join('\n');
}

function pickObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function toBool(value: unknown): boolean {
  return value === true;
}

function toText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean)
    : [];
}

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  if (typeof value === 'string') {
    const normalized = value.replace(',', '.').match(/-?\d+(\.\d+)?/);
    if (normalized) {
      const parsedValue = Number(normalized[0]);
      if (Number.isFinite(parsedValue)) return Math.round(parsedValue);
    }
  }
  return 0;
}

function toExtractedDishLike(value: unknown): Partial<ExtractedDish> {
  return pickObject(value) as Partial<ExtractedDish>;
}

function sanitizeParsedResult(parsed: unknown): MenuExtractionAIResponse {
  const root = pickObject(parsed);
  const dishesInput = Array.isArray(root.dishes)
    ? root.dishes
    : Array.isArray((root as { items?: unknown[] }).items)
      ? (root as { items: unknown[] }).items
      : [];

  const dishes = dishesInput
    .map((dish: unknown): RawDish | null => {
      if (!dish || typeof dish !== 'object' || Array.isArray(dish)) return null;
      const source = dish as Record<string, unknown>;
      const extracted = toExtractedDishLike(dish);

      const rawName = toText(source.name ?? extracted.name);
      if (!rawName) return null;

      const nutritionRaw = pickObject(source.nutrition);
      const dietRaw =
        pickObject(source.diet_flags).vegan !== undefined
          ? pickObject(source.diet_flags)
          : pickObject(source.dietFlags);
      const cookingRaw =
        pickObject(source.cooking_flags).fried !== undefined
          ? pickObject(source.cooking_flags)
          : pickObject(source.cookingFlags);
      const flagsRaw = pickObject(source.flags);
      const allergenSignalsRaw = pickObject(source.allergenSignals);
      const dislikesRaw = pickObject(source.dislikes);

      const detectedDislikes = toStringArray(
        source.detected_dislikes ??
          source.detectedDislikes ??
          dislikesRaw.removableDislikedIngredients
      );
      const detectedAllergies = toStringArray(
        source.detected_allergies ?? source.detectedAllergies ?? allergenSignalsRaw.contains
      );

      return {
        name: rawName,
        nutrition: {
          caloriesKcal: toNumber(
            nutritionRaw.caloriesKcal ??
              source.estimatedCalories ??
              source.estimatedCaloriesKcal ??
              extracted.estimatedCalories ??
              source.caloriesKcal
          ),
          proteinG: toNumber(
            nutritionRaw.proteinG ?? source.estimatedProteinG ?? extracted.estimatedProteinG ?? source.proteinG
          ),
          carbsG: toNumber(
            nutritionRaw.carbsG ?? source.estimatedCarbsG ?? extracted.estimatedCarbsG ?? source.carbsG
          ),
          fatG: toNumber(
            nutritionRaw.fatG ?? source.estimatedFatG ?? extracted.estimatedFatG ?? source.fatG
          ),
        },
        detected_dislikes: detectedDislikes,
        detected_allergies: detectedAllergies,
        diet_flags: {
          vegan: toBool(dietRaw.vegan),
          vegetarian: toBool(dietRaw.vegetarian),
          gluten_free: toBool(dietRaw.gluten_free ?? dietRaw.glutenFree),
          lactose_free: toBool(dietRaw.lactose_free ?? dietRaw.lactoseFree),
          keto: toBool(dietRaw.keto),
          paleo: toBool(dietRaw.paleo),
        },
        cooking_flags: {
          fried: toBool(cookingRaw.fried ?? flagsRaw.fried),
          high_sugar: toBool(
            cookingRaw.high_sugar ??
              cookingRaw.highSugar ??
              flagsRaw.dessert ??
              flagsRaw.sugaryDrink
          ),
          heavy_sauce: toBool(
            cookingRaw.heavy_sauce ?? cookingRaw.heavySauce ?? flagsRaw.highFatSauce
          ),
          processed: toBool(cookingRaw.processed ?? flagsRaw.processed),
        },
        short_description:
          toText(
            source.short_description ??
              source.shortDescription ??
              extracted.shortDescription ??
              source.reasonShort
          ) || 'No description available.',
      };
    })
    .filter((dish: RawDish | null): dish is RawDish => Boolean(dish));

  return { dishes };
}

function sanitizeAndReturn(parsed: unknown): MenuExtractionAIResponse {
  const sanitized = sanitizeParsedResult(parsed);
  return {
    dishes: sanitized.dishes.map((dish) => ({
      name: dish.name,
      nutrition: {
        caloriesKcal: toNumber(dish.nutrition?.caloriesKcal),
        proteinG: toNumber(dish.nutrition?.proteinG),
        carbsG: toNumber(dish.nutrition?.carbsG),
        fatG: toNumber(dish.nutrition?.fatG),
      },
      detected_dislikes: Array.isArray(dish.detected_dislikes) ? dish.detected_dislikes : [],
      detected_allergies: Array.isArray(dish.detected_allergies) ? dish.detected_allergies : [],
      diet_flags: {
        vegan: toBool(dish.diet_flags?.vegan),
        vegetarian: toBool(dish.diet_flags?.vegetarian),
        gluten_free: toBool(dish.diet_flags?.gluten_free),
        lactose_free: toBool(dish.diet_flags?.lactose_free),
        keto: toBool(dish.diet_flags?.keto),
        paleo: toBool(dish.diet_flags?.paleo),
      },
      cooking_flags: {
        fried: toBool(dish.cooking_flags?.fried),
        high_sugar: toBool(dish.cooking_flags?.high_sugar),
        heavy_sauce: toBool(dish.cooking_flags?.heavy_sauce),
        processed: toBool(dish.cooking_flags?.processed),
      },
      short_description: toText(dish.short_description) || 'No description available.',
    })),
  };
}

function stripControlChars(text: string): string {
  return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
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
  if (inString && escaped) candidate += '\\';
  if (inString) candidate += '"';

  for (let i = stack.length - 1; i >= 0; i -= 1) {
    candidate += stack[i] === '{' ? '}' : ']';
  }

  return candidate;
}

function extractFirstBalancedJson(text: string, openChar: '{' | '[', closeChar: '}' | ']'): string | null {
  const start = text.indexOf(openChar);
  if (start < 0) return null;

  let inString = false;
  let escaped = false;
  const stack: Array<'{' | '['> = [];

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
    if (ch === '{' || ch === '[') {
      stack.push(ch);
      continue;
    }
    if (ch === '}' || ch === ']') {
      const open = stack.pop();
      if (!open) continue;
      if ((open === '{' && ch !== '}') || (open === '[' && ch !== ']')) return null;
      if (stack.length === 0 && text[start] === openChar && ch === closeChar) {
        return text.slice(start, i + 1).trim();
      }
    }
  }
  return null;
}

function parseJsonWithRecovery(rawText: string): { parsed: unknown; strategy: string } | null {
  const seen = new Set<string>();
  const candidates: Array<{ strategy: string; text: string }> = [];

  const sanitized = sanitizeJsonText(rawText);
  candidates.push({ strategy: 'direct', text: sanitized });
  const stripped = stripControlChars(sanitized);
  if (stripped !== sanitized) {
    candidates.push({ strategy: 'strip_control_chars', text: stripped });
  }

  const firstBrace = sanitized.indexOf('{');
  const lastBrace = sanitized.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const bounded = sanitized.slice(firstBrace, lastBrace + 1).trim();
    if (bounded) candidates.push({ strategy: 'bounded_json', text: bounded });
    const noTrailingCommas = bounded.replace(/,\s*([}\]])/g, '$1');
    if (noTrailingCommas) {
      candidates.push({ strategy: 'drop_trailing_commas', text: noTrailingCommas });
    }
  }

  const autoClosed = autoCloseLikelyTruncatedJson(sanitized);
  if (autoClosed) {
    candidates.push({ strategy: 'auto_close_truncated', text: autoClosed });
    candidates.push({
      strategy: 'auto_close_truncated_no_trailing_commas',
      text: autoClosed.replace(/,\s*([}\]])/g, '$1'),
    });
  }

  const firstBalancedObject = extractFirstBalancedJson(sanitized, '{', '}');
  if (firstBalancedObject) {
    candidates.push({ strategy: 'first_balanced_object', text: firstBalancedObject });
  }
  const firstBalancedArray = extractFirstBalancedJson(sanitized, '[', ']');
  if (firstBalancedArray) {
    candidates.push({ strategy: 'first_balanced_array', text: firstBalancedArray });
  }

  for (const candidate of candidates) {
    const text = candidate.text.trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    try {
      return { parsed: JSON.parse(text) as unknown, strategy: candidate.strategy };
    } catch {
      // continue
    }
  }
  return null;
}

function extractDishObjectsFallback(rawText: string): RawDish[] {
  const sanitized = sanitizeJsonText(stripControlChars(rawText));
  const dishesKeyIndex = sanitized.indexOf('"dishes"');
  const arrayStart = dishesKeyIndex >= 0 ? sanitized.indexOf('[', dishesKeyIndex) : sanitized.indexOf('[');
  if (arrayStart < 0) return [];

  const collected: RawDish[] = [];
  const seenNames = new Set<string>();
  let inString = false;
  let escaped = false;
  let objectDepth = 0;
  let objectStart = -1;

  for (let i = arrayStart + 1; i < sanitized.length; i += 1) {
    const ch = sanitized[i];
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
      if (objectDepth === 0) objectStart = i;
      objectDepth += 1;
      continue;
    }
    if (ch === '}') {
      objectDepth = Math.max(0, objectDepth - 1);
      if (objectDepth === 0 && objectStart >= 0) {
        const objText = sanitized.slice(objectStart, i + 1);
        const recovered = parseJsonWithRecovery(objText);
        if (recovered && recovered.parsed && typeof recovered.parsed === 'object') {
          const normalized = sanitizeParsedResult({ dishes: [recovered.parsed] });
          const dish = normalized.dishes[0];
          if (dish && !seenNames.has(dish.name.toLowerCase())) {
            seenNames.add(dish.name.toLowerCase());
            collected.push(dish);
          }
        }
        objectStart = -1;
      }
      continue;
    }
    if (ch === ']' && objectDepth === 0) {
      break;
    }
  }

  return collected;
}

function normalizeParsedRoot(parsed: unknown): Record<string, unknown> {
  if (Array.isArray(parsed)) return { dishes: parsed };
  const root = pickObject(parsed);
  if (Array.isArray(root.dishes)) return root;
  if (Array.isArray((root as { items?: unknown[] }).items)) {
    return { ...root, dishes: (root as { items: unknown[] }).items };
  }
  return root;
}

function parseMenuAnalysisJson(rawText: string): { parsed: Record<string, unknown>; strategy: string } | null {
  const recovered = parseJsonWithRecovery(rawText);
  if (recovered) {
    const normalized = normalizeParsedRoot(recovered.parsed);
    if (Array.isArray(normalized.dishes)) {
      return { parsed: normalized, strategy: recovered.strategy };
    }
  }

  const fallbackDishes = extractDishObjectsFallback(rawText);
  if (fallbackDishes.length > 0) {
    return { parsed: { dishes: fallbackDishes }, strategy: 'dish_object_scan' };
  }
  return null;
}

export async function analyzeMenuWithGemini(params: {
  images: Array<{ base64: string; mimeType: string }>;
  userGoal: string;
  userDislikes: string[];
  selectedAllergies?: string[];
  analysisId?: number;
  sessionId?: string;
}): Promise<MenuExtractionAIResponse> {
  const key = requireApiKey();
  const images = (params.images ?? []).filter(
    (img) => Boolean(img?.base64) && Boolean(img?.mimeType)
  );
  if (images.length === 0) {
    throw new Error('No menu images were provided for analysis');
  }

  const prompt = buildExtractionPrompt({
    userGoal: params.userGoal,
    userDislikes: params.userDislikes ?? [],
    selectedAllergies: params.selectedAllergies ?? [],
    imagesCount: images.length,
  });

  const compactRetryPrompt = [
    prompt,
    '',
    'RETRY MODE: Keep JSON compact. Include ALL items. Required keys: name, estimatedCalories, estimatedProteinG, estimatedCarbsG, estimatedFatG, confidencePercent.',
  ].join('\n');

  const outputMaxTokens = getMenuScanMaxTokens(images.length);
  const compactOutputTokens = Math.max(8192, Math.round(outputMaxTokens * 0.85));

  const buildParts = (promptText: string) => {
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
      { text: promptText },
    ];
    for (const img of images) {
      parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
    }
    return parts;
  };

  const mainParts = buildParts(prompt);
  const compactParts = buildParts(compactRetryPrompt);

  logAIDebug({
    level: 'info',
    task: 'menu_scan',
    stage: 'menu_analysis.request_prompt',
    message: 'Prepared prompt for menu analysis',
    analysisId: params.analysisId,
    sessionId: params.sessionId,
    model: PRIMARY_MODEL,
    details: {
      prompt,
      maxOutputTokens: outputMaxTokens,
      imagesCount: images.length,
      imageMimeTypes: images.map((img) => img.mimeType),
      imageBase64TotalLen: images.reduce((sum, img) => sum + img.base64.length, 0),
      requestMode: 'normal',
    },
  });

  const structuredBody = {
    contents: [{ role: 'user', parts: mainParts }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: MENU_EXTRACTION_SCHEMA,
      temperature: 0.2,
      maxOutputTokens: outputMaxTokens,
      thinkingConfig: { thinkingBudget: 1024 },
    },
  };

  const buildPlainBody = (): object => ({
    contents: [{ role: 'user', parts: mainParts }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: outputMaxTokens,
      thinkingConfig: { thinkingBudget: 1024 },
    },
  });

  const buildLightweightBody = (): object => ({
    contents: [{ role: 'user', parts: compactParts }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.2,
      maxOutputTokens: compactOutputTokens,
      thinkingConfig: { thinkingBudget: 512 },
    },
  });

  const firstAttempt = await runWithFallback({
    taskType: 'menu_scan',
    apiKey: key,
    body: structuredBody,
    debugSessionId: params.sessionId,
    debugAnalysisId: params.analysisId,
    debugMeta: {
      stage: 'menu_analysis',
      rawSchemaVersion: 'v1',
      imagesCount: images.length,
      imageMimeTypes: images.map((img) => img.mimeType),
      base64Len: images.reduce((sum, img) => sum + img.base64.length, 0),
    },
    supportsPlainFallback: true,
    buildPlainBody,
    buildLightweightBody,
  });

  if (!firstAttempt.rawText || !firstAttempt.rawText.trim()) {
    throw new MenuAnalysisInvalidJsonError({
      raw: '',
      model: firstAttempt.model || PRIMARY_MODEL,
      message: 'Empty model response',
    });
  }

  const parsedFirst = parseMenuAnalysisJson(firstAttempt.rawText);
  if (!parsedFirst) {
    logAIDebug({
      level: 'warn',
      task: 'menu_scan',
      stage: 'menu_analysis.parse_failed',
      message: 'First menu analysis output was not valid JSON',
      analysisId: params.analysisId,
      sessionId: params.sessionId,
      model: firstAttempt.model,
      details: { rawLen: firstAttempt.rawText.length },
    });
    throw new MenuAnalysisInvalidJsonError({
      raw: firstAttempt.rawText,
      model: firstAttempt.model || PRIMARY_MODEL,
      message: 'Model returned invalid JSON',
    });
  }

  if (parsedFirst.strategy !== 'direct') {
    logAIDebug({
      level: 'warn',
      task: 'menu_scan',
      stage: 'menu_analysis.parse_recovered',
      message: 'Recovered non-strict JSON from first attempt',
      analysisId: params.analysisId,
      sessionId: params.sessionId,
      model: firstAttempt.model,
      details: {
        strategy: parsedFirst.strategy,
        rawLen: firstAttempt.rawText.length,
      },
    });
  }

  const data = parsedFirst.parsed;

  // If dish count seems too low for the number of images — retry once
  const dishCount = (data as { dishes?: unknown[] }).dishes?.length ?? 0;
  if (shouldRetryForCompleteness(images.length, dishCount)) {
    logAIDebug({
      level: 'warn',
      task: 'menu_scan',
      stage: 'menu_analysis.completeness_retry',
      message: 'Result looks incomplete for number of images; retrying once',
      analysisId: params.analysisId,
      sessionId: params.sessionId,
      model: firstAttempt.model,
      details: {
        dishCount,
        imagesCount: images.length,
        thresholdTriggered: true,
      },
    });

    const retryBody = {
      contents: [{ role: 'user', parts: compactParts }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: MENU_EXTRACTION_SCHEMA,
        temperature: 0.2,
        maxOutputTokens: compactOutputTokens,
        thinkingConfig: { thinkingBudget: 1024 },
      },
    };

    try {
      const retryResult = await runWithFallback({
        taskType: 'menu_scan',
        apiKey: key,
        body: retryBody,
        debugSessionId: params.sessionId,
        debugAnalysisId: params.analysisId,
        debugMeta: {
          stage: 'menu_analysis.completeness_retry',
          rawSchemaVersion: 'v1',
          imagesCount: images.length,
          imageMimeTypes: images.map((img) => img.mimeType),
          base64Len: images.reduce((sum, img) => sum + img.base64.length, 0),
        },
        supportsPlainFallback: true,
        buildPlainBody: buildLightweightBody,
      });

      const retrySanitized = sanitizeJsonText(retryResult.rawText);
      let retryParsed = JSON.parse(retrySanitized) as { dishes?: unknown[] };
      if (!Array.isArray(retryParsed?.dishes)) {
        const retryRecovered = parseMenuAnalysisJson(retryResult.rawText);
        if (retryRecovered) {
          retryParsed = retryRecovered.parsed as { dishes?: unknown[] };
        }
      }

      const retryDishCount = retryParsed.dishes?.length ?? 0;

      // Use retry result only if it found MORE dishes
      if (retryDishCount > dishCount) {
        return sanitizeAndReturn(retryParsed);
      }
    } catch {
      // Keep original result if retry fails
    }
  }

  return sanitizeAndReturn(data);
}
