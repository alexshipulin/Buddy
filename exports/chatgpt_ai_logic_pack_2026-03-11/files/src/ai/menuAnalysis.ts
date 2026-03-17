import type {
  Allergy,
  DietaryPreference,
  ExtractedDish,
  Goal,
  MenuExtractionResponse,
} from '../domain/models';
import {
  MenuAnalysisValidationError,
  type ValidationIssue,
  validateMenuAnalysisResponse,
} from '../validation/menuAnalysisValidator';
import { requireApiKey, runWithFallback, sanitizeJsonText } from './geminiClient';
import { logAIDebug } from './aiDebugLog';
import { createId } from '../utils/id';

export type MenuAnalysisResponse = MenuExtractionResponse;

export const PRIMARY_MODEL = process.env.EXPO_PUBLIC_GEMINI_MODEL ?? 'gemini-2.5-flash';

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

const EXTRACTION_DISH_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    menuSection: { type: 'string', nullable: true },
    shortDescription: { type: 'string', nullable: true },
    estimatedCalories: { type: 'number', nullable: true },
    estimatedProteinG: { type: 'number', nullable: true },
    estimatedCarbsG: { type: 'number', nullable: true },
    estimatedFatG: { type: 'number', nullable: true },
    confidencePercent: { type: 'number' },
    dietBadges: { type: 'array', items: { type: 'string' } },
    flags: { type: 'object' },
    allergenSignals: { type: 'object' },
    dislikes: { type: 'object' },
    constructorMeta: { type: 'object' },
  },
  required: [
    'name',
    'estimatedCalories',
    'estimatedProteinG',
    'estimatedCarbsG',
    'estimatedFatG',
    'confidencePercent',
  ],
} as const;

const MENU_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    dishes: {
      type: 'array',
      items: EXTRACTION_DISH_SCHEMA,
    },
  },
  required: ['dishes'],
} as const;

function getMenuScanMaxTokens(imagesCount: number): number {
  if (imagesCount >= 5) return 3600;
  if (imagesCount >= 3) return 3000;
  if (imagesCount >= 2) return 2600;
  return 2200;
}

function trimText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toNullableInt(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.round(value);
}

function dedupeStrings(values: string[], max: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
    if (out.length >= max) break;
  }
  return out;
}

function parseBuildComponents(name: string): string[] {
  const source = name
    .replace(/^(build|custom)\s*:\s*/i, '')
    .split('+')
    .map((item) => item.trim())
    .filter(Boolean);
  return dedupeStrings(source, 6);
}

function normalizeFlagsFromHints(raw: Record<string, unknown>): ExtractedDish['flags'] {
  const source = raw.flags && typeof raw.flags === 'object' && !Array.isArray(raw.flags)
    ? (raw.flags as Record<string, unknown>)
    : {};
  const hints = [
    ...(Array.isArray(raw.pins) ? raw.pins.map((entry) => trimText(entry)) : []),
    ...(Array.isArray(raw.riskPins) ? raw.riskPins.map((entry) => trimText(entry)) : []),
    trimText(raw.shortReason),
    trimText(raw.name),
  ]
    .join(' ')
    .toLocaleLowerCase();

  const boolOrHint = (key: string, tokenList: string[]): boolean | undefined => {
    if (typeof source[key] === 'boolean') return source[key] as boolean;
    if (tokenList.some((token) => hints.includes(token))) return true;
    return undefined;
  };

  return {
    leanProtein: boolOrHint('leanProtein', ['lean protein', 'high protein', 'protein-forward']),
    veggieForward: boolOrHint('veggieForward', ['veggie', 'vegetable', 'salad']),
    wholeFood: boolOrHint('wholeFood', ['whole food', 'fresh', 'wholegrain', 'whole grain']),
    fried: boolOrHint('fried', ['fried', 'deep-fried', 'deep fried']),
    dessert: boolOrHint('dessert', ['dessert', 'cake', 'bun', 'croissant', 'pastry']),
    sugaryDrink: boolOrHint('sugaryDrink', ['soda', 'cola', 'juice', 'sweet tea', 'milkshake']),
    refinedCarbHeavy: boolOrHint('refinedCarbHeavy', ['refined', 'white bread', 'pasta', 'bun']),
    highFatSauce: boolOrHint('highFatSauce', ['mayo', 'aioli', 'cream', 'alfredo', 'butter sauce']),
    processed: boolOrHint('processed', ['processed', 'ultra-processed', 'ultra processed']),
  };
}

function normalizeAllergenSignals(
  raw: Record<string, unknown>,
  selectedAllergies: string[]
): ExtractedDish['allergenSignals'] {
  const source = raw.allergenSignals && typeof raw.allergenSignals === 'object' && !Array.isArray(raw.allergenSignals)
    ? (raw.allergenSignals as Record<string, unknown>)
    : {};
  const contains = Array.isArray(source.contains)
    ? dedupeStrings(source.contains.map((entry) => trimText(entry)), 8)
    : [];

  const legacyAllergenNote = trimText(raw.allergenNote);
  const riskPins = Array.isArray(raw.riskPins)
    ? raw.riskPins.map((entry) => trimText(entry).toLocaleLowerCase())
    : [];

  const unclear = typeof source.unclear === 'boolean'
    ? source.unclear
    : legacyAllergenNote.toLocaleLowerCase().includes('may contain') || riskPins.includes('allergen');

  const noListedAllergen = typeof source.noListedAllergen === 'boolean'
    ? source.noListedAllergen
    : selectedAllergies.length > 0 && !unclear && contains.length === 0;

  if (contains.length === 0 && !unclear && !noListedAllergen) return undefined;
  return {
    contains: contains.length > 0 ? contains : undefined,
    unclear,
    noListedAllergen,
  };
}

function normalizeDislikeSignals(raw: Record<string, unknown>): ExtractedDish['dislikes'] {
  const source = raw.dislikes && typeof raw.dislikes === 'object' && !Array.isArray(raw.dislikes)
    ? (raw.dislikes as Record<string, unknown>)
    : {};

  const removable = Array.isArray(source.removableDislikedIngredients)
    ? dedupeStrings(source.removableDislikedIngredients.map((entry) => trimText(entry)), 8)
    : [];

  const noLine = trimText(raw.noLine);
  if (noLine.startsWith('No ')) {
    removable.push(noLine.slice(3).trim());
  }

  const containsDislikedIngredient =
    typeof source.containsDislikedIngredient === 'boolean'
      ? source.containsDislikedIngredient
      : Boolean(noLine);

  if (!containsDislikedIngredient && removable.length === 0) return undefined;
  return {
    containsDislikedIngredient,
    removableDislikedIngredients: dedupeStrings(removable, 8),
  };
}

function normalizeConstructorMeta(raw: Record<string, unknown>): ExtractedDish['constructorMeta'] {
  const source =
    raw.constructorMeta && typeof raw.constructorMeta === 'object' && !Array.isArray(raw.constructorMeta)
      ? (raw.constructorMeta as Record<string, unknown>)
      : {};

  const componentsFromSource = Array.isArray(source.components)
    ? dedupeStrings(source.components.map((entry) => trimText(entry)), 8)
    : [];
  const componentsFromName = parseBuildComponents(trimText(raw.name));
  const components = dedupeStrings([...componentsFromSource, ...componentsFromName], 8);
  const isCustom =
    typeof source.isCustom === 'boolean'
      ? source.isCustom
      : /^(build|custom)\s*:/i.test(trimText(raw.name));

  if (!isCustom && components.length === 0) return undefined;
  return {
    isCustom,
    components: components.length > 0 ? components : undefined,
  };
}

function normalizeDish(raw: unknown, selectedAllergies: string[]): ExtractedDish | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;

  const name = trimText(obj.name);
  if (!name) return null;

  const confidencePercent =
    typeof obj.confidencePercent === 'number' && Number.isFinite(obj.confidencePercent)
      ? Math.max(0, Math.min(100, Math.round(obj.confidencePercent)))
      : 60;

  const dietBadges = Array.isArray(obj.dietBadges)
    ? dedupeStrings(obj.dietBadges.map((entry) => trimText(entry)), 6)
    : [];

  return {
    id: trimText(obj.id) || undefined,
    name,
    menuSection: trimText(obj.menuSection) || null,
    shortDescription:
      trimText(obj.shortDescription) || trimText(obj.shortReason) || null,
    estimatedCalories: toNullableInt(obj.estimatedCalories),
    estimatedProteinG: toNullableInt(obj.estimatedProteinG),
    estimatedCarbsG: toNullableInt(obj.estimatedCarbsG),
    estimatedFatG: toNullableInt(obj.estimatedFatG),
    confidencePercent,
    dietBadges: dietBadges.length > 0 ? dietBadges : undefined,
    flags: normalizeFlagsFromHints(obj),
    allergenSignals: normalizeAllergenSignals(obj, selectedAllergies),
    dislikes: normalizeDislikeSignals(obj),
    constructorMeta: normalizeConstructorMeta(obj),
  };
}

function flattenLegacyGroupedResponse(source: Record<string, unknown>): unknown[] {
  const out: unknown[] = [];
  for (const key of ['topPicks', 'caution', 'avoid'] as const) {
    const section = Array.isArray(source[key]) ? source[key] : [];
    for (const dish of section) out.push(dish);
  }
  return out;
}

function normalizeMenuExtractionResponse(
  source: unknown,
  selectedAllergies: string[]
): MenuExtractionResponse {
  const root = source && typeof source === 'object' && !Array.isArray(source)
    ? (source as Record<string, unknown>)
    : {};

  const rawDishes = Array.isArray(root.dishes)
    ? root.dishes
    : flattenLegacyGroupedResponse(root);

  const normalized = rawDishes
    .map((item) => normalizeDish(item, selectedAllergies))
    .filter((item): item is ExtractedDish => Boolean(item));

  const deduped: ExtractedDish[] = [];
  const seen = new Set<string>();
  for (const dish of normalized) {
    const key = `${dish.name.toLocaleLowerCase()}::${dish.menuSection ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(dish);
  }

  return { dishes: ensureTwoBuildVariants(deduped) };
}

function ensureTwoBuildVariants(dishes: ExtractedDish[]): ExtractedDish[] {
  const isBuildDish = (dish: ExtractedDish): boolean =>
    dish.constructorMeta?.isCustom === true || /^(build|custom)\s*:/i.test(dish.name);

  const existingBuilds = dishes.filter(isBuildDish);
  if (existingBuilds.length >= 2) return dishes;

  const componentPool = dedupeStrings(
    dishes.flatMap((dish) => {
      const fromMeta = dish.constructorMeta?.components ?? [];
      const fromName = parseBuildComponents(dish.name);
      return [...fromMeta, ...fromName];
    }),
    20,
  );

  if (componentPool.length < 2) return dishes;

  const takenNames = new Set(dishes.map((dish) => dish.name.trim().toLocaleLowerCase()));
  const variants: ExtractedDish[] = [];
  const required = 2 - existingBuilds.length;

  for (let i = 0; i < required; i += 1) {
    const first = componentPool[i % componentPool.length];
    const second = componentPool[(i + 1) % componentPool.length];
    const third = componentPool.length > 2 ? componentPool[(i + 2) % componentPool.length] : null;
    const components = dedupeStrings(
      [first, second, third ?? ''].filter(Boolean),
      3,
    );
    if (components.length < 2) continue;
    const name = `Build: ${components.join(' + ')}`;
    const key = name.trim().toLocaleLowerCase();
    if (takenNames.has(key)) continue;
    takenNames.add(key);
    variants.push({
      name,
      menuSection: 'Build',
      shortDescription: 'Custom build from listed menu components.',
      estimatedCalories: null,
      estimatedProteinG: null,
      estimatedCarbsG: null,
      estimatedFatG: null,
      confidencePercent: 55,
      constructorMeta: { isCustom: true, components },
    });
  }

  if (variants.length === 0) return dishes;
  return [...dishes, ...variants];
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

function parseJsonWithRecovery(rawText: string): { parsed: unknown; strategy: string } | null {
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
      const parsed = JSON.parse(text) as unknown;
      return { parsed, strategy: candidate.strategy };
    } catch {
      // continue
    }
  }
  return null;
}

function buildExtractionPrompt(params: {
  userGoal: Goal;
  dietPrefs: string[];
  allergies: string[];
  dislikes: string[];
}): string {
  const lines: string[] = [
    'Return ONLY valid JSON matching schema.',
    'Analyze all provided images as one menu.',
    'Task: dish extraction only. Do not rank recommendations.',
    'Extract every visible menu item you can confidently read, not only highlights.',
    'Do not cap list size. Include mains, sides, drinks, desserts, and specials if visible.',
    'If a build-your-own constructor exists, include concrete Build variants from listed components.',
    `Goal context: ${params.userGoal}`,
    `Selected diets: ${params.dietPrefs.join(', ') || 'none'}`,
    `Selected allergies: ${params.allergies.join(', ') || 'none'}`,
    `Dislikes: ${params.dislikes.join(', ') || 'none'}`,
    'For each dish return:',
    '- name, menuSection, shortDescription',
    '- estimatedCalories, estimatedProteinG, estimatedCarbsG, estimatedFatG',
    '- confidencePercent (0..100), dietBadges',
    '- optional flags, allergenSignals, dislikes, constructorMeta',
    'Rules:',
    '- Copy dish name exactly from menu where possible.',
    '- Use English for generated text (except copied dish name).',
    '- shortDescription must be concise.',
    '- Macros must be integer estimates or null.',
    '- Be conservative on allergens: unclear=true when uncertain.',
    '- noListedAllergen=true only when no selected allergen is visible in menu text.',
    '- Do not claim safety guarantees.',
    '- Constructor dishes are allowed only if menu clearly supports build-your-own.',
    '- Use only explicit menu components for constructor combinations.',
  ];
  return lines.join('\n');
}

function shouldRetryForCompleteness(imagesCount: number, dishCount: number): boolean {
  if (dishCount === 0) return true;
  if (imagesCount >= 4 && dishCount < 12) return true;
  if (imagesCount >= 3 && dishCount < 9) return true;
  if (imagesCount >= 2 && dishCount < 6) return true;
  if (imagesCount === 1 && dishCount < 4) return true;
  return false;
}

export type AnalyzeMenuImagesInput = { base64: string; mimeType: string }[];

export async function analyzeMenuWithGemini(params: {
  images: AnalyzeMenuImagesInput;
  analysisId?: number;
  userGoal: Goal;
  dietPrefs: string[];
  allergies: string[];
  dislikes?: string[];
  signal?: AbortSignal;
}): Promise<MenuExtractionResponse> {
  const sessionId = createId('menu_scan');
  const startedAt = Date.now();
  const apiKey = requireApiKey();
  const selectedAllergies = (params.allergies ?? []).map((item) => trimText(item)).filter(Boolean);
  const selectedDislikes = (params.dislikes ?? []).map((item) => trimText(item)).filter(Boolean);

  logAIDebug({
    level: 'info',
    task: 'menu_scan',
    stage: 'menu_analysis.start',
    message: 'Menu extraction started',
    sessionId,
    analysisId: params.analysisId,
    details: {
      imagesCount: params.images.length,
      goal: params.userGoal,
      dietPrefsCount: params.dietPrefs.length,
      allergiesCount: selectedAllergies.length,
      dislikesCount: selectedDislikes.length,
    },
  });

  const prompt = buildExtractionPrompt({
    userGoal: params.userGoal,
    dietPrefs: params.dietPrefs,
    allergies: selectedAllergies,
    dislikes: selectedDislikes,
  });

  const compactRetryPrompt = [
    prompt,
    'Retry mode:',
    '- Keep JSON compact and complete.',
    '- Required keys per dish: name, estimatedCalories, estimatedProteinG, estimatedCarbsG, estimatedFatG, confidencePercent.',
  ].join('\n');

  const outputMaxTokens = getMenuScanMaxTokens(params.images.length);
  const compactOutputTokens = Math.max(1600, Math.round(outputMaxTokens * 0.82));

  const buildBodies = (promptText: string, maxOutputTokens: number): { body: object; buildPlainBody: () => object } => {
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [{ text: promptText }];
    for (const image of params.images) {
      parts.push({ inlineData: { mimeType: image.mimeType, data: image.base64 } });
    }

    return {
      body: {
        contents: [{ role: 'user', parts }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: MENU_RESPONSE_SCHEMA,
          temperature: 0.2,
          maxOutputTokens,
        },
      },
      buildPlainBody: () => ({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens,
        },
      }),
    };
  };

  let usedModel = '';
  let rawOutput = '';
  let compactRetryUsed = false;

  const runCompactRetry = async (reason: string): Promise<{ parsed: unknown; strategy: string } | null> => {
    compactRetryUsed = true;
    const compactStartedAt = Date.now();
    try {
      const request = buildBodies(compactRetryPrompt, compactOutputTokens);
      const retry = await runWithFallback({
        taskType: 'menu_scan',
        modelChain: [PRIMARY_MODEL],
        apiKey,
        body: request.body,
        signal: params.signal,
        debugSessionId: sessionId,
        debugAnalysisId: params.analysisId,
        debugMeta: { stage: `menu_analysis.compact_retry.${reason}` },
        supportsPlainFallback: true,
        buildPlainBody: request.buildPlainBody,
      });
      usedModel = retry.model;
      rawOutput = retry.rawText;

      const recovered = parseJsonWithRecovery(rawOutput);
      logAIDebug({
        level: recovered ? 'info' : 'warn',
        task: 'menu_scan',
        stage: recovered
          ? 'menu_analysis.compact_retry.success'
          : 'menu_analysis.compact_retry.parse_failed',
        message: recovered
          ? 'Compact retry produced parseable JSON'
          : 'Compact retry returned invalid JSON',
        sessionId,
        model: usedModel,
        durationMs: Date.now() - compactStartedAt,
        details: { reason, rawLen: rawOutput.length },
      });

      return recovered;
    } catch (error) {
      logAIDebug({
        level: 'error',
        task: 'menu_scan',
        stage: 'menu_analysis.compact_retry.error',
        message: 'Compact retry request failed',
        sessionId,
        model: PRIMARY_MODEL,
        durationMs: Date.now() - compactStartedAt,
        details: {
          reason,
          errName: (error as Error)?.name,
          errMsg: (error as Error)?.message?.slice(0, 240),
        },
      });
      return null;
    }
  };

  try {
    const request = buildBodies(prompt, outputMaxTokens);
    const run = await runWithFallback({
      taskType: 'menu_scan',
      apiKey,
      body: request.body,
      signal: params.signal,
      debugSessionId: sessionId,
      debugAnalysisId: params.analysisId,
      debugMeta: { stage: 'menu_analysis' },
      supportsPlainFallback: true,
      buildPlainBody: request.buildPlainBody,
    });
    usedModel = run.model;
    rawOutput = run.rawText;
  } catch (error) {
    logAIDebug({
      level: 'error',
      task: 'menu_scan',
      stage: 'menu_analysis.run_failed',
      message: 'runWithFallback failed before parsing',
      sessionId,
      durationMs: Date.now() - startedAt,
      details: {
        errName: (error as Error)?.name,
        errMsg: (error as Error)?.message?.slice(0, 240),
        status: (error as { status?: number })?.status,
      },
    });
    const err = error as Error & { status?: number };
    throw new MenuAnalysisInvalidJsonError({
      raw: '',
      model: PRIMARY_MODEL,
      status: err.status,
      message: err.message,
    });
  }

  if (!rawOutput) {
    throw new MenuAnalysisInvalidJsonError({
      raw: '',
      model: usedModel || PRIMARY_MODEL,
      message: 'Empty model response',
    });
  }

  const looksTruncated = !rawOutput.trimEnd().endsWith('}');
  let recovered = parseJsonWithRecovery(rawOutput);

  if (!recovered || looksTruncated) {
    logAIDebug({
      level: 'warn',
      task: 'menu_scan',
      stage: 'menu_analysis.parse_retry_needed',
      message: 'Menu extraction parse is incomplete, running compact retry',
      sessionId,
      model: usedModel,
      details: {
        looksTruncated,
        rawLen: rawOutput.length,
        hasFirstParse: Boolean(recovered),
      },
    });
    const retryRecovered = await runCompactRetry('parse');
    if (retryRecovered) recovered = retryRecovered;
  }

  if (!recovered) {
    throw new MenuAnalysisInvalidJsonError({
      raw: rawOutput,
      model: usedModel || PRIMARY_MODEL,
      message: 'Model returned invalid JSON',
    });
  }

  const parseRecoveryUsed = recovered.strategy !== 'direct';

  let validated: MenuExtractionResponse;
  try {
    const normalized = normalizeMenuExtractionResponse(recovered.parsed, selectedAllergies);
    validated = validateMenuAnalysisResponse({ response: normalized });
  } catch (error) {
    if (!compactRetryUsed) {
      const retryRecovered = await runCompactRetry('validation');
      if (retryRecovered) {
        const normalized = normalizeMenuExtractionResponse(retryRecovered.parsed, selectedAllergies);
        try {
          validated = validateMenuAnalysisResponse({ response: normalized });
        } catch (finalErr) {
          if (finalErr instanceof MenuAnalysisValidationError) {
            throw new MenuAnalysisInvalidJsonError({
              raw: rawOutput,
              model: usedModel || PRIMARY_MODEL,
              message: finalErr.message,
              issues: finalErr.issues,
            });
          }
          throw finalErr;
        }
      } else {
        if (error instanceof MenuAnalysisValidationError) {
          throw new MenuAnalysisInvalidJsonError({
            raw: rawOutput,
            model: usedModel || PRIMARY_MODEL,
            message: error.message,
            issues: error.issues,
          });
        }
        throw error;
      }
    } else {
      if (error instanceof MenuAnalysisValidationError) {
        throw new MenuAnalysisInvalidJsonError({
          raw: rawOutput,
          model: usedModel || PRIMARY_MODEL,
          message: error.message,
          issues: error.issues,
        });
      }
      throw error;
    }
  }

  if (shouldRetryForCompleteness(params.images.length, validated.dishes.length) && !compactRetryUsed) {
    logAIDebug({
      level: 'warn',
      task: 'menu_scan',
      stage: 'menu_analysis.completeness_retry',
      message: 'Low dish count, running compact completeness retry',
      sessionId,
      model: usedModel,
      details: {
        imagesCount: params.images.length,
        dishCount: validated.dishes.length,
      },
    });
    const retryRecovered = await runCompactRetry('completeness');
    if (retryRecovered) {
      const normalized = normalizeMenuExtractionResponse(retryRecovered.parsed, selectedAllergies);
      try {
        const retried = validateMenuAnalysisResponse({ response: normalized });
        if (retried.dishes.length >= validated.dishes.length) {
          validated = retried;
        }
      } catch {
        // keep first validated response
      }
    }
  }

  const avgConfidence =
    validated.dishes.length > 0
      ? Math.round(
          validated.dishes.reduce((sum, dish) => sum + dish.confidencePercent, 0) /
            validated.dishes.length
        )
      : 0;

  logAIDebug({
    level: 'info',
    task: 'menu_scan',
    stage: 'menu_analysis.extraction_summary',
    message: 'AI extraction summary',
    sessionId,
    analysisId: params.analysisId,
    model: usedModel || PRIMARY_MODEL,
    durationMs: Date.now() - startedAt,
    details: {
      extractedDishCount: validated.dishes.length,
      dishNames: validated.dishes.slice(0, 30).map((dish) => dish.name),
      parseRecoveryUsed,
      compactRetryUsed,
      averageConfidence: avgConfidence,
    },
  });

  return validated;
}
