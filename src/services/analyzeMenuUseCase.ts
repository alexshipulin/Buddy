import { MenuAnalysisProvider } from '../data/providers/MenuAnalysisProvider';
import { DailyNutritionRepo } from '../data/repos/DailyNutritionRepo';
import { HistoryRepo } from '../data/repos/HistoryRepo';
import { TrialRepo } from '../data/repos/TrialRepo';
import { UserRepo } from '../data/repos/UserRepo';
import { TEST_MODE } from '../config/flags';
import { createId } from '../utils/id';
import { withInflight } from '../ai/inflight';
import { AllModelsRateLimitedError } from '../ai/geminiClient';
import { logAIDebug } from '../ai/aiDebugLog';
import { nextAnalysisRunId } from '../ai/analysisRunId';
import { buildFallbackTargets } from '../domain/recommendationRanking';

export { MenuAnalysisFailedError } from '../data/providers/GeminiMenuAnalysisProvider';
export { MenuAnalysisValidationError } from '../validation/menuAnalysisValidator';
export { MenuAnalysisInvalidJsonError } from '../ai/menuAnalysis';

type Deps = {
  historyRepo: HistoryRepo;
  userRepo: UserRepo;
  trialRepo: TrialRepo;
  dailyNutritionRepo: DailyNutritionRepo;
  menuProvider: MenuAnalysisProvider;
};

export class DailyScanLimitReachedError extends Error {
  constructor() {
    super('Daily menu scan limit reached');
    this.name = 'DailyScanLimitReachedError';
  }
}

export type AnalyzeMenuOutput = {
  resultId: string;
  analysisId: number;
  shouldShowPaywallAfterResults: boolean;
  trialDaysLeft: number;
};

export async function analyzeMenuUseCase(images: string[], deps: Deps): Promise<AnalyzeMenuOutput> {
  return withInflight('menu_scan', async (signal) => {
    const analysisId = await nextAnalysisRunId();
    const sessionId = createId('menu_scan');
    const startedAt = Date.now();
    let dailyIndicatorsForLog: Record<string, unknown> | null = null;
    logAIDebug({
      level: 'info',
      task: 'menu_scan',
      stage: 'use_case.start',
      message: 'analyzeMenuUseCase started',
      sessionId,
      analysisId,
      details: { imagesCount: images.length, testMode: TEST_MODE },
    });
    try {
      const user = await deps.userRepo.getUser();
      if (!user) throw new Error('User profile is not set');
      const [savedTargets, dailyState] = await Promise.all([
        deps.userRepo.getNutritionTargets(),
        deps.dailyNutritionRepo.getToday(),
      ]);
      const targets = savedTargets ?? buildFallbackTargets(user.goal);
      dailyIndicatorsForLog = {
        dateKey: dailyState.dateKey,
        goal: user.goal,
        mealsLoggedCount: dailyState.mealsLoggedCount,
        targets: {
          calories: targets.caloriesKcal,
          protein: targets.proteinG,
          carbs: targets.carbsG,
          fat: targets.fatG,
        },
        consumed: {
          calories: dailyState.consumed.calories,
          protein: dailyState.consumed.protein,
          carbs: dailyState.consumed.carbs,
          fat: dailyState.consumed.fat,
        },
      };
      if (!TEST_MODE) {
        const canScan = await deps.trialRepo.canScanToday();
        if (!canScan) throw new DailyScanLimitReachedError();
      }

      const result = await deps.menuProvider.analyzeMenu(images, user, {
        historyRepo: deps.historyRepo,
        analysisId,
        sessionId,
      });
      const resultWithAnalysisId = { ...result, analysisId };
      await deps.historyRepo.saveScanResult(resultWithAnalysisId);
      await deps.historyRepo.addItem({
        id: createId('history'),
        type: 'menu_scan',
        title: 'Menu scan',
        createdAt: resultWithAnalysisId.createdAt,
        payloadRef: resultWithAnalysisId.id,
        imageUris: images,
      });
      if (!TEST_MODE) {
        await deps.trialRepo.incrementDailyScanAfterSuccess();
      }
      const first = await deps.trialRepo.registerFirstResultIfNeeded(new Date());
      logAIDebug({
        level: 'info',
        task: 'menu_scan',
        stage: 'use_case.success',
        message: 'analyzeMenuUseCase finished',
        sessionId,
        analysisId,
        durationMs: Date.now() - startedAt,
        details: {
          resultId: resultWithAnalysisId.id,
          dailyIndicators: dailyIndicatorsForLog,
          topCount: resultWithAnalysisId.topPicks.length,
          cautionCount: resultWithAnalysisId.caution.length,
          avoidCount: resultWithAnalysisId.avoid.length,
          shouldShowPaywallAfterResults: first.isFirstResult,
          trialDaysLeft: deps.trialRepo.getTrialDaysLeft(first.state, new Date()),
        },
      });
      return {
        resultId: resultWithAnalysisId.id,
        analysisId,
        shouldShowPaywallAfterResults: first.isFirstResult,
        trialDaysLeft: deps.trialRepo.getTrialDaysLeft(first.state, new Date()),
      };
    } catch (e) {
      if (e instanceof AllModelsRateLimitedError) {
        await deps.trialRepo.setAiQuotaExhausted();
      }
      if (e && typeof e === 'object') {
        (e as { analysisId?: number }).analysisId = analysisId;
      }
      logAIDebug({
        level: 'error',
        task: 'menu_scan',
        stage: 'use_case.error',
        message: 'analyzeMenuUseCase failed',
        sessionId,
        analysisId,
        durationMs: Date.now() - startedAt,
        details: {
          dailyIndicators: dailyIndicatorsForLog,
          errName: (e as Error)?.name,
          errMsg: (e as Error)?.message?.slice(0, 240),
        },
      });
      throw e;
    }
  });
}
