import type {
  DietaryPreference,
  DishAllergenSignals,
  DishDislikeSignals,
  DishQualityFlags,
  Goal,
} from './models';

/** Pin whitelist per goal (TZ v0.1). */
export type GoalPinsMap = Record<Goal, readonly string[]>;
export type GoalRiskPinsMap = Record<Goal, readonly string[]>;

const LOSE_FAT_PINS = [
  'Low-calorie',
  'High fiber',
  'Lean protein',
  'Low sodium',
  'Low sugar',
  'Portion-aware',
  'Filling',
  'Vegetables',
  'Grilled/steamed',
  'Light dressing',
  'Whole foods',
] as const;

const MAINTAIN_WEIGHT_PINS = [
  'Balanced',
  'Moderate protein',
  'Whole grains',
  'Vegetables',
  'Lean protein',
  'High fiber',
  'Low sodium',
  'Healthy fats',
  'Portion-aware',
  'Whole foods',
] as const;

const GAIN_MUSCLE_PINS = [
  'High protein',
  'Lean protein',
  'Enough calories',
  'Balanced',
  'Whole foods',
  'Nutrient-rich',
  'Healthy fats',
  'Carbs included',
] as const;

const EAT_HEALTHIER_PINS = [
  'Whole foods',
  'Vegetables',
  'High fiber',
  'Low sodium',
  'Low sugar',
  'Healthy fats',
  'Balanced',
  'Nutrient-rich',
  'Grilled/steamed',
] as const;

const GOAL_PINS: GoalPinsMap = {
  'Lose fat': LOSE_FAT_PINS,
  'Maintain weight': MAINTAIN_WEIGHT_PINS,
  'Gain muscle': GAIN_MUSCLE_PINS,
  'Eat healthier': EAT_HEALTHIER_PINS,
};

// ── Risk pin whitelists ────────────────────────────────────────────────────────
// "Diet Mismatch" is NOT included here; it is replaced by a computed goal-specific
// pin (e.g. "Not Keto") and injected at runtime by GeminiMenuAnalysisProvider.

const CAUTION_LOSE_FAT_PINS = [
  'High-calorie',
  'High fat',
  'Fried',
  'High sugar',
  'Heavy sauce',
  'Refined Carbs',
  'High sodium',
  'Allergen',
  'Dislike',
] as const;

const CAUTION_MAINTAIN_WEIGHT_PINS = [
  'High sodium',
  'High sugar',
  'High fat',
  'Fried',
  'Heavy sauce',
  'Refined Carbs',
  'Low Fiber',
  'Allergen',
  'Dislike',
] as const;

const CAUTION_GAIN_MUSCLE_PINS = [
  'Low Protein',
  'Small portion',
  'No Carbs',
  'High sugar',
  'Fried',
  'Heavy sauce',
  'Allergen',
  'Dislike',
] as const;

const CAUTION_EAT_HEALTHIER_PINS = [
  'Processed',
  'High sodium',
  'High sugar',
  'Fried',
  'Heavy sauce',
  'Refined Carbs',
  'High sat fat',
  'Allergen',
  'Dislike',
] as const;

const AVOID_LOSE_FAT_PINS = [
  'High-calorie',
  'Fried',
  'High sugar',
  'High sat fat',
  'Heavy sauce',
  'High carbs',
  'Refined Carbs',
  'Processed',
  'Allergen',
  'Dislike',
] as const;

const AVOID_MAINTAIN_WEIGHT_PINS = [
  'High sodium',
  'High sugar',
  'Fried',
  'High sat fat',
  'Heavy sauce',
  'Ultra-processed',
  'Processed',
  'Refined Carbs',
  'Allergen',
  'Dislike',
] as const;

const AVOID_GAIN_MUSCLE_PINS = [
  'Very Low Protein',
  'Small portion',
  'No Carbs',
  'High sugar',
  'Fried',
  'High sat fat',
  'Processed',
  'Allergen',
  'Dislike',
] as const;

const AVOID_EAT_HEALTHIER_PINS = [
  'Ultra-processed',
  'Processed',
  'High sodium',
  'High sugar',
  'Fried',
  'High sat fat',
  'Heavy sauce',
  'Refined Carbs',
  'Allergen',
  'Dislike',
] as const;

const GOAL_CAUTION_PINS: GoalRiskPinsMap = {
  'Lose fat': CAUTION_LOSE_FAT_PINS,
  'Maintain weight': CAUTION_MAINTAIN_WEIGHT_PINS,
  'Gain muscle': CAUTION_GAIN_MUSCLE_PINS,
  'Eat healthier': CAUTION_EAT_HEALTHIER_PINS,
};

const GOAL_AVOID_PINS: GoalRiskPinsMap = {
  'Lose fat': AVOID_LOSE_FAT_PINS,
  'Maintain weight': AVOID_MAINTAIN_WEIGHT_PINS,
  'Gain muscle': AVOID_GAIN_MUSCLE_PINS,
  'Eat healthier': AVOID_EAT_HEALTHIER_PINS,
};

/** Returns the pin whitelist for the given goal. Pins in AI response must be a subset of this list. */
export function getPinWhitelist(goal: Goal): string[] {
  return [...GOAL_PINS[goal]];
}

/** Returns caution risk pins whitelist for the given goal (excludes diet-mismatch pin; see getDietMismatchPin). */
export function getCautionPinWhitelist(goal: Goal): string[] {
  return [...GOAL_CAUTION_PINS[goal]];
}

/** Returns avoid risk pins whitelist for the given goal (excludes diet-mismatch pin; see getDietMismatchPin). */
export function getAvoidPinWhitelist(goal: Goal): string[] {
  return [...GOAL_AVOID_PINS[goal]];
}

const DIET_MISMATCH_PIN_MAP: Record<DietaryPreference, string> = {
  'Vegan or vegetarian': 'Not Vegan',
  'Pescatarian': 'Not Pescatarian',
  'Semi-vegetarian': 'Not Semi-vegetarian',
  'Gluten-free': 'Not Gluten-free',
  'Lactose-free': 'Not Lactose-free',
  'Keto': 'Not Keto',
  'Paleo (whole foods)': 'Not Paleo',
};

/**
 * Returns a specific diet-mismatch risk pin based on the user's first dietary preference,
 * e.g. "Not Keto" instead of the generic "Diet Mismatch".
 * Returns null when the user has no dietary preferences.
 */
export function getDietMismatchPin(dietaryPreferences: DietaryPreference[]): string | null {
  if (!dietaryPreferences.length) return null;
  return DIET_MISMATCH_PIN_MAP[dietaryPreferences[0]] ?? null;
}

const LEGACY_PIN_CANONICAL_MAP: Record<string, string> = {
  'High Fat': 'High fat',
  'High Sugar': 'High sugar',
  'Added Sugar': 'High sugar',
  Sugary: 'High sugar',
  'High Sodium': 'High sodium',
  'Very High Sodium': 'High sodium',
  Fiber: 'High fiber',
  'Veggie-rich': 'Vegetables',
  'Portion-friendly': 'Portion-aware',
  'Small Portion': 'Small portion',
  'Tiny Portion': 'Small portion',
  'Too Low Cals': 'Small portion',
  'Deep-fried': 'Fried',
  'Heavy Sauce': 'Heavy sauce',
  Creamy: 'Heavy sauce',
  'Best protein': 'High protein',
  Fresh: 'Whole foods',
  'Less processed': 'Whole foods',
  'High calories': 'High-calorie',
  'Low calorie': 'Low-calorie',
  'Calorie sufficient': 'Enough calories',
  'Nutrient dense': 'Nutrient-rich',
};

const REMOVED_PIN_SET = new Set([
  'No empty calories',
  'Strength support',
  'Recovery',
  'Variety',
  'Not fried',
]);

export function normalizePinLabel(pin: string): string | null {
  const trimmed = pin.trim();
  if (!trimmed) return null;
  if (REMOVED_PIN_SET.has(trimmed)) return null;
  return LEGACY_PIN_CANONICAL_MAP[trimmed] ?? trimmed;
}

export function normalizePinLabels(pins: readonly string[]): string[] {
  const normalized: string[] = [];
  const seen = new Set<string>();
  for (const pin of pins) {
    const mapped = normalizePinLabel(pin);
    if (!mapped || seen.has(mapped)) continue;
    seen.add(mapped);
    normalized.push(mapped);
  }
  return normalized;
}

type DeterministicPinsParams = {
  goal: Goal;
  section: 'top' | 'caution' | 'avoid';
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  flags?: DishQualityFlags;
  allergenSignals?: DishAllergenSignals;
  dislikeSignals?: DishDislikeSignals;
  selectedAllergies: string[];
};

type DeterministicPinsResult = {
  pins: string[];
  riskPins: string[];
};

function addIfWhitelisted(target: string[], whitelist: string[], pin: string): void {
  if (!whitelist.includes(pin)) return;
  if (target.includes(pin)) return;
  target.push(pin);
}

export function buildDeterministicPins(params: DeterministicPinsParams): DeterministicPinsResult {
  const topWhitelist = getPinWhitelist(params.goal);
  const cautionWhitelist = getCautionPinWhitelist(params.goal);
  const avoidWhitelist = getAvoidPinWhitelist(params.goal);
  const riskWhitelist = params.section === 'caution' ? cautionWhitelist : avoidWhitelist;

  if (params.section === 'top') {
    const pins: string[] = [];
    if (params.protein >= 30) addIfWhitelisted(pins, topWhitelist, 'High protein');
    if (params.flags?.leanProtein) addIfWhitelisted(pins, topWhitelist, 'Lean protein');
    if (params.flags?.veggieForward) addIfWhitelisted(pins, topWhitelist, 'Vegetables');
    if (params.flags?.wholeFood) addIfWhitelisted(pins, topWhitelist, 'Whole foods');
    if (params.goal === 'Gain muscle' && params.calories >= 450) {
      addIfWhitelisted(pins, topWhitelist, 'Enough calories');
    }
    if (params.goal === 'Lose fat' && params.calories > 0 && params.calories <= 550) {
      addIfWhitelisted(pins, topWhitelist, 'Low-calorie');
    }
    if (params.carbs >= 30 && params.goal === 'Gain muscle') {
      addIfWhitelisted(pins, topWhitelist, 'Carbs included');
    }
    if (params.fat >= 10 && params.fat <= 28) {
      addIfWhitelisted(pins, topWhitelist, 'Healthy fats');
    }
    if (pins.length < 3) {
      for (const pin of topWhitelist) {
        if (pins.includes(pin)) continue;
        pins.push(pin);
        if (pins.length >= 3) break;
      }
    }
    return {
      pins: pins.slice(0, 4),
      riskPins: [],
    };
  }

  const riskPins: string[] = [];
  if (params.calories >= 650) addIfWhitelisted(riskPins, riskWhitelist, 'High-calorie');
  if (params.fat >= 30) addIfWhitelisted(riskPins, riskWhitelist, 'High fat');
  if (params.flags?.fried) addIfWhitelisted(riskPins, riskWhitelist, 'Fried');
  if (params.flags?.highFatSauce) addIfWhitelisted(riskPins, riskWhitelist, 'Heavy sauce');
  if (params.flags?.refinedCarbHeavy) addIfWhitelisted(riskPins, riskWhitelist, 'Refined Carbs');
  if (params.flags?.processed) {
    addIfWhitelisted(riskPins, riskWhitelist, 'Processed');
    addIfWhitelisted(riskPins, riskWhitelist, 'Ultra-processed');
  }
  if (params.flags?.sugaryDrink || params.flags?.dessert) {
    addIfWhitelisted(riskPins, riskWhitelist, 'High sugar');
  }
  if (params.fat >= 38) addIfWhitelisted(riskPins, riskWhitelist, 'High sat fat');
  if (params.carbs >= 65) addIfWhitelisted(riskPins, riskWhitelist, 'High carbs');

  const hasAllergenPressure =
    (params.allergenSignals?.contains?.length ?? 0) > 0 ||
    Boolean(params.allergenSignals?.unclear);
  if (params.selectedAllergies.length > 0 && hasAllergenPressure) {
    addIfWhitelisted(riskPins, riskWhitelist, 'Allergen');
  }
  if (params.dislikeSignals?.containsDislikedIngredient) {
    addIfWhitelisted(riskPins, riskWhitelist, 'Dislike');
  }

  if (params.goal === 'Gain muscle') {
    if (params.protein > 0 && params.protein < 25) addIfWhitelisted(riskPins, riskWhitelist, 'Low Protein');
    if (params.protein > 0 && params.protein < 18) addIfWhitelisted(riskPins, riskWhitelist, 'Very Low Protein');
    if (params.calories > 0 && params.calories < 350) addIfWhitelisted(riskPins, riskWhitelist, 'Small portion');
    if (params.carbs > 0 && params.carbs < 20) addIfWhitelisted(riskPins, riskWhitelist, 'No Carbs');
  }

  if (riskPins.length === 0 && riskWhitelist.length > 0) {
    riskPins.push(riskWhitelist[0]);
  }

  return {
    pins: [],
    riskPins: riskPins.slice(0, 3),
  };
}
