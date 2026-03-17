export type MealPeriod = 'breakfast' | 'lunch' | 'snack' | 'dinner';

export function getMealPeriod(date: Date): MealPeriod {
  const hour = date.getHours();
  if (hour >= 6 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 15 && hour < 18) return 'snack';
  return 'dinner';
}

// Returns how many meals are expected remaining after this one, including current
// breakfast -> 3 meals ahead (lunch, snack, dinner)
// lunch     -> 2 meals ahead (snack, dinner)
// snack     -> 1 meal ahead (dinner)
// dinner    -> 0 meals ahead (this is the last one)
export function getMealsRemainingAfter(period: MealPeriod): number {
  if (period === 'breakfast') return 3;
  if (period === 'lunch') return 2;
  if (period === 'snack') return 1;
  return 0; // dinner
}

export function isLastMeal(period: MealPeriod): boolean {
  return period === 'dinner';
}
