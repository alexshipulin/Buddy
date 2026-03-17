import { MenuScanResult, UserProfile } from '../../domain/models';
import { MenuAnalysisContext, MenuAnalysisProvider } from './MenuAnalysisProvider';

export class RemoteMenuAnalysisProvider implements MenuAnalysisProvider {
  async analyzeMenu(
    _images: string[],
    _user: UserProfile,
    _signal?: AbortSignal,
    _context?: MenuAnalysisContext
  ): Promise<MenuScanResult> {
    throw new Error('Not implemented');
  }
}
