import { MenuAnalysisProvider } from '../data/providers/MenuAnalysisProvider';
import { HistoryRepo } from '../data/repos/HistoryRepo';
import { TrialRepo } from '../data/repos/TrialRepo';
import { UserRepo } from '../data/repos/UserRepo';
import { TEST_MODE } from '../config/flags';
import { createId } from '../utils/id';
import { withInflight } from '../ai/inflight';
import { AllModelsRateLimitedError } from '../ai/geminiClient';
import { logAIDebug } from '../ai/aiDebugLog';

export { MenuAnalysisFailedError } from '../data/providers/GeminiMenuAnalysisProvider';
export { MenuAnalysisValidationError } from '../validation/menuAnalysisValidator';
export { MenuAnalysisInvalidJsonError } from '../ai/menuAnalysis';

type Deps = { historyRepo: HistoryRepo; userRepo: UserRepo; trialRepo: TrialRepo; menuProvider: MenuAnalysisProvider };

export class DailyScanLimitReachedError extends Error {
  constructor() {
    super('Daily menu scan limit reached');
    this.name = 'DailyScanLimitReachedError';
  }
}

export type AnalyzeMenuOutput = { resultId: string; shouldShowPaywallAfterResults: boolean; trialDaysLeft: number };

export async function analyzeMenuUseCase(images: string[], deps: Deps): Promise<AnalyzeMenuOutput> {
  return withInflight('menu_scan', async (signal) => {
    const sessionId = createId('menu_scan');
    const startedAt = Date.now();
    logAIDebug({
      level: 'info',
      task: 'menu_scan',
      stage: 'use_case.start',
      message: 'analyzeMenuUseCase started',
      sessionId,
      details: { imagesCount: images.length, testMode: TEST_MODE },
    });
    const user = await deps.userRepo.getUser();
    if (!user) throw new Error('User profile is not set');
    if (!TEST_MODE) {
      const canScan = await deps.trialRepo.canScanToday();
      if (!canScan) throw new DailyScanLimitReachedError();
    }

    try {
      const result = await deps.menuProvider.analyzeMenu(images, user, signal);
      await deps.historyRepo.saveScanResult(result);
      await deps.historyRepo.addItem({
        id: createId('history'),
        type: 'menu_scan',
        title: 'Menu scan',
        createdAt: result.createdAt,
        payloadRef: result.id,
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
        durationMs: Date.now() - startedAt,
        details: {
          resultId: result.id,
          shouldShowPaywallAfterResults: first.isFirstResult,
          trialDaysLeft: deps.trialRepo.getTrialDaysLeft(first.state, new Date()),
        },
      });
      return { resultId: result.id, shouldShowPaywallAfterResults: first.isFirstResult, trialDaysLeft: deps.trialRepo.getTrialDaysLeft(first.state, new Date()) };
    } catch (e) {
      if (e instanceof AllModelsRateLimitedError) {
        await deps.trialRepo.setAiQuotaExhausted();
      }
      logAIDebug({
        level: 'error',
        task: 'menu_scan',
        stage: 'use_case.error',
        message: 'analyzeMenuUseCase failed',
        sessionId,
        durationMs: Date.now() - startedAt,
        details: {
          errName: (e as Error)?.name,
          errMsg: (e as Error)?.message?.slice(0, 240),
        },
      });
      throw e;
    }
  });
}
