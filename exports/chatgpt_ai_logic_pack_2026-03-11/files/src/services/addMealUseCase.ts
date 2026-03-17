import { DailyNutritionRepo } from '../data/repos/DailyNutritionRepo';
import { HistoryRepo } from '../data/repos/HistoryRepo';
import { MealEntry } from '../domain/models';
import { createId } from '../utils/id';

export async function addMealUseCase(
  meal: MealEntry,
  deps: { historyRepo: HistoryRepo; dailyNutritionRepo?: DailyNutritionRepo }
): Promise<void> {
  await deps.historyRepo.saveMeal(meal);
  await deps.historyRepo.addItem({
    id: createId('history'),
    type: 'meal',
    title: meal.title,
    createdAt: meal.createdAt,
    payloadRef: meal.id,
    imageUris: meal.imageUri ? [meal.imageUri] : undefined,
  });
  if (deps.dailyNutritionRepo) {
    await deps.dailyNutritionRepo.applyLoggedMeal(meal.macros, new Date(meal.createdAt));
  }
}
