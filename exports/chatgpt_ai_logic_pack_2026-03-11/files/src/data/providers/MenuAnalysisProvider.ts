import { MenuScanResult, UserProfile } from '../../domain/models';

export type MenuAnalysisContext = {
  analysisId?: number;
};

export interface MenuAnalysisProvider {
  analyzeMenu(
    images: string[],
    user: UserProfile,
    signal?: AbortSignal,
    context?: MenuAnalysisContext
  ): Promise<MenuScanResult>;
}
