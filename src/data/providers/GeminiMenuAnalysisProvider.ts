import { DishPick, MenuScanResult, UserProfile } from '../../domain/models';
import { analyzeMenuWithGemini, MenuAnalysisInvalidJsonError } from '../../ai/menuAnalysis';
import { getAvoidPinWhitelist, getCautionPinWhitelist, getDietMismatchPin, getPinWhitelist } from '../../domain/menuPins';
import { uriToBase64 } from '../../services/aiService';
import { createId } from '../../utils/id';
import { MenuAnalysisValidationError } from '../../validation/menuAnalysisValidator';
import { MenuAnalysisProvider } from './MenuAnalysisProvider';

export class MenuAnalysisFailedError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'MenuAnalysisFailedError';
  }
}

function detectMimeType(uri: string): string {
  const normalizedUri = uri.toLowerCase();
  if (normalizedUri.endsWith('.png')) return 'image/png';
  if (normalizedUri.endsWith('.jpg') || normalizedUri.endsWith('.jpeg')) return 'image/jpeg';
  if (normalizedUri.endsWith('.webp')) return 'image/webp';
  if (normalizedUri.endsWith('.heic') || normalizedUri.endsWith('.heif')) return 'image/heic';
  return 'image/jpeg';
}

export class GeminiMenuAnalysisProvider implements MenuAnalysisProvider {
  async analyzeMenu(images: string[], user: UserProfile): Promise<MenuScanResult> {
    if (images.length === 0) {
      throw new MenuAnalysisFailedError('No images provided');
    }

    const imagePayloads: { base64: string; mimeType: string }[] = [];
    for (const uri of images) {
      const base64 = await uriToBase64(uri);
      if (!base64) throw new MenuAnalysisFailedError(`Failed to read image: ${uri.slice(0, 50)}...`);
      imagePayloads.push({ base64, mimeType: detectMimeType(uri) });
    }

    const pinWhitelistTop = getPinWhitelist(user.goal);
    const pinWhitelistCaution = getCautionPinWhitelist(user.goal);
    const pinWhitelistAvoid = getAvoidPinWhitelist(user.goal);

    // Inject a specific diet-mismatch pin (e.g. "Not Keto") into risk whitelists
    // when the user has at least one dietary preference selected.
    const dietMismatchPin = getDietMismatchPin(user.dietaryPreferences ?? []);
    const effectiveCautionWhitelist = dietMismatchPin
      ? [...pinWhitelistCaution, dietMismatchPin]
      : pinWhitelistCaution;
    const effectiveAvoidWhitelist = dietMismatchPin
      ? [...pinWhitelistAvoid, dietMismatchPin]
      : pinWhitelistAvoid;

    try {
      const analysis = await analyzeMenuWithGemini({
        images: imagePayloads,
        userGoal: user.goal,
        dietPrefs: user.dietaryPreferences ?? [],
        allergies: user.allergies ?? [],
        dislikes: user.dislikes,
        pinWhitelistTop,
        pinWhitelistCaution: effectiveCautionWhitelist,
        pinWhitelistAvoid: effectiveAvoidWhitelist,
        dietMismatchPin,
      });

      const topPicks: DishPick[] = analysis.topPicks.slice(0, 3);
      const summaryText = `Buddy ranked dishes for ${user.goal.toLowerCase()} and your preferences.`;

      return {
        id: createId('scan'),
        createdAt: new Date().toISOString(),
        inputImages: images,
        topPicks,
        caution: analysis.caution,
        avoid: analysis.avoid,
        summaryText,
        disclaimerFlag: true,
      };
    } catch (err) {
      if (err instanceof MenuAnalysisValidationError) throw err;
      if (err instanceof MenuAnalysisInvalidJsonError) throw err;
      const message = err instanceof Error ? err.message : 'Analysis failed';
      throw new MenuAnalysisFailedError(message, err);
    }
  }
}
