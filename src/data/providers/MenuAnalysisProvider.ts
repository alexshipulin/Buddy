import { HistoryRepo } from '../repos/HistoryRepo';
import { MenuScanResult, UserProfile } from '../../domain/models';

export interface MenuAnalysisProvider {
  analyzeMenu(
    images: string[],
    user: UserProfile,
    deps: { historyRepo: HistoryRepo; analysisId?: number; sessionId?: string }
  ): Promise<MenuScanResult>;
}
