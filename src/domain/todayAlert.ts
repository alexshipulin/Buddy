import {
  computeRemaining,
  DailyNutritionState,
  estimateRemainingMeals,
  getDayPhase,
} from './dayBudget';
import { Goal, NutritionTargets } from './models';

type Params = {
  goal: Goal;
  targets: NutritionTargets;
  dailyState: DailyNutritionState;
  now: Date;
  wholeFoodsMealsCount: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function isMaintainMacroOff(
  consumed: DailyNutritionState['consumed'],
  targets: NutritionTargets
): boolean {
  const pairs: Array<[number, number]> = [
    [consumed.protein, targets.proteinG],
    [consumed.carbs, targets.carbsG],
    [consumed.fat, targets.fatG],
  ];
  return pairs.some(([consumedValue, targetValue]) => {
    if (targetValue <= 0) return false;
    return Math.abs(consumedValue - targetValue) / targetValue >= 0.25;
  });
}

function expectedProgressByMeals(state: DailyNutritionState, now: Date): number {
  const mealsPerDay = state.mealsPerDay ?? null;
  if (typeof mealsPerDay === 'number' && Number.isFinite(mealsPerDay) && mealsPerDay > 0) {
    return clamp(state.mealsLoggedCount / mealsPerDay, 0, 1);
  }

  const phase = getDayPhase(now);
  switch (phase) {
    case 'morning':
      return 0.25;
    case 'mid':
      return 0.55;
    case 'evening':
    default:
      return 0.8;
  }
}

const LOSE_FAT_CALORIES_OVER_RATIO = 1.05;
const LOSE_FAT_FAT_OVER_RATIO = 1.15;
const LOSE_FAT_MIN_CALORIES_PER_MEAL_LEFT = 350;
const LOSE_FAT_MIN_FAT_PER_MEAL_LEFT = 14;

export function getTodayAlertText({
  goal,
  targets,
  dailyState,
  now,
  wholeFoodsMealsCount,
}: Params): string | null {
  const consumed = dailyState.consumed;
  const remaining = computeRemaining(targets, consumed);
  const remainingMeals = estimateRemainingMeals(dailyState, now, dailyState.mealsPerDay);
  const isHighFat = consumed.fat >= targets.fatG * LOSE_FAT_FAT_OVER_RATIO;
  if (isHighFat) {
    return 'Fat is high today. Choose lean protein and lower-fat meals next.';
  }

  if (goal === 'Lose fat') {
    const isHighCalories = consumed.calories >= targets.caloriesKcal * LOSE_FAT_CALORIES_OVER_RATIO;
    const caloriesPerMealLeft = remaining.calories / remainingMeals;
    const fatPerMealLeft = remaining.fat / remainingMeals;
    if (fatPerMealLeft < LOSE_FAT_MIN_FAT_PER_MEAL_LEFT) {
      return 'Fat is high today. Choose lean protein and lower-fat meals next.';
    }
    if (isHighCalories || caloriesPerMealLeft < LOSE_FAT_MIN_CALORIES_PER_MEAL_LEFT) {
      return 'High calories today. Go lighter for the rest of the day.';
    }
    return null;
  }

  if (goal === 'Maintain weight') {
    const caloriesOffBy12 = Math.abs(consumed.calories - targets.caloriesKcal) >= targets.caloriesKcal * 0.12;
    if (caloriesOffBy12 || isMaintainMacroOff(consumed, targets)) {
      return 'Balance is off today. Aim for a balanced next choice.';
    }
    return null;
  }

  if (goal === 'Gain muscle') {
    const proteinPressure = remaining.protein / remainingMeals > 45;
    const progress = expectedProgressByMeals(dailyState, now);
    const behindProtein = consumed.protein < targets.proteinG * progress;
    if (proteinPressure || behindProtein) {
      return 'Need more protein today. Add a protein meal.';
    }
    return null;
  }

  const phase = getDayPhase(now);
  if ((phase === 'mid' || phase === 'evening') && wholeFoodsMealsCount === 0) {
    return 'Low on whole foods today. Add veggies and protein.';
  }
  return null;
}
