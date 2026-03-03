import type { DietaryPreference, Goal } from './models';

/** Pin whitelist per goal (TZ v0.1). Each list has exactly 12 pins. */
export type GoalPinsMap = Record<Goal, readonly string[]>;
export type GoalRiskPinsMap = Record<Goal, readonly string[]>;

const LOSE_FAT_PINS = [
  'Low calorie',
  'High fiber',
  'Lean protein',
  'Low sodium',
  'Low sugar',
  'Portion-friendly',
  'Filling',
  'Veggie-rich',
  'Grilled/steamed',
  'Light dressing',
  'Whole foods',
  'Not fried',
] as const;

const MAINTAIN_WEIGHT_PINS = [
  'Balanced',
  'Moderate protein',
  'Whole grains',
  'Vegetables',
  'Lean protein',
  'Fiber',
  'Low sodium',
  'Variety',
  'Healthy fats',
  'Portion-aware',
  'Fresh',
  'Whole foods',
] as const;

const GAIN_MUSCLE_PINS = [
  'High protein',
  'Best protein',
  'Lean protein',
  'Calorie sufficient',
  'Strength support',
  'Recovery',
  'Balanced',
  'Whole foods',
  'Nutrient dense',
  'No empty calories',
  'Healthy fats',
  'Carbs included',
] as const;

const EAT_HEALTHIER_PINS = [
  'Whole foods',
  'Veggie-rich',
  'Less processed',
  'Fiber',
  'Low sodium',
  'Low sugar',
  'Healthy fats',
  'Balanced',
  'Fresh',
  'Variety',
  'Nutrient dense',
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
  'High calories',
  'High Fat',
  'Fried',
  'Sugary',
  'Heavy Sauce',
  'Refined Carbs',
  'High Sodium',
  'Allergen',
  'Dislike',
] as const;

const CAUTION_MAINTAIN_WEIGHT_PINS = [
  'High Sodium',
  'High Sugar',
  'High Fat',
  'Fried',
  'Heavy Sauce',
  'Refined Carbs',
  'Low Fiber',
  'Allergen',
  'Dislike',
] as const;

const CAUTION_GAIN_MUSCLE_PINS = [
  'Low Protein',
  'Too Low Cals',
  'No Carbs',
  'Small Portion',
  'High Sugar',
  'Fried',
  'Heavy Sauce',
  'Allergen',
  'Dislike',
] as const;

const CAUTION_EAT_HEALTHIER_PINS = [
  'Processed',
  'High Sodium',
  'Added Sugar',
  'Fried',
  'Heavy Sauce',
  'Refined Carbs',
  'High sat fat',
  'Allergen',
  'Dislike',
] as const;

const AVOID_LOSE_FAT_PINS = [
  'High calories',
  'Deep-fried',
  'Fried',
  'Added Sugar',
  'High sat fat',
  'Creamy',
  'Heavy Sauce',
  'High carbs',
  'Refined Carbs',
  'Processed',
  'Allergen',
  'Dislike',
] as const;

const AVOID_MAINTAIN_WEIGHT_PINS = [
  'Very High Sodium',
  'Added Sugar',
  'Deep-fried',
  'Fried',
  'High sat fat',
  'Creamy',
  'Heavy Sauce',
  'Ultra-processed',
  'Processed',
  'Refined Carbs',
  'Allergen',
  'Dislike',
] as const;

const AVOID_GAIN_MUSCLE_PINS = [
  'Very Low Protein',
  'Too Low Cals',
  'No Carbs',
  'Tiny Portion',
  'Added Sugar',
  'Deep-fried',
  'Fried',
  'High sat fat',
  'Processed',
  'Allergen',
  'Dislike',
] as const;

const AVOID_EAT_HEALTHIER_PINS = [
  'Ultra-processed',
  'Processed',
  'Very High Sodium',
  'Added Sugar',
  'Deep-fried',
  'Fried',
  'High sat fat',
  'Creamy',
  'Heavy Sauce',
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

/** Returns the pin whitelist for the given goal (12 pins). Pins in AI response must be a subset of this list. */
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
