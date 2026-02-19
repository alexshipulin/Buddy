import { MenuScanResult, UserProfile } from '../../domain/models';

export interface MenuAnalysisProvider {
  analyzeMenu(images: string[], user: UserProfile): Promise<MenuScanResult>;
}
