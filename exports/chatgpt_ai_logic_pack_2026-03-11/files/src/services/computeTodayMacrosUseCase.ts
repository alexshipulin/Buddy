import { HistoryRepo } from '../data/repos/HistoryRepo';
import { getLocalDateKey } from '../domain/dayBudget';
import { MacroTotals } from '../domain/models';

const emptyTotals: MacroTotals = { caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };

export async function computeTodayMacrosUseCase(date: Date, deps: { historyRepo: HistoryRepo }): Promise<MacroTotals> {
  const dateKey = getLocalDateKey(date);
  const history = await deps.historyRepo.listRecent(500);
  const meals = history.filter((item) => {
    if (item.type !== 'meal') return false;
    return getLocalDateKey(new Date(item.createdAt)) === dateKey;
  });
  const totals: MacroTotals = { ...emptyTotals };
  for (const item of meals) {
    const meal = await deps.historyRepo.getMealById(item.payloadRef);
    if (!meal) continue;
    totals.caloriesKcal += meal.macros.caloriesKcal;
    totals.proteinG += meal.macros.proteinG;
    totals.carbsG += meal.macros.carbsG;
    totals.fatG += meal.macros.fatG;
  }
  return totals;
}
