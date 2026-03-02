import type { Allergy, DietaryPreference, DishPick, Goal } from '../domain/models';

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

function validateDishPick(
  raw: unknown,
  index: number,
  group: string,
  pinWhitelist: string[],
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

  // pins: array length 2–4 (AI often returns 2 for caution/avoid), unique, all in whitelist
  const pinsRaw = o.pins;
  let pins: string[] = [];
  if (!Array.isArray(pinsRaw)) {
    addIssue(issues, `${basePath}.pins`, 'pins_not_array', 'pins must be an array');
  } else {
    pins = pinsRaw.map((p) => (typeof p === 'string' ? p.trim() : '')).filter(Boolean);
    if (pins.length < 2 || pins.length > 4) {
      addIssue(issues, `${basePath}.pins`, 'pins_length', 'pins must have 2 to 4 items');
    }
    const pinSet = new Set(pins);
    if (pinSet.size !== pins.length) {
      addIssue(issues, `${basePath}.pins`, 'pins_unique', 'pins must be unique');
    }
    for (const p of pins) {
      if (!pinWhitelist.includes(p)) {
        addIssue(issues, `${basePath}.pins`, 'pin_not_in_whitelist', `pin "${p}" is not in the whitelist for this goal`);
        break;
      }
    }
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
  const dietBadgesRaw = o.dietBadges;
  let dietBadges: string[] = [];
  if (!Array.isArray(dietBadgesRaw)) {
    addIssue(issues, `${basePath}.dietBadges`, 'dietBadges_not_array', 'dietBadges must be an array');
  } else {
    dietBadges = dietBadgesRaw.map((b) => (typeof b === 'string' ? b.trim() : '')).filter(Boolean);
    if (dietBadges.some((b) => b === 'None' || b.toLowerCase() === 'none')) {
      addIssue(issues, `${basePath}.dietBadges`, 'dietBadges_no_none', 'dietBadges must not include "None"');
    }
    for (const b of dietBadges) {
      if (!selectedDietPreferences.includes(b as DietaryPreference)) {
        addIssue(issues, `${basePath}.dietBadges`, 'dietBadge_not_selected', `dietBadge "${b}" must be one of user's selected preferences`);
        break;
      }
    }
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

  if (issues.some((i) => i.path.startsWith(basePath))) {
    return null;
  }

  return {
    name,
    shortReason,
    pins,
    confidencePercent,
    dietBadges,
    allergenNote,
    noLine,
  };
}

export function validateMenuAnalysisResponse(params: {
  response: unknown;
  goal: Goal;
  pinWhitelist: string[];
  selectedDietPreferences: DietaryPreference[];
  selectedAllergies: Allergy[];
  dislikes: string[];
}): MenuAnalysisResponse {
  const { response, pinWhitelist, selectedDietPreferences, selectedAllergies, dislikes } = params;
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
      pinWhitelist,
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
      pinWhitelist,
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
      pinWhitelist,
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
