import {
  computeRemaining,
  createEmptyDailyNutritionState,
  estimateRemainingMeals,
  feasibilityAfterPick,
  getDayPhase,
  isFirstMealFlex,
} from './dayBudget';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function atLocalHour(hour: number): Date {
  return new Date(2026, 2, 5, hour, 0, 0, 0);
}

function testGetDayPhase(): void {
  assert(getDayPhase(atLocalHour(8)) === 'morning', 'Expected morning for 08:00');
  assert(getDayPhase(atLocalHour(12)) === 'mid', 'Expected mid for 12:00');
  assert(getDayPhase(atLocalHour(16)) === 'mid', 'Expected mid for 16:00');
  assert(getDayPhase(atLocalHour(17)) === 'evening', 'Expected evening for 17:00');
}

function testIsFirstMealFlex(): void {
  const base = createEmptyDailyNutritionState('2026-03-05');
  assert(isFirstMealFlex(base, atLocalHour(9)) === true, 'Expected first-meal flex before 14:00');
  assert(isFirstMealFlex(base, atLocalHour(14)) === false, 'Expected no first-meal flex from 14:00');
  assert(
    isFirstMealFlex({ ...base, mealsLoggedCount: 1 }, atLocalHour(10)) === false,
    'Expected no first-meal flex after first meal'
  );
}

function testEstimateRemainingMeals(): void {
  const base = createEmptyDailyNutritionState('2026-03-05');
  assert(estimateRemainingMeals(base, atLocalHour(9)) === 3, 'Expected 3 remaining meals in morning default');
  assert(
    estimateRemainingMeals({ ...base, mealsLoggedCount: 1 }, atLocalHour(13)) === 1,
    'Expected max(1, 2 - 1) in mid phase'
  );
  assert(
    estimateRemainingMeals({ ...base, mealsLoggedCount: 2 }, atLocalHour(20)) === 1,
    'Expected floor to 1 in evening default'
  );
  assert(
    estimateRemainingMeals({ ...base, mealsLoggedCount: 2 }, atLocalHour(10), 5) === 3,
    'Expected configured mealsPerDay to override phase default'
  );
}

function testFeasibilityAfterPick(): void {
  const ok = feasibilityAfterPick({
    goal: 'Maintain weight',
    remaining: { calories: 1200, protein: 120, carbs: 120, fat: 40 },
    remainingMeals: 3,
    dish: { calories: 400, protein: 30, carbs: 20, fat: 10 },
  });
  assert(ok.ok === true, 'Expected feasibility to pass for balanced dish');

  const proteinFail = feasibilityAfterPick({
    goal: 'Gain muscle',
    remaining: { calories: 1800, protein: 200, carbs: 200, fat: 70 },
    remainingMeals: 2,
    dish: { calories: 300, protein: 20, carbs: 20, fat: 8 },
  });
  assert(proteinFail.ok === false, 'Expected feasibility to fail on protein pressure');

  const caloriesFail = feasibilityAfterPick({
    goal: 'Eat healthier',
    remaining: { calories: 500, protein: 60, carbs: 70, fat: 20 },
    remainingMeals: 2,
    dish: { calories: 300, protein: 10, carbs: 20, fat: 5 },
  });
  assert(caloriesFail.ok === false, 'Expected feasibility to fail on low calories-per-meal left');

  const remaining = computeRemaining(
    {
      caloriesKcal: 2000,
      proteinG: 130,
      carbsG: 220,
      fatG: 70,
    },
    {
      calories: 800,
      protein: 50,
      carbs: 80,
      fat: 25,
    }
  );
  assert(remaining.calories === 1200, 'Expected calories remaining to be 1200');
  assert(remaining.protein === 80, 'Expected protein remaining to be 80');
}

export function runDayBudgetTests(): void {
  testGetDayPhase();
  testIsFirstMealFlex();
  testEstimateRemainingMeals();
  testFeasibilityAfterPick();
}
