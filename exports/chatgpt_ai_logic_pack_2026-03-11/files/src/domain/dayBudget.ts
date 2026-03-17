import type { Goal, NutritionTargets } from './models';

export type DayPhase = 'morning' | 'mid' | 'evening';

export type DailyConsumed = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type DailyNutritionState = {
  dateKey: string;
  consumed: DailyConsumed;
  mealsLoggedCount: number;
  firstMealTime: number | null;
  lastMealTime: number | null;
  mealsPerDay?: number | null;
  wholeFoodsMealsCount?: number;
  processedMealsCount?: number;
};

export type RemainingMacros = DailyConsumed;

export type FeasibilityParams = {
  goal: Goal;
  remaining: RemainingMacros;
  remainingMeals: number;
  dish: DailyConsumed;
};

export type FeasibilityResult = {
  ok: boolean;
  proteinPerMealNeededAfter: number;
  caloriesPerMealLeftAfter: number;
};

export type SoftPerMealBudget = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type MacroPressure = {
  caloriePressure: number;
  proteinCoverage: number;
  carbPressure: number;
  fatPressure: number;
};

export function getLocalDateKey(now: Date): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDayPhase(now: Date): DayPhase {
  const hour = now.getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'mid';
  return 'evening';
}

export function isFirstMealFlex(state: DailyNutritionState, now: Date): boolean {
  return state.mealsLoggedCount === 0 && now.getHours() < 14;
}

export function estimateRemainingMeals(
  state: DailyNutritionState,
  now: Date,
  mealsPerDay?: number | null
): number {
  const configuredMealsPerDay = mealsPerDay ?? state.mealsPerDay;
  if (typeof configuredMealsPerDay === 'number' && Number.isFinite(configuredMealsPerDay)) {
    return Math.max(1, Math.round(configuredMealsPerDay) - state.mealsLoggedCount);
  }

  const defaultByPhase: Record<DayPhase, number> = {
    morning: 3,
    mid: 2,
    evening: 1,
  };
  const baseline = defaultByPhase[getDayPhase(now)];
  return Math.max(1, baseline - state.mealsLoggedCount);
}

export function computeRemaining(
  targets: Pick<NutritionTargets, 'caloriesKcal' | 'proteinG' | 'carbsG' | 'fatG'>,
  consumed: DailyConsumed
): RemainingMacros {
  return {
    calories: targets.caloriesKcal - consumed.calories,
    protein: targets.proteinG - consumed.protein,
    carbs: targets.carbsG - consumed.carbs,
    fat: targets.fatG - consumed.fat,
  };
}

function proteinLimit(goal: Goal): number {
  switch (goal) {
    case 'Gain muscle':
      return 70;
    case 'Lose fat':
    case 'Maintain weight':
    case 'Eat healthier':
    default:
      return 60;
  }
}

export function feasibilityAfterPick(params: FeasibilityParams): FeasibilityResult {
  const proteinAfter = params.remaining.protein - params.dish.protein;
  const mealsAfter = Math.max(1, params.remainingMeals - 1);
  const proteinPerMealNeededAfter = proteinAfter / mealsAfter;

  const caloriesAfter = params.remaining.calories - params.dish.calories;
  const caloriesPerMealLeftAfter = caloriesAfter / mealsAfter;

  const proteinOk = proteinPerMealNeededAfter <= proteinLimit(params.goal);
  const caloriesOk = caloriesPerMealLeftAfter >= 300;

  return {
    ok: proteinOk && caloriesOk,
    proteinPerMealNeededAfter,
    caloriesPerMealLeftAfter,
  };
}

export function computeSoftPerMealBudget(
  remaining: RemainingMacros,
  remainingMeals: number
): SoftPerMealBudget {
  const meals = Math.max(1, Math.round(remainingMeals));
  return {
    calories: Math.max(1, remaining.calories / meals),
    protein: Math.max(1, remaining.protein / meals),
    carbs: Math.max(1, remaining.carbs / meals),
    fat: Math.max(1, remaining.fat / meals),
  };
}

export function computeMacroPressure(
  dish: DailyConsumed,
  softPerMeal: SoftPerMealBudget
): MacroPressure {
  return {
    caloriePressure: dish.calories / softPerMeal.calories,
    proteinCoverage: dish.protein / softPerMeal.protein,
    carbPressure: dish.carbs / softPerMeal.carbs,
    fatPressure: dish.fat / softPerMeal.fat,
  };
}

export function createEmptyDailyNutritionState(dateKey: string): DailyNutritionState {
  return {
    dateKey,
    consumed: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    mealsLoggedCount: 0,
    firstMealTime: null,
    lastMealTime: null,
    mealsPerDay: undefined,
    wholeFoodsMealsCount: 0,
    processedMealsCount: 0,
  };
}
