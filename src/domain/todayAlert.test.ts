import { createEmptyDailyNutritionState } from './dayBudget';
import type { Goal, NutritionTargets } from './models';
import { getTodayAlertText } from './todayAlert';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function atHour(hour: number): Date {
  return new Date(2026, 2, 5, hour, 0, 0, 0);
}

function targets(): NutritionTargets {
  return {
    caloriesKcal: 2000,
    proteinG: 150,
    carbsG: 200,
    fatG: 70,
    bmrKcal: 1500,
    tdeeKcal: 2100,
    assumptions: { ageUsed: 30, activityMult: 1.3 },
    computedAt: '2026-03-05T00:00:00.000Z',
  };
}

function stateWith(
  consumed: { calories: number; protein: number; carbs: number; fat: number },
  mealsLoggedCount: number,
  mealsPerDay?: number | null
) {
  return {
    ...createEmptyDailyNutritionState('2026-03-05'),
    consumed,
    mealsLoggedCount,
    mealsPerDay,
  };
}

function text(goal: Goal, dailyState: ReturnType<typeof stateWith>, now: Date, wholeFoodsMealsCount = 0): string | null {
  return getTodayAlertText({
    goal,
    targets: targets(),
    dailyState,
    now,
    wholeFoodsMealsCount,
  });
}

function testLoseFatTrigger(): void {
  const t = text(
    'Lose fat',
    stateWith({ calories: 2100, protein: 80, carbs: 120, fat: 30 }, 2, 4),
    atHour(15)
  );
  assert(t === 'High calories today. Go lighter for the rest of the day.', 'Lose fat copy mismatch');
}

function testLoseFatFatTrigger(): void {
  const t = text(
    'Lose fat',
    stateWith({ calories: 1700, protein: 120, carbs: 140, fat: 95 }, 2, 4),
    atHour(15)
  );
  assert(
    t === 'Fat is high today. Choose lean protein and lower-fat meals next.',
    'Lose fat high-fat copy mismatch'
  );
}

function testLoseFatFatPriorityOverCalories(): void {
  const t = text(
    'Lose fat',
    stateWith({ calories: 2300, protein: 120, carbs: 140, fat: 110 }, 2, 4),
    atHour(15)
  );
  assert(
    t === 'Fat is high today. Choose lean protein and lower-fat meals next.',
    'Lose fat fat-priority copy mismatch'
  );
}

function testMaintainWeightTrigger(): void {
  const t = text(
    'Maintain weight',
    stateWith({ calories: 1700, protein: 60, carbs: 140, fat: 50 }, 2, 4),
    atHour(14)
  );
  assert(t === 'Balance is off today. Aim for a balanced next choice.', 'Maintain copy mismatch');
}

function testGainMuscleTrigger(): void {
  const t = text(
    'Gain muscle',
    stateWith({ calories: 800, protein: 30, carbs: 90, fat: 20 }, 1, 4),
    atHour(14)
  );
  assert(t === 'Need more protein today. Add a protein meal.', 'Gain muscle copy mismatch');
}

function testGainMuscleFatTrigger(): void {
  const t = text(
    'Gain muscle',
    stateWith({ calories: 1700, protein: 170, carbs: 220, fat: 105 }, 2, 4),
    atHour(15)
  );
  assert(
    t === 'Fat is high today. Choose lean protein and lower-fat meals next.',
    'Gain muscle high-fat copy mismatch'
  );
}

function testEatHealthierTrigger(): void {
  const t = text(
    'Eat healthier',
    stateWith({ calories: 900, protein: 70, carbs: 90, fat: 25 }, 1, 4),
    atHour(15),
    0
  );
  assert(t === 'Low on whole foods today. Add veggies and protein.', 'Eat healthier copy mismatch');
}

function testHiddenWhenNoTrigger(): void {
  const t = text(
    'Maintain weight',
    stateWith({ calories: 1980, protein: 145, carbs: 190, fat: 66 }, 3, 4),
    atHour(10),
    1
  );
  assert(t == null, 'Alert should be hidden when no trigger matches');
}

export function runTodayAlertTests(): void {
  testLoseFatTrigger();
  testLoseFatFatTrigger();
  testLoseFatFatPriorityOverCalories();
  testMaintainWeightTrigger();
  testGainMuscleTrigger();
  testGainMuscleFatTrigger();
  testEatHealthierTrigger();
  testHiddenWhenNoTrigger();
}
