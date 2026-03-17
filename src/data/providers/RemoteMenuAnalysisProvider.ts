import { MenuScanResult, UserProfile } from '../../domain/models';
import { HistoryRepo } from '../repos/HistoryRepo';
import { MenuAnalysisProvider } from './MenuAnalysisProvider';

export class RemoteMenuAnalysisProvider implements MenuAnalysisProvider {
  async analyzeMenu(
    _images: string[],
    _user: UserProfile,
    _deps: { historyRepo: HistoryRepo }
  ): Promise<MenuScanResult> {
    throw new Error('Not implemented');
  }
}
