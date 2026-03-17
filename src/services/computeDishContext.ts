import { MacroTotals, Goal } from '../domain/models';
import { RawDish } from '../ai/menuAnalysis';
import { MealPeriod, isLastMeal, getMealsRemainingAfter } from './mealTiming';

export type DishContextResult = {
  contextNote: string | undefined;
  shouldDowngrade: boolean; // true = TOP -> OK
};

function getRemainingMacros(targets: MacroTotals, eaten: MacroTotals): MacroTotals {
  return {
    caloriesKcal: targets.caloriesKcal - eaten.caloriesKcal,
    proteinG: targets.proteinG - eaten.proteinG,
    carbsG: targets.carbsG - eaten.carbsG,
    fatG: targets.fatG - eaten.fatG,
  };
}

// Returns true if dish takes more than 60% of remaining nutrient
function exceedsRemainder(dishValue: number, remainingValue: number): boolean {
  if (remainingValue <= 0) return true;
  return dishValue / remainingValue > 0.6;
}

// Returns true if nutrient is already over daily target
function isOverLimit(eaten: number, target: number): boolean {
  return eaten >= target;
}

export function computeDishContext(params: {
  dish: RawDish;
  goal: Goal;
  dailyTargets: MacroTotals | null | undefined;
  eatenToday: MacroTotals;
  mealPeriod: MealPeriod;
}): DishContextResult {
  const { dish, goal, dailyTargets, eatenToday, mealPeriod } = params;

  if (!dailyTargets) {
    return { contextNote: undefined, shouldDowngrade: false };
  }
  if (!dish.nutrition) {
    return { contextNote: undefined, shouldDowngrade: false };
  }

  const lastMeal = isLastMeal(mealPeriod);
  const mealsRemainingAfter = getMealsRemainingAfter(mealPeriod);
  const remaining = getRemainingMacros(dailyTargets, eatenToday);

  const withDowngradeRule = (
    contextNote: string | undefined,
    shouldDowngrade: boolean
  ): DishContextResult => ({
    contextNote,
    shouldDowngrade: lastMeal ? false : shouldDowngrade,
  });

  if (goal === 'Lose fat') {
    if (isOverLimit(eatenToday.caloriesKcal, dailyTargets.caloriesKcal)) {
      return withDowngradeRule("You've hit your calorie limit today", true);
    }

    if (isOverLimit(eatenToday.carbsG, dailyTargets.carbsG)) {
      return withDowngradeRule("You're over your carb goal today", true);
    }

    if (
      mealsRemainingAfter >= 1 &&
      exceedsRemainder(dish.nutrition.caloriesKcal, remaining.caloriesKcal)
    ) {
      return withDowngradeRule('Takes up most of your remaining calories', true);
    }

    if (
      mealsRemainingAfter >= 1 &&
      exceedsRemainder(dish.nutrition.carbsG, remaining.carbsG)
    ) {
      return withDowngradeRule('Too many carbs for the rest of your day', true);
    }

    if (
      eatenToday.proteinG < 0.4 * dailyTargets.proteinG &&
      dish.nutrition.proteinG >= 25
    ) {
      return withDowngradeRule('Helps hit your protein goal', false);
    }

    return withDowngradeRule(undefined, false);
  }

  if (goal === 'Gain muscle') {
    if (isOverLimit(eatenToday.caloriesKcal, dailyTargets.caloriesKcal)) {
      return withDowngradeRule("You've hit your calorie limit today", true);
    }

    if (
      lastMeal &&
      isOverLimit(eatenToday.carbsG, dailyTargets.carbsG)
    ) {
      return withDowngradeRule("You've had enough carbs today", false);
    }

    if (
      mealsRemainingAfter >= 1 &&
      exceedsRemainder(dish.nutrition.caloriesKcal, remaining.caloriesKcal)
    ) {
      return withDowngradeRule('Takes up most of your remaining calories', true);
    }

    const proteinUndereaten = eatenToday.proteinG < 0.4 * dailyTargets.proteinG;
    if (
      proteinUndereaten &&
      lastMeal &&
      dish.nutrition.proteinG >= 30
    ) {
      return withDowngradeRule('You need more protein today — great pick', false);
    }

    if (
      proteinUndereaten &&
      dish.nutrition.proteinG >= 30
    ) {
      return withDowngradeRule('You need more protein today — great pick', false);
    }

    return withDowngradeRule(undefined, false);
  }

  if (goal === 'Maintain weight') {
    if (isOverLimit(eatenToday.caloriesKcal, dailyTargets.caloriesKcal)) {
      return withDowngradeRule("You've hit your calorie limit today", true);
    }

    if (
      mealsRemainingAfter >= 1 &&
      exceedsRemainder(dish.nutrition.caloriesKcal, remaining.caloriesKcal)
    ) {
      return withDowngradeRule('Takes up most of your remaining calories', true);
    }

    return withDowngradeRule(undefined, false);
  }

  if (dish.nutrition.caloriesKcal > 800) {
    return withDowngradeRule('Quite large — better as your one main meal', true);
  }

  return withDowngradeRule(undefined, false);
}
