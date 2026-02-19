import { MenuScanResult, UserProfile } from '../../domain/models';
import { analyzeMenu } from '../../services/aiService';
import { MenuAnalysisProvider } from './MenuAnalysisProvider';

export class GeminiMenuAnalysisProvider implements MenuAnalysisProvider {
  async analyzeMenu(images: string[], user: UserProfile): Promise<MenuScanResult> {
    const result = await analyzeMenu(images);
    return {
      ...result,
      summaryText: result.summaryText.replace(
        'Buddy analyzed your menu',
        `Buddy ranked dishes for ${user.goal.toLowerCase()} and your preferences`,
      ),
    };
  }
}
