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

const GEMINI_MODEL = 'gemini-2.5-flash';

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

export type MenuRawAnalysis = {
  dishes: RawDish[];
};

type MenuRequestMode = 'normal' | 'strict_json_retry' | 'completeness_retry';

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

function sanitizeParsedResult(parsed: any): MenuRawAnalysis {
  const toBool = (value: unknown): boolean => value === true;
  const toNumber = (value: unknown): number =>
    typeof value === 'number' && Number.isFinite(value) ? value : 0;
  const toText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
  const toStringArray = (value: unknown): string[] =>
    Array.isArray(value)
      ? value
          .map((item) => (typeof item === 'string' ? item.trim() : ''))
          .filter(Boolean)
      : [];

  const dishes: unknown[] = Array.isArray(parsed?.dishes) ? parsed.dishes : [];
  const safeDishes = dishes
    .map((dish: unknown): RawDish | null => {
      if (!dish || typeof dish !== 'object' || Array.isArray(dish)) return null;
      const source = dish as Record<string, unknown>;

      const rawName = toText(source.name);
      if (!rawName) return null;

      const nutritionRaw =
        source.nutrition && typeof source.nutrition === 'object' && !Array.isArray(source.nutrition)
          ? (source.nutrition as Record<string, unknown>)
          : {};
      const dietRaw =
        source.diet_flags && typeof source.diet_flags === 'object' && !Array.isArray(source.diet_flags)
          ? (source.diet_flags as Record<string, unknown>)
          : {};
      const cookingRaw =
        source.cooking_flags &&
        typeof source.cooking_flags === 'object' &&
        !Array.isArray(source.cooking_flags)
          ? (source.cooking_flags as Record<string, unknown>)
          : {};

      return {
        name: rawName,
        nutrition: {
          caloriesKcal: toNumber(nutritionRaw.caloriesKcal),
          proteinG: toNumber(nutritionRaw.proteinG),
          carbsG: toNumber(nutritionRaw.carbsG),
          fatG: toNumber(nutritionRaw.fatG),
        },
        detected_dislikes: toStringArray(source.detected_dislikes),
        detected_allergies: toStringArray(source.detected_allergies),
        diet_flags: {
          vegan: toBool(dietRaw.vegan),
          vegetarian: toBool(dietRaw.vegetarian),
          gluten_free: toBool(dietRaw.gluten_free),
          lactose_free: toBool(dietRaw.lactose_free),
          keto: toBool(dietRaw.keto),
          paleo: toBool(dietRaw.paleo),
        },
        cooking_flags: {
          fried: toBool(cookingRaw.fried),
          high_sugar: toBool(cookingRaw.high_sugar),
          heavy_sauce: toBool(cookingRaw.heavy_sauce),
          processed: toBool(cookingRaw.processed),
        },
        short_description: toText(source.short_description) || 'No description available.',
      };
    })
    .filter((dish: RawDish | null): dish is RawDish => Boolean(dish));

  return { dishes: safeDishes };
}

async function requestMenuRawAnalysis(params: {
  imageBase64: string;
  mimeType: string;
  userGoal: string;
  userDislikes: string[];
  analysisId?: number;
  sessionId?: string;
  mode?: MenuRequestMode;
}): Promise<{ rawText: string; model: string }> {
  const key = requireApiKey();
  const mode = params.mode ?? 'normal';
  const promptLines = [
    'Return ONLY JSON. No markdown. No extra text.',
    '',
    `User goal: ${params.userGoal}`,
    `User dislikes to check specifically: ${params.userDislikes.length > 0 ? params.userDislikes.join(', ') : 'none'}`,
    '',
    'Analyze the menu photo. For each dish return:',
    '- include every visible menu item you can confidently read; do not return only a short subset',
    '- name: exact dish name as written on the menu',
    '- nutrition: estimated caloriesKcal, proteinG, carbsG, fatG (assume standard restaurant portion ~300-400g)',
    '- detected_dislikes: match ONLY from this fixed list: Spicy, Avocado, Coriander, Mushrooms, Onions, Garlic, Olives, Seafood, Mayonnaise, Tomatoes',
    '- detected_allergies: match ONLY from this fixed list: Milk, Eggs, Fish, Crustacean shellfish, Tree nuts, Peanuts, Wheat, Soy, Sesame, Celery, Lupin, Molluscs, Mustard, Sulphites',
    '- diet_flags: set true only if the dish genuinely qualifies',
    '- cooking_flags:',
    '    fried: true if deep-fried, pan-fried, or battered',
    '    high_sugar: true if dessert, sweetened sauce, glazed, or sugary drink',
    '    heavy_sauce: true if cream sauce, gravy, teriyaki glaze, or thick dressing',
    '    processed: true if clearly processed/packaged food, fast food style, or contains processed meat',
    '- short_description: 1-2 sentences, maximum 12 words total. Must fit 2 lines on a mobile screen. Be specific and diet-relevant. Examples: "Great low-cal option, rich in micronutrients.", "High protein, fits your muscle gain goal well.", "Heavy on carbs and fat, skip if cutting."',
  ];

  if (mode !== 'normal') {
    promptLines.push(
      '',
      'Retry mode:',
      '- Output must be syntactically valid JSON object with key "dishes".',
      '- Do not add comments, notes, or trailing commas.',
      '- Do not wrap JSON in markdown fences.'
    );
  }
  if (mode === 'completeness_retry') {
    promptLines.push(
      '- Prioritize completeness: include all readable items across sections (starters, mains, sides, desserts, drinks).',
      '- If an item is readable but uncertain, include best-effort transcription instead of skipping.',
      '- Keep each short_description to 8 words max.',
      '- Keep JSON compact (no pretty formatting).'
    );
  }
  const prompt = promptLines.join('\n');
  const maxOutputTokens = mode === 'strict_json_retry' ? 2600 : mode === 'completeness_retry' ? 3800 : 3200;
  logAIDebug({
    level: 'info',
    task: 'menu_scan',
    stage: 'menu_analysis.request_prompt',
    message: 'Prepared prompt for menu analysis',
    analysisId: params.analysisId,
    sessionId: params.sessionId,
    model: GEMINI_MODEL,
    details: {
      requestMode: mode,
      prompt,
      maxOutputTokens,
    },
  });

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: prompt },
    { inlineData: { mimeType: params.mimeType, data: params.imageBase64 } },
  ];

  const body = {
    contents: [
      {
        parts,
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: MENU_RAW_SCHEMA,
      temperature: 0.2,
      maxOutputTokens,
    },
  };

  const buildPlainBody = (): object => ({
    contents: [{ parts }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens,
    },
  });

  const { rawText, model } = await runWithFallback({
    taskType: 'menu_scan',
    apiKey: key,
    body,
    debugSessionId: params.sessionId,
    debugAnalysisId: params.analysisId,
    debugMeta: {
      stage:
        mode === 'strict_json_retry'
          ? 'menu_analysis.strict_json_retry'
          : mode === 'completeness_retry'
            ? 'menu_analysis.completeness_retry'
            : 'menu_analysis',
      rawSchemaVersion: 'v1',
      mimeType: params.mimeType,
      base64Len: params.imageBase64.length,
    },
    supportsPlainFallback: true,
    buildPlainBody,
  });

  if (!rawText || !rawText.trim()) {
    throw new Error('Empty model response');
  }

  return { rawText, model };
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

function stripControlChars(text: string): string {
  return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
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
        const parsedObj = parseJsonWithRecovery(objText);
        if (parsedObj && parsedObj.parsed && typeof parsedObj.parsed === 'object') {
          const normalized = sanitizeParsedResult({ dishes: [parsedObj.parsed] });
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

function parseMenuAnalysisJson(rawText: string): { analysis: MenuRawAnalysis; strategy: string } | null {
  const recovered = parseJsonWithRecovery(rawText);
  if (recovered) {
    const parsedRoot = Array.isArray(recovered.parsed)
      ? { dishes: recovered.parsed }
      : recovered.parsed;
    const analysis = sanitizeParsedResult(parsedRoot);
    if (analysis.dishes.length > 0) {
      return { analysis, strategy: recovered.strategy };
    }
  }

  const fallbackDishes = extractDishObjectsFallback(rawText);
  if (fallbackDishes.length > 0) {
    return { analysis: { dishes: fallbackDishes }, strategy: 'dish_object_scan' };
  }
  return null;
}

function mergeMenuAnalyses(...analyses: MenuRawAnalysis[]): MenuRawAnalysis {
  const merged: RawDish[] = [];
  const seen = new Set<string>();
  for (const analysis of analyses) {
    for (const dish of analysis.dishes) {
      const key = dish.name.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(dish);
    }
  }
  return { dishes: merged };
}

function shouldRunRetryForCompleteness(firstParsed: {
  analysis: MenuRawAnalysis;
  strategy: string;
}, model: string, rawTextLen: number): {
  shouldRetry: boolean;
  reason: 'none' | 'recovered_small_result' | 'direct_too_few_items' | 'direct_possible_incomplete';
} {
  const dishCount = firstParsed.analysis.dishes.length;
  if (firstParsed.strategy !== 'direct') {
    if (/flash-lite/i.test(model)) {
      return { shouldRetry: dishCount < 8, reason: dishCount < 8 ? 'recovered_small_result' : 'none' };
    }
    return { shouldRetry: dishCount < 10, reason: dishCount < 10 ? 'recovered_small_result' : 'none' };
  }

  // Hard floor: a direct JSON with 1-3 dishes is almost always incomplete menu extraction.
  if (dishCount < 4) {
    return { shouldRetry: true, reason: 'direct_too_few_items' };
  }

  const likelyOutputBound = rawTextLen >= 9000 && dishCount < 24;
  const likelyPartialList = rawTextLen >= 6000 && dishCount < 18;
  if (likelyOutputBound || likelyPartialList) {
    return { shouldRetry: true, reason: 'direct_possible_incomplete' };
  }
  return { shouldRetry: false, reason: 'none' };
}

export async function analyzeMenuWithGemini(params: {
  imageBase64: string;
  mimeType: string;
  userGoal: string;
  userDislikes: string[];
  analysisId?: number;
  sessionId?: string;
}): Promise<MenuRawAnalysis> {
  const firstAttempt = await requestMenuRawAnalysis({
    ...params,
    mode: 'normal',
  });
  const firstParsed = parseMenuAnalysisJson(firstAttempt.rawText);
  if (firstParsed) {
    const retryDecision = shouldRunRetryForCompleteness(
      firstParsed,
      firstAttempt.model,
      firstAttempt.rawText.length
    );

    if (firstParsed.strategy !== 'direct') {
      logAIDebug({
        level: 'warn',
        task: 'menu_scan',
        stage: 'menu_analysis.parse_recovered',
        message: retryDecision.shouldRetry
          ? 'Recovered non-strict JSON from first attempt; running strict retry for completeness'
          : 'Recovered non-strict JSON from first attempt; using recovered result',
        analysisId: params.analysisId,
        sessionId: params.sessionId,
        model: firstAttempt.model,
        details: {
          strategy: firstParsed.strategy,
          rawLen: firstAttempt.rawText.length,
          recoveredDishCount: firstParsed.analysis.dishes.length,
          shouldRetryForCompleteness: retryDecision.shouldRetry,
          retryReason: retryDecision.reason,
        },
      });
    } else if (retryDecision.shouldRetry) {
      logAIDebug({
        level: 'warn',
        task: 'menu_scan',
        stage: 'menu_analysis.completeness_retry',
        message: 'Direct JSON may be incomplete; running completeness retry',
        analysisId: params.analysisId,
        sessionId: params.sessionId,
        model: firstAttempt.model,
        details: {
          strategy: firstParsed.strategy,
          rawLen: firstAttempt.rawText.length,
          firstDishCount: firstParsed.analysis.dishes.length,
          retryReason: retryDecision.reason,
        },
      });
    }

    if (!retryDecision.shouldRetry) return firstParsed.analysis;
  } else {
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
  }

  let retryAttempt: { rawText: string; model: string } | null = null;
  const retryMode: MenuRequestMode =
    firstParsed?.strategy === 'direct' ? 'completeness_retry' : 'strict_json_retry';
  try {
    retryAttempt = await requestMenuRawAnalysis({
      ...params,
      mode: retryMode,
    });
  } catch (retryError) {
    if (firstParsed) {
      const firstDishCount = firstParsed.analysis.dishes.length;
      logAIDebug({
        level: 'warn',
        task: 'menu_scan',
        stage: 'menu_analysis.retry_request_failed_using_recovered',
        message: 'Retry request failed; using first recovered result',
        analysisId: params.analysisId,
        sessionId: params.sessionId,
        details: {
          firstStrategy: firstParsed.strategy,
          firstDishCount,
          retryMode,
          errName: (retryError as Error)?.name,
          errMsg: (retryError as Error)?.message?.slice(0, 240),
        },
      });
      if (firstDishCount < 4) {
        throw new MenuAnalysisInvalidJsonError({
          raw: firstAttempt.rawText,
          model: firstAttempt.model || GEMINI_MODEL,
          message: 'Could not verify complete menu extraction after retry failure',
        });
      }
      return firstParsed.analysis;
    }
    throw retryError;
  }

  if (!retryAttempt) {
    if (firstParsed) return firstParsed.analysis;
    throw new MenuAnalysisInvalidJsonError({
      raw: firstAttempt.rawText,
      model: firstAttempt.model || GEMINI_MODEL,
      message: 'Model returned invalid JSON after retry',
    });
  }

  const retryParsed = parseMenuAnalysisJson(retryAttempt.rawText);
  if (retryParsed) {
    if (retryParsed.strategy !== 'direct') {
      logAIDebug({
        level: 'warn',
        task: 'menu_scan',
        stage: 'menu_analysis.parse_recovered_after_retry',
        message: 'Recovered non-strict JSON from retry attempt',
        analysisId: params.analysisId,
        sessionId: params.sessionId,
        model: retryAttempt.model,
        details: { strategy: retryParsed.strategy, rawLen: retryAttempt.rawText.length },
      });
    }
    const firstDishCount = firstParsed?.analysis.dishes.length ?? 0;
    const retryDishCount = retryParsed.analysis.dishes.length;
    let baselineBest = retryParsed.analysis;
    let baselineSource: 'retry' | 'first' | 'merged' = 'retry';
    if (firstParsed) {
      const merged = mergeMenuAnalyses(firstParsed.analysis, retryParsed.analysis);
      const mergedCount = merged.dishes.length;
      if (mergedCount > Math.max(firstDishCount, retryDishCount)) {
        logAIDebug({
          level: 'warn',
          task: 'menu_scan',
          stage: 'menu_analysis.retry_merged_result',
          message: 'Merged first and retry results to keep additional unique dishes',
          analysisId: params.analysisId,
          sessionId: params.sessionId,
          model: retryAttempt.model,
          details: { firstDishCount, retryDishCount, mergedCount, retryMode },
        });
        baselineBest = merged;
        baselineSource = 'merged';
      }
    }
    if (baselineSource === 'retry' && firstParsed && firstDishCount > retryDishCount) {
      logAIDebug({
        level: 'warn',
        task: 'menu_scan',
        stage: 'menu_analysis.retry_smaller_result',
        message: 'Retry returned fewer dishes; keeping first recovered result',
        analysisId: params.analysisId,
        sessionId: params.sessionId,
        model: retryAttempt.model,
        details: { firstDishCount, retryDishCount, retryMode },
      });
      baselineBest = firstParsed.analysis;
      baselineSource = 'first';
    }
    const baselineCount = baselineBest.dishes.length;
    if (retryMode === 'completeness_retry' && baselineCount < 4) {
      logAIDebug({
        level: 'warn',
        task: 'menu_scan',
        stage: 'menu_analysis.low_count_after_completeness_retry',
        message: 'Result still too small after completeness retry; running strict JSON fallback',
        analysisId: params.analysisId,
        sessionId: params.sessionId,
        model: retryAttempt.model,
        details: {
          baselineCount,
          baselineSource,
          firstDishCount,
          retryDishCount,
        },
      });
      try {
        const strictAttempt = await requestMenuRawAnalysis({
          ...params,
          mode: 'strict_json_retry',
        });
        const strictParsed = parseMenuAnalysisJson(strictAttempt.rawText);
        if (strictParsed) {
          const strictCount = strictParsed.analysis.dishes.length;
          const mergedWithStrict = firstParsed
            ? mergeMenuAnalyses(firstParsed.analysis, retryParsed.analysis, strictParsed.analysis)
            : mergeMenuAnalyses(retryParsed.analysis, strictParsed.analysis);
          const mergedWithStrictCount = mergedWithStrict.dishes.length;
          if (mergedWithStrictCount > baselineCount && mergedWithStrictCount >= strictCount) {
            logAIDebug({
              level: 'warn',
              task: 'menu_scan',
              stage: 'menu_analysis.low_count_strict_fallback_merged',
              message: 'Strict fallback merged additional dishes',
              analysisId: params.analysisId,
              sessionId: params.sessionId,
              model: strictAttempt.model,
              details: { baselineCount, strictCount, mergedWithStrictCount },
            });
            return mergedWithStrict;
          }
          if (strictCount > baselineCount) {
            logAIDebug({
              level: 'warn',
              task: 'menu_scan',
              stage: 'menu_analysis.low_count_strict_fallback_better',
              message: 'Strict fallback returned more dishes than baseline',
              analysisId: params.analysisId,
              sessionId: params.sessionId,
              model: strictAttempt.model,
              details: { baselineCount, strictCount },
            });
            return strictParsed.analysis;
          }
        } else {
          logAIDebug({
            level: 'warn',
            task: 'menu_scan',
            stage: 'menu_analysis.low_count_strict_fallback_parse_failed',
            message: 'Strict fallback output was not parseable',
            analysisId: params.analysisId,
            sessionId: params.sessionId,
            model: strictAttempt.model,
            details: { baselineCount, rawLen: strictAttempt.rawText.length },
          });
        }
      } catch (strictFallbackError) {
        logAIDebug({
          level: 'warn',
          task: 'menu_scan',
          stage: 'menu_analysis.low_count_strict_fallback_error',
          message: 'Strict fallback request failed; keeping baseline result',
          analysisId: params.analysisId,
          sessionId: params.sessionId,
          details: {
            baselineCount,
            errName: (strictFallbackError as Error)?.name,
            errMsg: (strictFallbackError as Error)?.message?.slice(0, 240),
          },
        });
      }
    }
    if (baselineCount < 4) {
      throw new MenuAnalysisInvalidJsonError({
        raw: retryAttempt.rawText || firstAttempt.rawText,
        model: retryAttempt.model || firstAttempt.model || GEMINI_MODEL,
        message: 'Could not verify complete menu extraction (too few detected dishes)',
      });
    }
    return baselineBest;
  }

  if (firstParsed) {
    const firstDishCount = firstParsed.analysis.dishes.length;
    logAIDebug({
      level: 'warn',
      task: 'menu_scan',
      stage: 'menu_analysis.retry_failed_using_recovered',
      message: 'Retry output failed to parse; using first recovered result',
      analysisId: params.analysisId,
      sessionId: params.sessionId,
      model: retryAttempt.model,
      details: {
        firstStrategy: firstParsed.strategy,
        firstDishCount,
        firstRawLen: firstAttempt.rawText.length,
        retryRawLen: retryAttempt.rawText.length,
        retryMode,
      },
    });
    if (firstDishCount < 4) {
      throw new MenuAnalysisInvalidJsonError({
        raw: retryAttempt.rawText || firstAttempt.rawText,
        model: retryAttempt.model || firstAttempt.model || GEMINI_MODEL,
        message: 'Could not verify complete menu extraction after parse failure',
      });
    }
    return firstParsed.analysis;
  }

  throw new MenuAnalysisInvalidJsonError({
    raw: retryAttempt.rawText || firstAttempt.rawText,
    model: retryAttempt.model || firstAttempt.model || GEMINI_MODEL,
    message: 'Model returned invalid JSON after retry',
  });
}
