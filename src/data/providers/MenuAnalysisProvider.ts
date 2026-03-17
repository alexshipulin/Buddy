import { DailyNutritionState } from '../../domain/dayBudget';
import { MenuScanResult, NutritionTargets, UserProfile } from '../../domain/models';

export type MenuAnalysisContext = {
  analysisId?: number;
  sessionId?: string;
  targets?: NutritionTargets;
  dailyState?: DailyNutritionState;
};

export interface MenuAnalysisProvider {
  analyzeMenu(
    images: string[],
    user: UserProfile,
    signal?: AbortSignal,
    context?: MenuAnalysisContext
  ): Promise<MenuScanResult>;
}
