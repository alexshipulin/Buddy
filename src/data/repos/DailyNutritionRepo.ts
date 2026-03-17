import type { MacroTotals } from '../../domain/models';
import {
  createEmptyDailyNutritionState,
  DailyNutritionState,
  getLocalDateKey,
} from '../../domain/dayBudget';
import { getJson, setJson } from '../storage/storage';

const DAILY_NUTRITION_KEY = 'buddy_daily_nutrition_state';

export class DailyNutritionRepo {
  async getToday(now: Date = new Date()): Promise<DailyNutritionState> {
    const dateKey = getLocalDateKey(now);
    const raw = await getJson<DailyNutritionState | null>(DAILY_NUTRITION_KEY, null);
    if (!raw || raw.dateKey !== dateKey) {
      const empty = createEmptyDailyNutritionState(dateKey);
      await setJson(DAILY_NUTRITION_KEY, empty);
      return empty;
    }
    return {
      ...raw,
      consumed: {
        calories: Number(raw.consumed?.calories ?? 0),
        protein: Number(raw.consumed?.protein ?? 0),
        carbs: Number(raw.consumed?.carbs ?? 0),
        fat: Number(raw.consumed?.fat ?? 0),
      },
      mealsLoggedCount: Number(raw.mealsLoggedCount ?? 0),
      firstMealTime: raw.firstMealTime ?? null,
      lastMealTime: raw.lastMealTime ?? null,
      mealsPerDay: raw.mealsPerDay,
      wholeFoodsMealsCount: Number(raw.wholeFoodsMealsCount ?? 0),
      processedMealsCount: Number(raw.processedMealsCount ?? 0),
    };
  }

  async saveToday(state: DailyNutritionState): Promise<void> {
    await setJson(DAILY_NUTRITION_KEY, state);
  }

  async applyLoggedMeal(
    macros: MacroTotals,
    now: Date = new Date()
  ): Promise<DailyNutritionState> {
    const current = await this.getToday(now);
    const timestamp = now.getTime();
    const next: DailyNutritionState = {
      ...current,
      consumed: {
        calories: current.consumed.calories + macros.caloriesKcal,
        protein: current.consumed.protein + macros.proteinG,
        carbs: current.consumed.carbs + macros.carbsG,
        fat: current.consumed.fat + macros.fatG,
      },
      mealsLoggedCount: current.mealsLoggedCount + 1,
      firstMealTime: current.firstMealTime ?? timestamp,
      lastMealTime: timestamp,
    };
    await this.saveToday(next);
    return next;
  }
}
