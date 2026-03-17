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

  // For "already over" situations — downgrade applies even at dinner
  function hardResult(note: string): DishContextResult {
    return { contextNote: note, shouldDowngrade: true };
  }

  // For "future pressure" situations — downgrade suppressed at last meal
  function softResult(note: string, downgrade: boolean): DishContextResult {
    const shouldDowngrade = downgrade ? (last ? false : true) : false;
    return { contextNote: note, shouldDowngrade };
  }

  // Universal: if fat target already exceeded and dish is high in fat → downgrade
  if (eatenToday.fatG > dailyTargets.fatG && nut.fatG > 20) {
    return hardResult('Already over fat goal today — choose lower fat');
  }

  if (goal === 'Lose fat') {
    // Fat over
    if (isOver(eatenToday.fatG, dailyTargets.fatG) && nut.fatG > 15) {
      return hardResult('Already over fat goal today');
    }
    // Calories over
    if (isOver(eatenToday.caloriesKcal, dailyTargets.caloriesKcal)) {
      return hardResult("You've hit your calorie limit today");
    }
    // Carbs over
    if (isOver(eatenToday.carbsG, dailyTargets.carbsG)) {
      return hardResult("You're over your carb goal today");
    }
    // This dish takes >60% of remaining calories
    if (exceedsRemainder(nut.caloriesKcal, remaining.caloriesKcal) && mealsLeft >= 1) {
      return softResult('Takes up most of your remaining calories', true);
    }
    // This dish takes >60% of remaining carbs
    if (exceedsRemainder(nut.carbsG, remaining.carbsG) && mealsLeft >= 1) {
      return softResult('Too many carbs for the rest of your day', true);
    }
    // Positive: still need protein
    if (eatenToday.proteinG < 0.4 * dailyTargets.proteinG && nut.proteinG >= 25) {
      return softResult('Helps hit your protein goal', false);
    }
    return { contextNote: undefined, shouldDowngrade: false };
  }

  if (goal === 'Gain muscle') {
    // Fat already over target
    if (isOver(eatenToday.fatG, dailyTargets.fatG) && nut.fatG > 20) {
      return hardResult('Already over fat goal — pick lower fat option');
    }
    // Calories over
    if (isOver(eatenToday.caloriesKcal, dailyTargets.caloriesKcal)) {
      return hardResult("You've hit your calorie limit today");
    }
    // Carbs over at last meal
    if (isOver(eatenToday.carbsG, dailyTargets.carbsG) && last) {
      return hardResult("You've had enough carbs today");
    }
    // This dish takes up too much of remaining calories
    if (exceedsRemainder(nut.caloriesKcal, remaining.caloriesKcal) && mealsLeft >= 1) {
      return softResult('Takes up most of your remaining calories', true);
    }
    // Positive signal: still need protein
    if (eatenToday.proteinG < 0.4 * dailyTargets.proteinG && nut.proteinG >= 30) {
      return { contextNote: 'You need more protein today — great pick', shouldDowngrade: false };
    }
    return { contextNote: undefined, shouldDowngrade: false };
  }

  if (goal === 'Maintain weight') {
    if (isOver(eatenToday.caloriesKcal, dailyTargets.caloriesKcal)) {
      return hardResult("You've hit your calorie limit today");
    }
    if (exceedsRemainder(nut.caloriesKcal, remaining.caloriesKcal) && mealsLeft >= 1) {
      return softResult('Takes up most of your remaining calories', true);
    }
    return { contextNote: undefined, shouldDowngrade: false };
  }

  if (goal === 'Eat healthier') {
    if (isOver(eatenToday.fatG, dailyTargets.fatG) && nut.fatG > 20) {
      return hardResult('Already over fat goal today');
    }
    if (nut.caloriesKcal > 800) {
      return softResult('Quite large — better as your one main meal', true);
    }
    return { contextNote: undefined, shouldDowngrade: false };
  }

  return { contextNote: undefined, shouldDowngrade: false };
}
