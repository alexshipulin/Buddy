import { HistoryRepo } from '../repos/HistoryRepo';
import { DailyNutritionState } from '../../domain/dayBudget';
import { MenuScanResult, NutritionTargets, UserProfile } from '../../domain/models';

export interface MenuAnalysisProvider {
  analyzeMenu(
    images: string[],
    user: UserProfile,
    deps: {
      historyRepo: HistoryRepo;
      analysisId?: number;
      sessionId?: string;
      targets?: NutritionTargets;
      dailyState?: DailyNutritionState;
    }
  ): Promise<MenuScanResult>;
}
