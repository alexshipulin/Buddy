import type {
  Allergy,
  DietaryPreference,
  DishAllergenSignals,
  DishDislikeSignals,
  DishPick,
  DishQualityFlags,
  DishConstructorMeta,
  ExtractedDish,
  Goal,
  MenuExtractionResponse as ModelMenuExtractionResponse,
} from '../domain/models';
import { normalizePinLabels } from '../domain/menuPins';

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

export type MenuAnalysisResponse = { topPicks: DishPick[]; caution: DishPick[]; avoid: DishPick[] };

const ALLOWED_ALLERGEN_NOTES = ['Allergen safe', 'May contain allergens - ask the waiter'] as const;

function addIssue(issues: ValidationIssue[], path: string, code: string, message: string): void {
  issues.push({ path, code, message });
}

function trimStr(s: unknown): string {
  if (typeof s !== 'string') return '';
  return s.trim();
}

function hasRealAllergies(selectedAllergies: Allergy[]): boolean {
  return selectedAllergies.some((a) => trimStr(a).toLowerCase() !== 'none');
}

function parseOptionalInt(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return Math.round(v);
  if (typeof v === 'string') {
    const trimmed = v.trim();
    if (!trimmed) return null;
    if (!/^-?\d+(?:\.\d+)?$/.test(trimmed)) return null;
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) return null;
    return Math.round(parsed);
  }
  return null;
}

function parseOptionalIntFromKeys(
  source: Record<string, unknown>,
  primaryKey: string,
  legacyKeys: string[] = []
): number | null {
  const primary = parseOptionalInt(source[primaryKey]);
  if (primary !== null) return primary;
  for (const key of legacyKeys) {
    const legacy = parseOptionalInt(source[key]);
    if (legacy !== null) return legacy;
  }
  return null;
}

function validateDishPick(
  raw: unknown,
  index: number,
  group: 'topPicks' | 'caution' | 'avoid',
  pinWhitelistTop: string[],
  pinWhitelistCaution: string[],
  pinWhitelistAvoid: string[],
  selectedDietPreferences: DietaryPreference[],
  hasAllergies: boolean,
  dislikes: string[],
  issues: ValidationIssue[]
): DishPick | null {
  const basePath = `${group}[${index}]`;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    addIssue(issues, basePath, 'invalid_dish', 'Each item must be an object');
    return null;
  }
  const o = raw as Record<string, unknown>;

  // name: required string, non-empty after trim (only trim)
  const name = trimStr(o.name);
  if (name === '') {
    addIssue(issues, `${basePath}.name`, 'missing_name', 'name is required and must be non-empty after trim');
  }

  // shortReason: required string, 15..160 chars, no newline, no bullet prefix
  const shortReasonRaw = o.shortReason;
  const shortReason = typeof shortReasonRaw === 'string' ? shortReasonRaw.trim() : '';
  if (shortReason === '') {
    addIssue(issues, `${basePath}.shortReason`, 'missing_shortReason', 'shortReason is required');
  } else {
    if (shortReason.length < 15 || shortReason.length > 160) {
      addIssue(issues, `${basePath}.shortReason`, 'shortReason_length', 'shortReason must be 15–160 characters');
    }
    if (/\n/.test(shortReason)) {
      addIssue(issues, `${basePath}.shortReason`, 'shortReason_no_newline', 'shortReason must not contain newlines');
    }
    const bulletMatch = shortReason.match(/^\s*[-•]/);
    if (bulletMatch) {
      addIssue(issues, `${basePath}.shortReason`, 'shortReason_no_bullet', 'shortReason must not start with bullet (- or •)');
    }
  }

  // top pins are only for topPicks; caution/avoid must use riskPins.
  const pinsRaw = o.pins;
  let pins: string[] = [];
  if (group === 'topPicks') {
    if (!Array.isArray(pinsRaw)) {
      addIssue(issues, `${basePath}.pins`, 'pins_not_array', 'pins must be an array for topPicks');
    } else {
      const rawPins = pinsRaw.map((p) => (typeof p === 'string' ? p.trim() : ''));
      const hasEmptyPin = rawPins.some((p) => p === '');
      if (hasEmptyPin) {
        addIssue(issues, `${basePath}.pins`, 'pin_empty_or_invalid', 'Every pin must be a non-empty string');
      }
      pins = normalizePinLabels(rawPins);
      if (pins.length < 3 || pins.length > 4) {
        addIssue(issues, `${basePath}.pins`, 'pins_length', 'topPicks pins must have exactly 3 or 4 items');
      }
      for (const p of pins) {
        if (!pinWhitelistTop.includes(p)) {
          addIssue(issues, `${basePath}.pins`, 'pin_not_in_whitelist', `pin "${p}" is not in the top picks whitelist for this goal`);
          break;
        }
      }
    }
  } else if (pinsRaw !== undefined && pinsRaw !== null && Array.isArray(pinsRaw) && pinsRaw.length > 0) {
    addIssue(issues, `${basePath}.pins`, 'pins_not_allowed', 'caution/avoid items must use riskPins, not pins');
  }

  // confidencePercent: number, finite, 0..100
  const conf = o.confidencePercent;
  let confidencePercent = 0;
  if (typeof conf !== 'number' || !Number.isFinite(conf)) {
    addIssue(issues, `${basePath}.confidencePercent`, 'confidence_not_number', 'confidencePercent must be a finite number');
  } else if (conf < 0 || conf > 100) {
    addIssue(issues, `${basePath}.confidencePercent`, 'confidence_range', 'confidencePercent must be 0–100');
  } else {
    confidencePercent = conf;
  }

  // dietBadges: array, subset of selectedDietPreferences only, must not include "None"
  // Invalid badges are silently filtered out (AI often adds relevant but unselected labels).
  const dietBadgesRaw = o.dietBadges;
  let dietBadges: string[] = [];
  if (!Array.isArray(dietBadgesRaw)) {
    dietBadges = [];
  } else {
    dietBadges = dietBadgesRaw
      .map((b) => (typeof b === 'string' ? b.trim() : ''))
      .filter(Boolean)
      .filter((b) => b.toLowerCase() !== 'none')
      .filter((b) => selectedDietPreferences.includes(b as DietaryPreference));
  }

  // allergenNote
  const allergenNoteRaw = o.allergenNote;
  let allergenNote: string | null = null;
  if (allergenNoteRaw !== null && allergenNoteRaw !== undefined) {
    allergenNote = typeof allergenNoteRaw === 'string' ? allergenNoteRaw.trim() : null;
  }
  if (hasAllergies) {
    if (allergenNote !== null && !ALLOWED_ALLERGEN_NOTES.includes(allergenNote as (typeof ALLOWED_ALLERGEN_NOTES)[number])) {
      addIssue(issues, `${basePath}.allergenNote`, 'allergenNote_invalid', 'allergenNote must be "Allergen safe" or "May contain allergens - ask the waiter"');
    }
  } else {
    if (allergenNote !== null) {
      addIssue(issues, `${basePath}.allergenNote`, 'allergenNote_must_be_null', 'allergenNote must be null when user has no allergies selected');
    }
  }

  // noLine: null or string; if string must start with "No ", ingredient after must match one of dislikes (case-insensitive)
  const noLineRaw = o.noLine;
  let noLine: string | null = null;
  if (noLineRaw !== null && noLineRaw !== undefined && noLineRaw !== '') {
    const noLineStr = typeof noLineRaw === 'string' ? noLineRaw.trim() : '';
    if (noLineStr !== '') {
      if (dislikes.length === 0) {
        addIssue(issues, `${basePath}.noLine`, 'noLine_no_dislikes', 'noLine must be null when user has no dislikes');
      } else if (!noLineStr.startsWith('No ')) {
        addIssue(issues, `${basePath}.noLine`, 'noLine_format', 'noLine must start with "No " (e.g. "No tomato")');
      } else {
        const ingredient = noLineStr.slice(3).trim();
        const dislikesLower = dislikes.map((d) => d.trim().toLowerCase()).filter(Boolean);
        if (ingredient && !dislikesLower.includes(ingredient.toLowerCase())) {
          addIssue(issues, `${basePath}.noLine`, 'noLine_not_in_dislikes', `noLine ingredient "${ingredient}" must match one of user's dislikes`);
        }
      }
      noLine = noLineStr;
    }
  }

  // riskPins + quickFix are section-specific
  const riskPinsRaw = o.riskPins;
  let riskPins: string[] | undefined;
  const quickFixRaw = o.quickFix;
  let quickFix: string | null | undefined = undefined;

  if (group === 'topPicks') {
    if (Array.isArray(riskPinsRaw) && riskPinsRaw.length > 0) {
      addIssue(issues, `${basePath}.riskPins`, 'riskPins_not_allowed', 'topPicks must not include riskPins');
    }
    if (quickFixRaw !== undefined && quickFixRaw !== null && quickFixRaw !== '') {
      addIssue(issues, `${basePath}.quickFix`, 'quickFix_not_allowed', 'topPicks must not include quickFix');
    }
  }

  if (group === 'caution' || group === 'avoid') {
    if (!Array.isArray(riskPinsRaw)) {
      addIssue(issues, `${basePath}.riskPins`, 'riskPins_not_array', 'riskPins must be an array');
    } else {
      const rawRiskPins = riskPinsRaw.map((p) => (typeof p === 'string' ? p.trim() : ''));
      const hasEmptyRiskPin = rawRiskPins.some((p) => p === '');
      if (hasEmptyRiskPin) {
        addIssue(issues, `${basePath}.riskPins`, 'riskPin_empty_or_invalid', 'Every riskPin must be a non-empty string');
      }
      riskPins = normalizePinLabels(rawRiskPins);
      if (riskPins.length < 1 || riskPins.length > 3) {
        addIssue(issues, `${basePath}.riskPins`, 'riskPins_length', 'riskPins must contain 1 to 3 items');
      }
      const whitelist = group === 'caution' ? pinWhitelistCaution : pinWhitelistAvoid;
      for (const p of riskPins) {
        if (!whitelist.includes(p)) {
          addIssue(
            issues,
            `${basePath}.riskPins`,
            'riskPin_not_in_whitelist',
            `risk pin "${p}" is not in the ${group} whitelist for this goal`
          );
          break;
        }
      }
    }
  }

  if (group === 'caution') {
    if (typeof quickFixRaw !== 'string' || quickFixRaw.trim() === '') {
      addIssue(issues, `${basePath}.quickFix`, 'quickFix_required', 'quickFix is required for caution items');
    } else {
      quickFix = quickFixRaw.trim();
      if (!quickFix.startsWith('Try: ')) {
        addIssue(issues, `${basePath}.quickFix`, 'quickFix_prefix', 'quickFix must start with "Try: "');
      }
      if (quickFix.length > 45) {
        addIssue(issues, `${basePath}.quickFix`, 'quickFix_length', 'quickFix must be 45 characters or less');
      }
      if (/\n/.test(quickFix)) {
        addIssue(issues, `${basePath}.quickFix`, 'quickFix_no_newline', 'quickFix must not contain newlines');
      }
    }
  }

  if (group === 'avoid') {
    if (quickFixRaw !== undefined && quickFixRaw !== null && quickFixRaw !== '') {
      addIssue(issues, `${basePath}.quickFix`, 'quickFix_not_allowed', 'quickFix is only allowed for caution items');
    }
  }

  // estimated macros (optional, nullable) — soft parse, never fails validation
  const estimatedCalories = parseOptionalInt(o.estimatedCalories);
  const estimatedProteinG = parseOptionalInt(o.estimatedProteinG);
  const estimatedCarbsG = parseOptionalInt(o.estimatedCarbsG);
  const estimatedFatG = parseOptionalInt(o.estimatedFatG);

  if (issues.some((i) => i.path.startsWith(basePath))) {
    return null;
  }

  return {
    name,
    shortReason,
    pins,
    riskPins,
    quickFix,
    confidencePercent,
    dietBadges,
    allergenNote,
    noLine,
    estimatedCalories,
    estimatedProteinG,
    estimatedCarbsG,
    estimatedFatG,
  };
}

export function validateMenuAnalysisResponse(params: {
  response: unknown;
  goal: Goal;
  pinWhitelistTop: string[];
  pinWhitelistCaution: string[];
  pinWhitelistAvoid: string[];
  selectedDietPreferences: DietaryPreference[];
  selectedAllergies: Allergy[];
  dislikes: string[];
}): MenuAnalysisResponse {
  const {
    response,
    pinWhitelistTop,
    pinWhitelistCaution,
    pinWhitelistAvoid,
    selectedDietPreferences,
    selectedAllergies,
    dislikes,
  } = params;
  const issues: ValidationIssue[] = [];

  if (response === null || response === undefined || typeof response !== 'object' || Array.isArray(response)) {
    addIssue(issues, '', 'invalid_response', 'Response must be an object');
    throw new MenuAnalysisValidationError(issues);
  }

  const obj = response as Record<string, unknown>;
  const topPicksRaw = Array.isArray(obj.topPicks) ? obj.topPicks : [];
  const cautionRaw = Array.isArray(obj.caution) ? obj.caution : [];
  const avoidRaw = Array.isArray(obj.avoid) ? obj.avoid : [];

  const hasAllergies = hasRealAllergies(selectedAllergies);
  const dislikesTrimmed = (dislikes || []).map((d) => d.trim()).filter(Boolean);

  const topPicks: DishPick[] = [];
  for (let i = 0; i < topPicksRaw.length; i++) {
    const dish = validateDishPick(
      topPicksRaw[i],
      i,
      'topPicks',
      pinWhitelistTop,
      pinWhitelistCaution,
      pinWhitelistAvoid,
      selectedDietPreferences,
      hasAllergies,
      dislikesTrimmed,
      issues
    );
    if (dish) topPicks.push(dish);
  }

  const caution: DishPick[] = [];
  for (let i = 0; i < cautionRaw.length; i++) {
    const dish = validateDishPick(
      cautionRaw[i],
      i,
      'caution',
      pinWhitelistTop,
      pinWhitelistCaution,
      pinWhitelistAvoid,
      selectedDietPreferences,
      hasAllergies,
      dislikesTrimmed,
      issues
    );
    if (dish) caution.push(dish);
  }

  const avoid: DishPick[] = [];
  for (let i = 0; i < avoidRaw.length; i++) {
    const dish = validateDishPick(
      avoidRaw[i],
      i,
      'avoid',
      pinWhitelistTop,
      pinWhitelistCaution,
      pinWhitelistAvoid,
      selectedDietPreferences,
      hasAllergies,
      dislikesTrimmed,
      issues
    );
    if (dish) avoid.push(dish);
  }

  if (issues.length > 0) {
    throw new MenuAnalysisValidationError(issues);
  }

  return { topPicks, caution, avoid };
}

function parseStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean);
}

function parseOptionalBoolean(input: unknown): boolean | undefined {
  if (typeof input === 'boolean') return input;
  return undefined;
}

function parseQualityFlags(input: unknown): DishQualityFlags | undefined {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return undefined;
  const raw = input as Record<string, unknown>;
  const flags: DishQualityFlags = {};
  const assign = (key: keyof DishQualityFlags): void => {
    const value = parseOptionalBoolean(raw[key]);
    if (value !== undefined) flags[key] = value;
  };
  assign('leanProtein');
  assign('veggieForward');
  assign('wholeFood');
  assign('fried');
  assign('dessert');
  assign('sugaryDrink');
  assign('refinedCarbHeavy');
  assign('highFatSauce');
  assign('processed');
  return Object.keys(flags).length > 0 ? flags : undefined;
}

function parseAllergenSignals(input: unknown): DishAllergenSignals | undefined {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return undefined;
  const raw = input as Record<string, unknown>;
  const contains = parseStringArray(raw.contains);
  const unclear = parseOptionalBoolean(raw.unclear);
  const noListedAllergen = parseOptionalBoolean(raw.noListedAllergen);
  const signals: DishAllergenSignals = {};
  if (contains.length > 0) signals.contains = contains;
  if (unclear !== undefined) signals.unclear = unclear;
  if (noListedAllergen !== undefined) signals.noListedAllergen = noListedAllergen;
  return Object.keys(signals).length > 0 ? signals : undefined;
}

function parseDislikeSignals(input: unknown): DishDislikeSignals | undefined {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return undefined;
  const raw = input as Record<string, unknown>;
  const containsDislikedIngredient = parseOptionalBoolean(raw.containsDislikedIngredient);
  const removable = parseStringArray(raw.removableDislikedIngredients);
  const signals: DishDislikeSignals = {};
  if (containsDislikedIngredient !== undefined) {
    signals.containsDislikedIngredient = containsDislikedIngredient;
  }
  if (removable.length > 0) {
    signals.removableDislikedIngredients = removable;
  }
  return Object.keys(signals).length > 0 ? signals : undefined;
}

function parseConstructorMeta(input: unknown): DishConstructorMeta | undefined {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return undefined;
  const raw = input as Record<string, unknown>;
  const isCustom = parseOptionalBoolean(raw.isCustom);
  const components = parseStringArray(raw.components);
  const meta: DishConstructorMeta = {};
  if (isCustom !== undefined) meta.isCustom = isCustom;
  if (components.length >= 2) meta.components = components;
  return Object.keys(meta).length > 0 ? meta : undefined;
}

function parseConfidencePercent(input: unknown): number {
  if (typeof input === 'number' && Number.isFinite(input)) {
    return Math.max(1, Math.min(100, Math.round(input)));
  }
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
      const parsed = Number(trimmed);
      if (Number.isFinite(parsed)) return Math.max(1, Math.min(100, Math.round(parsed)));
    }
  }
  return 65;
}

function validateExtractedDish(
  raw: unknown,
  index: number,
  selectedDietPreferences: DietaryPreference[],
  issues: ValidationIssue[]
): ExtractedDish | null {
  const basePath = `dishes[${index}]`;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    addIssue(issues, basePath, 'invalid_dish', 'Each extracted dish must be an object');
    return null;
  }
  const source = raw as Record<string, unknown>;
  const name = trimStr(source.name);
  if (!name) {
    addIssue(issues, `${basePath}.name`, 'missing_name', 'Extracted dish name is required');
    return null;
  }

  const menuSectionRaw = source.menuSection;
  const menuSection =
    menuSectionRaw === null || menuSectionRaw === undefined
      ? null
      : typeof menuSectionRaw === 'string'
        ? menuSectionRaw.trim() || null
        : null;

  const shortDescriptionRaw = source.shortDescription;
  const shortDescription =
    shortDescriptionRaw === null || shortDescriptionRaw === undefined
      ? null
      : typeof shortDescriptionRaw === 'string'
        ? shortDescriptionRaw.trim() || null
        : null;

  const estimatedCalories = parseOptionalIntFromKeys(source, 'estimatedCalories');
  const estimatedProteinG = parseOptionalIntFromKeys(source, 'estimatedProteinG', [
    'estimatedProtein',
  ]);
  const estimatedCarbsG = parseOptionalIntFromKeys(source, 'estimatedCarbsG', [
    'estimatedCarbs',
  ]);
  const estimatedFatG = parseOptionalIntFromKeys(source, 'estimatedFatG', ['estimatedFat']);

  const confidencePercent = parseConfidencePercent(source.confidencePercent);

  const dietBadges = parseStringArray(source.dietBadges)
    .filter((badge) => badge.toLowerCase() !== 'none')
    .filter((badge) => selectedDietPreferences.includes(badge as DietaryPreference));

  return {
    name,
    menuSection,
    shortDescription,
    estimatedCalories,
    estimatedProteinG,
    estimatedCarbsG,
    estimatedFatG,
    confidencePercent,
    dietBadges,
    flags: parseQualityFlags(source.flags),
    allergenSignals: parseAllergenSignals(source.allergenSignals),
    dislikes: parseDislikeSignals(source.dislikes),
    constructorMeta: parseConstructorMeta(source.constructorMeta),
  };
}

export function validateMenuExtractionResponse(params: {
  response: unknown;
  selectedDietPreferences: DietaryPreference[];
}): ModelMenuExtractionResponse {
  const issues: ValidationIssue[] = [];
  if (!params.response || typeof params.response !== 'object' || Array.isArray(params.response)) {
    addIssue(issues, '', 'invalid_response', 'Extraction response must be an object');
    throw new MenuAnalysisValidationError(issues);
  }

  const root = params.response as Record<string, unknown>;
  const rawDishes = Array.isArray(root.dishes) ? root.dishes : [];
  if (rawDishes.length === 0) {
    addIssue(issues, 'dishes', 'missing_dishes', 'Extraction response must include a non-empty dishes array');
    throw new MenuAnalysisValidationError(issues);
  }

  const dishes: ExtractedDish[] = [];
  for (let i = 0; i < rawDishes.length; i++) {
    const dish = validateExtractedDish(rawDishes[i], i, params.selectedDietPreferences, issues);
    if (dish) dishes.push(dish);
  }

  if (dishes.length === 0) {
    addIssue(issues, 'dishes', 'no_valid_dishes', 'No valid dishes after extraction normalization');
    throw new MenuAnalysisValidationError(issues);
  }

  return { dishes };
}
