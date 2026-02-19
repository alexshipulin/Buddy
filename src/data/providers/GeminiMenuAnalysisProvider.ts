import { MenuScanResult, UserProfile } from '../../domain/models';
import { analyzeMenuWithGemini } from '../../ai/menuAnalysis';
import { uriToBase64 } from '../../services/aiService';
import { createId } from '../../utils/id';
import { MenuAnalysisProvider } from './MenuAnalysisProvider';

export class GeminiMenuAnalysisProvider implements MenuAnalysisProvider {
  async analyzeMenu(images: string[], user: UserProfile): Promise<MenuScanResult> {
    const firstImage = images[0];
    if (!firstImage) {
      throw new Error('No images provided');
    }

    const base64Image = await uriToBase64(firstImage);
    if (!base64Image) {
      throw new Error('Could not convert image to base64');
    }

    const analysis = await analyzeMenuWithGemini({
      imageBase64: base64Image,
      mimeType: 'image/jpeg',
      userGoal: user.goal,
      dietPrefs: user.dietaryPreferences,
      allergies: user.allergies,
    });

    const summaryText = `Buddy ranked dishes for ${user.goal.toLowerCase()} and your preferences.${analysis.warnings.length > 0 ? ` Warnings: ${analysis.warnings.join('; ')}.` : ''}`;

    return {
      id: createId('scan'),
      createdAt: new Date().toISOString(),
      inputImages: images,
      topPicks: analysis.topPicks.map((d) => ({ name: d.name, reasonShort: d.reason, tags: d.tags })),
      caution: analysis.caution.map((d) => ({ name: d.name, reasonShort: d.reason, tags: d.tags })),
      avoid: analysis.avoid.map((d) => ({ name: d.name, reasonShort: d.reason, tags: d.tags })),
      summaryText,
      disclaimerFlag: true,
    };
  }
}
