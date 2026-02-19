import { MenuScanResult, UserProfile } from '../../domain/models';
import { analyzeMenuWithGemini } from '../../ai/menuAnalysis';
import { uriToBase64 } from '../../services/aiService';
import { createId } from '../../utils/id';
import { MenuAnalysisProvider } from './MenuAnalysisProvider';
import { MockMenuAnalysisProvider } from './MockMenuAnalysisProvider';

function detectMimeType(uri: string): string {
  const normalizedUri = uri.toLowerCase();
  if (normalizedUri.endsWith('.png')) return 'image/png';
  if (normalizedUri.endsWith('.jpg') || normalizedUri.endsWith('.jpeg')) return 'image/jpeg';
  if (normalizedUri.endsWith('.webp')) return 'image/webp';
  if (normalizedUri.endsWith('.heic') || normalizedUri.endsWith('.heif')) return 'image/heic';
  return 'image/jpeg';
}

export class GeminiMenuAnalysisProvider implements MenuAnalysisProvider {
  private mockProvider = new MockMenuAnalysisProvider();

  async analyzeMenu(images: string[], user: UserProfile): Promise<MenuScanResult> {
    const firstImage = images[0];
    if (!firstImage) {
      return this.mockProvider.analyzeMenu(images, user);
    }

    try {
      const base64Image = await uriToBase64(firstImage);
      if (!base64Image) {
        return this.mockProvider.analyzeMenu(images, user);
      }

      const mimeType = detectMimeType(firstImage);

      const analysis = await analyzeMenuWithGemini({
        imageBase64: base64Image,
        mimeType,
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
    } catch (error) {
      console.warn('Gemini menu analysis failed, using mock fallback.', error instanceof Error ? error.message : String(error));
      return this.mockProvider.analyzeMenu(images, user);
    }
  }
}
