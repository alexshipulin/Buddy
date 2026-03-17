export type MealPeriod = 'breakfast' | 'lunch' | 'snack' | 'dinner';

export function getMealPeriod(date: Date): MealPeriod {
  const hour = date.getHours();
  if (hour >= 6 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 15 && hour < 18) return 'snack';
  return 'dinner';
}

export function getMealsRemainingAfter(period: MealPeriod): number {
  if (period === 'breakfast') return 3;
  if (period === 'lunch') return 2;
  if (period === 'snack') return 1;
  return 0;
}

export function isLastMeal(period: MealPeriod): boolean {
  return period === 'dinner';
}
