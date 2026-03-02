import type { Goal } from './models';

/** Pin whitelist per goal (TZ v0.1). Each list has exactly 12 pins. */
export type GoalPinsMap = Record<Goal, readonly string[]>;

const LOSE_FAT_PINS = [
  'Low calorie',
  'High fiber',
  'Lean protein',
  'Lower sodium',
  'Lower sugar',
  'Portion control',
  'Satiating',
  'Vegetable-forward',
  'Grilled or steamed',
  'Light dressing',
  'Whole foods',
  'No fried',
] as const;

const MAINTAIN_WEIGHT_PINS = [
  'Balanced',
  'Moderate protein',
  'Whole grains',
  'Vegetables',
  'Lean protein',
  'Fiber',
  'Lower sodium',
  'Variety',
  'Healthy fats',
  'Portion aware',
  'Fresh',
  'Seasonal',
] as const;

const GAIN_MUSCLE_PINS = [
  'High protein',
  'Protein-rich',
  'Complete protein',
  'Lean protein',
  'Calorie sufficient',
  'Strength support',
  'Recovery',
  'Amino acids',
  'Balanced macros',
  'Whole foods',
  'No empty calories',
  'Nutrient dense',
] as const;

const EAT_HEALTHIER_PINS = [
  'Whole foods',
  'Vegetable-forward',
  'Minimally processed',
  'Fiber',
  'Lower sodium',
  'Lower sugar',
  'Healthy fats',
  'Balanced',
  'Fresh',
  'Seasonal',
  'Variety',
  'Nutrient dense',
] as const;

const GOAL_PINS: GoalPinsMap = {
  'Lose fat': LOSE_FAT_PINS,
  'Maintain weight': MAINTAIN_WEIGHT_PINS,
  'Gain muscle': GAIN_MUSCLE_PINS,
  'Eat healthier': EAT_HEALTHIER_PINS,
};

/**
 * Returns the pin whitelist for the given goal (12 pins). Pins in AI response must be a subset of this list.
 */
export function getPinWhitelist(goal: Goal): string[] {
  return [...GOAL_PINS[goal]];
}
