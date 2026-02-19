import { HistoryRepo } from '../data/repos/HistoryRepo';
import { MacroTotals } from '../domain/models';
import { isSameDayIso } from '../utils/date';

const emptyTotals: MacroTotals = { caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };

export async function computeTodayMacrosUseCase(date: Date, deps: { historyRepo: HistoryRepo }): Promise<MacroTotals> {
  const iso = date.toISOString();
  const history = await deps.historyRepo.listRecent(500);
  const meals = history.filter((item) => item.type === 'meal' && isSameDayIso(item.createdAt, iso));
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
