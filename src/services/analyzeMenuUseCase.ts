import { MenuAnalysisProvider } from '../data/providers/MenuAnalysisProvider';
import { HistoryRepo } from '../data/repos/HistoryRepo';
import { TrialRepo } from '../data/repos/TrialRepo';
import { UserRepo } from '../data/repos/UserRepo';
import { TEST_MODE } from '../config/flags';
import { createId } from '../utils/id';

type Deps = { historyRepo: HistoryRepo; userRepo: UserRepo; trialRepo: TrialRepo; menuProvider: MenuAnalysisProvider };

export class DailyScanLimitReachedError extends Error {
  constructor() {
    super('Daily menu scan limit reached');
    this.name = 'DailyScanLimitReachedError';
  }
}

export type AnalyzeMenuOutput = { resultId: string; shouldShowPaywallAfterResults: boolean; trialDaysLeft: number };

export async function analyzeMenuUseCase(images: string[], deps: Deps): Promise<AnalyzeMenuOutput> {
  const user = await deps.userRepo.getUser();
  if (!user) throw new Error('User profile is not set');
  // Post-trial free users are limited to one scan per day.
  if (!TEST_MODE) {
    const allowed = await deps.trialRepo.incrementDailyScanIfAllowed();
    if (!allowed) throw new DailyScanLimitReachedError();
  }
  const result = await deps.menuProvider.analyzeMenu(images, user);
  await deps.historyRepo.saveScanResult(result);
  await deps.historyRepo.addItem({
    id: createId('history'),
    type: 'menu_scan',
    title: 'Menu scan',
    createdAt: result.createdAt,
    payloadRef: result.id,
    imageUris: images,
  });
  const first = await deps.trialRepo.registerFirstResultIfNeeded(new Date());
  // Product rule: show paywall immediately after the first complete result.
  return { resultId: result.id, shouldShowPaywallAfterResults: first.isFirstResult, trialDaysLeft: deps.trialRepo.getTrialDaysLeft(first.state, new Date()) };
}
