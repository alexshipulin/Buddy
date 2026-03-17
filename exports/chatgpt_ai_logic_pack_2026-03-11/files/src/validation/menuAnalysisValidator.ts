import type { ExtractedDish, MenuExtractionResponse } from '../domain/models';

export type ValidationIssue = { path: string; code: string; message: string };

export class MenuAnalysisValidationError extends Error {
  issues: ValidationIssue[];
  override name = 'MenuAnalysisValidationError';
  constructor(issues: ValidationIssue[]) {
    const message = issues.length > 0 ? issues[0].message : 'Validation failed';
    super(message);
    this.issues = issues;
  }
}

function addIssue(issues: ValidationIssue[], path: string, code: string, message: string): void {
  issues.push({ path, code, message });
}

function trimStr(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function normalizeOptionalNumber(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
  options?: { min?: number; max?: number }
): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    addIssue(issues, path, 'number_or_null_expected', `${path} must be a finite number or null`);
    return null;
  }
  const rounded = Math.round(value);
  if (typeof options?.min === 'number' && rounded < options.min) {
    addIssue(issues, path, 'number_too_small', `${path} must be >= ${options.min}`);
  }
  if (typeof options?.max === 'number' && rounded > options.max) {
    addIssue(issues, path, 'number_too_large', `${path} must be <= ${options.max}`);
  }
  return rounded;
}

function normalizeBoolean(
  value: unknown,
  path: string,
  issues: ValidationIssue[]
): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'boolean') {
    addIssue(issues, path, 'boolean_expected', `${path} must be boolean`);
    return undefined;
  }
  return value;
}

function normalizeStringList(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
  maxItems: number
): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    addIssue(issues, path, 'array_expected', `${path} must be an array of strings`);
    return [];
  }
  const output: string[] = [];
  const seen = new Set<string>();
  value.forEach((item, idx) => {
    if (typeof item !== 'string' || item.trim() === '') {
      addIssue(issues, `${path}[${idx}]`, 'string_expected', `${path}[${idx}] must be a non-empty string`);
      return;
    }
    const normalized = item.trim();
    const key = normalized.toLocaleLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    output.push(normalized);
  });
  return output.slice(0, maxItems);
}

function normalizeFlags(
  value: unknown,
  basePath: string,
  issues: ValidationIssue[]
): ExtractedDish['flags'] {
  if (value === undefined || value === null) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    addIssue(issues, basePath, 'object_expected', 'flags must be an object');
    return undefined;
  }
  const obj = value as Record<string, unknown>;
  return {
    leanProtein: normalizeBoolean(obj.leanProtein, `${basePath}.leanProtein`, issues),
    veggieForward: normalizeBoolean(obj.veggieForward, `${basePath}.veggieForward`, issues),
    wholeFood: normalizeBoolean(obj.wholeFood, `${basePath}.wholeFood`, issues),
    fried: normalizeBoolean(obj.fried, `${basePath}.fried`, issues),
    dessert: normalizeBoolean(obj.dessert, `${basePath}.dessert`, issues),
    sugaryDrink: normalizeBoolean(obj.sugaryDrink, `${basePath}.sugaryDrink`, issues),
    refinedCarbHeavy: normalizeBoolean(obj.refinedCarbHeavy, `${basePath}.refinedCarbHeavy`, issues),
    highFatSauce: normalizeBoolean(obj.highFatSauce, `${basePath}.highFatSauce`, issues),
    processed: normalizeBoolean(obj.processed, `${basePath}.processed`, issues),
  };
}

function normalizeAllergenSignals(
  value: unknown,
  basePath: string,
  issues: ValidationIssue[]
): ExtractedDish['allergenSignals'] {
  if (value === undefined || value === null) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    addIssue(issues, basePath, 'object_expected', 'allergenSignals must be an object');
    return undefined;
  }
  const obj = value as Record<string, unknown>;
  const contains = normalizeStringList(obj.contains, `${basePath}.contains`, issues, 8);
  return {
    contains: contains.length > 0 ? contains : undefined,
    unclear: normalizeBoolean(obj.unclear, `${basePath}.unclear`, issues),
    noListedAllergen: normalizeBoolean(obj.noListedAllergen, `${basePath}.noListedAllergen`, issues),
  };
}

function normalizeDislikes(
  value: unknown,
  basePath: string,
  issues: ValidationIssue[]
): ExtractedDish['dislikes'] {
  if (value === undefined || value === null) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    addIssue(issues, basePath, 'object_expected', 'dislikes must be an object');
    return undefined;
  }
  const obj = value as Record<string, unknown>;
  const removable = normalizeStringList(
    obj.removableDislikedIngredients,
    `${basePath}.removableDislikedIngredients`,
    issues,
    8
  );
  return {
    containsDislikedIngredient: normalizeBoolean(
      obj.containsDislikedIngredient,
      `${basePath}.containsDislikedIngredient`,
      issues
    ),
    removableDislikedIngredients: removable.length > 0 ? removable : undefined,
  };
}

function normalizeConstructorMeta(
  value: unknown,
  basePath: string,
  issues: ValidationIssue[]
): ExtractedDish['constructorMeta'] {
  if (value === undefined || value === null) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    addIssue(issues, basePath, 'object_expected', 'constructorMeta must be an object');
    return undefined;
  }
  const obj = value as Record<string, unknown>;
  const components = normalizeStringList(obj.components, `${basePath}.components`, issues, 8);
  return {
    isCustom: normalizeBoolean(obj.isCustom, `${basePath}.isCustom`, issues),
    components: components.length > 0 ? components : undefined,
  };
}

function normalizeDish(raw: unknown, index: number, issues: ValidationIssue[]): ExtractedDish | null {
  const basePath = `dishes[${index}]`;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    addIssue(issues, basePath, 'object_expected', 'Each dish must be an object');
    return null;
  }
  const obj = raw as Record<string, unknown>;

  const name = trimStr(obj.name);
  if (!name) {
    addIssue(issues, `${basePath}.name`, 'required', 'name is required');
  }

  const confidencePercent = normalizeOptionalNumber(
    obj.confidencePercent,
    `${basePath}.confidencePercent`,
    issues,
    { min: 0, max: 100 }
  );
  if (confidencePercent == null) {
    addIssue(
      issues,
      `${basePath}.confidencePercent`,
      'required',
      'confidencePercent is required and must be number 0..100'
    );
  }

  const dietBadges = normalizeStringList(obj.dietBadges, `${basePath}.dietBadges`, issues, 6);

  const dish: ExtractedDish = {
    id: trimStr(obj.id) || undefined,
    name: name || 'Unknown dish',
    menuSection: obj.menuSection === null || obj.menuSection === undefined
      ? null
      : trimStr(obj.menuSection) || null,
    shortDescription:
      obj.shortDescription === null || obj.shortDescription === undefined
        ? null
        : trimStr(obj.shortDescription) || null,
    estimatedCalories: normalizeOptionalNumber(
      obj.estimatedCalories,
      `${basePath}.estimatedCalories`,
      issues,
      { min: 0, max: 4000 }
    ),
    estimatedProteinG: normalizeOptionalNumber(
      obj.estimatedProteinG,
      `${basePath}.estimatedProteinG`,
      issues,
      { min: 0, max: 350 }
    ),
    estimatedCarbsG: normalizeOptionalNumber(
      obj.estimatedCarbsG,
      `${basePath}.estimatedCarbsG`,
      issues,
      { min: 0, max: 450 }
    ),
    estimatedFatG: normalizeOptionalNumber(
      obj.estimatedFatG,
      `${basePath}.estimatedFatG`,
      issues,
      { min: 0, max: 250 }
    ),
    confidencePercent: confidencePercent ?? 60,
    dietBadges: dietBadges.length > 0 ? dietBadges : undefined,
    flags: normalizeFlags(obj.flags, `${basePath}.flags`, issues),
    allergenSignals: normalizeAllergenSignals(obj.allergenSignals, `${basePath}.allergenSignals`, issues),
    dislikes: normalizeDislikes(obj.dislikes, `${basePath}.dislikes`, issues),
    constructorMeta: normalizeConstructorMeta(obj.constructorMeta, `${basePath}.constructorMeta`, issues),
  };

  if (dish.shortDescription && dish.shortDescription.length > 180) {
    addIssue(
      issues,
      `${basePath}.shortDescription`,
      'too_long',
      'shortDescription must be <= 180 characters'
    );
  }

  // Be resilient to model noise: constructor metadata is optional and should not
  // fail the whole scan when only a single component is returned.
  if (dish.constructorMeta?.components && dish.constructorMeta.components.length < 2) {
    if (dish.constructorMeta.isCustom === true) {
      dish.constructorMeta = { isCustom: true };
    } else {
      dish.constructorMeta = undefined;
    }
  }

  return dish;
}

export function validateMenuAnalysisResponse(params: {
  response: unknown;
}): MenuExtractionResponse {
  const { response } = params;
  const issues: ValidationIssue[] = [];

  if (!response || typeof response !== 'object' || Array.isArray(response)) {
    addIssue(issues, '', 'object_expected', 'Response must be an object');
    throw new MenuAnalysisValidationError(issues);
  }

  const obj = response as Record<string, unknown>;
  if (!Array.isArray(obj.dishes)) {
    addIssue(issues, 'dishes', 'array_required', 'dishes must be an array');
    throw new MenuAnalysisValidationError(issues);
  }

  const dishes: ExtractedDish[] = [];
  for (let i = 0; i < obj.dishes.length; i += 1) {
    const dish = normalizeDish(obj.dishes[i], i, issues);
    if (dish) dishes.push(dish);
  }

  if (issues.length > 0) {
    throw new MenuAnalysisValidationError(issues);
  }

  return { dishes };
}
