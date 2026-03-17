import { MacroTotals, Goal } from '../domain/models';
import { RawDish } from '../ai/menuAnalysis';
import { MealPeriod, isLastMeal, getMealsRemainingAfter } from './mealTiming';

export type DishContextResult = {
  contextNote: string | undefined;
  shouldDowngrade: boolean;
};

function getRemaining(targets: MacroTotals, eaten: MacroTotals): MacroTotals {
  return {
    caloriesKcal: targets.caloriesKcal - eaten.caloriesKcal,
    proteinG: targets.proteinG - eaten.proteinG,
    carbsG: targets.carbsG - eaten.carbsG,
    fatG: targets.fatG - eaten.fatG,
  };
}

function exceedsRemainder(dishValue: number, remainingValue: number): boolean {
  if (remainingValue <= 0) return true;
  return dishValue / remainingValue > 0.6;
}

function isOver(eaten: number, target: number): boolean {
  return eaten >= target;
}

export function computeDishContext(params: {
  dish: RawDish;
  goal: Goal;
  dailyTargets: MacroTotals | null;
  eatenToday: MacroTotals;
  mealPeriod: MealPeriod;
}): DishContextResult {
  if (!params.dailyTargets || !params.dish.nutrition) {
    return { contextNote: undefined, shouldDowngrade: false };
  }

  const { dish, goal, dailyTargets, eatenToday, mealPeriod } = params;
  const remaining = getRemaining(dailyTargets, eatenToday);
  const last = isLastMeal(mealPeriod);
  const mealsLeft = getMealsRemainingAfter(mealPeriod);
  const nut = dish.nutrition;

  function result(note: string, downgrade: boolean): DishContextResult {
    return { contextNote: note, shouldDowngrade: downgrade && !last };
  }

  if (goal === 'Lose fat') {
    if (isOver(eatenToday.caloriesKcal, dailyTargets.caloriesKcal)) {
      return result("You've hit your calorie limit today", true);
    }
    if (isOver(eatenToday.carbsG, dailyTargets.carbsG)) {
      return result("You're over your carb goal today", true);
    }
    if (exceedsRemainder(nut.caloriesKcal, remaining.caloriesKcal) && mealsLeft >= 1) {
      return result('Takes up most of your remaining calories', true);
    }
    if (exceedsRemainder(nut.carbsG, remaining.carbsG) && mealsLeft >= 1) {
      return result('Too many carbs for the rest of your day', true);
    }
    if (eatenToday.proteinG < 0.4 * dailyTargets.proteinG && nut.proteinG >= 25) {
      return result('Helps hit your protein goal', false);
    }
    return { contextNote: undefined, shouldDowngrade: false };
  }

  if (goal === 'Gain muscle') {
    if (isOver(eatenToday.caloriesKcal, dailyTargets.caloriesKcal)) {
      return result("You've hit your calorie limit today", true);
    }
    if (isOver(eatenToday.carbsG, dailyTargets.carbsG) && last) {
      return { contextNote: "You've had enough carbs today", shouldDowngrade: false };
    }
    if (exceedsRemainder(nut.caloriesKcal, remaining.caloriesKcal) && mealsLeft >= 1) {
      return result('Takes up most of your remaining calories', true);
    }
    if (eatenToday.proteinG < 0.4 * dailyTargets.proteinG && last && nut.proteinG >= 30) {
      return { contextNote: 'You need more protein today — great pick', shouldDowngrade: false };
    }
    if (eatenToday.proteinG < 0.4 * dailyTargets.proteinG && nut.proteinG >= 30) {
      return { contextNote: 'You need more protein today — great pick', shouldDowngrade: false };
    }
    return { contextNote: undefined, shouldDowngrade: false };
  }

  if (goal === 'Maintain weight') {
    if (isOver(eatenToday.caloriesKcal, dailyTargets.caloriesKcal)) {
      return result("You've hit your calorie limit today", true);
    }
    if (exceedsRemainder(nut.caloriesKcal, remaining.caloriesKcal) && mealsLeft >= 1) {
      return result('Takes up most of your remaining calories', true);
    }
    return { contextNote: undefined, shouldDowngrade: false };
  }

  if (goal === 'Eat healthier') {
    if (nut.caloriesKcal > 800) {
      return result('Quite large — better as your one main meal', true);
    }
    return { contextNote: undefined, shouldDowngrade: false };
  }

  return { contextNote: undefined, shouldDowngrade: false };
}
