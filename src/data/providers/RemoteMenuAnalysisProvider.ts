import { MenuScanResult, UserProfile } from '../../domain/models';
import { MenuAnalysisProvider } from './MenuAnalysisProvider';

export class RemoteMenuAnalysisProvider implements MenuAnalysisProvider {
  async analyzeMenu(_images: string[], _user: UserProfile): Promise<MenuScanResult> {
    throw new Error('Not implemented');
  }
}
