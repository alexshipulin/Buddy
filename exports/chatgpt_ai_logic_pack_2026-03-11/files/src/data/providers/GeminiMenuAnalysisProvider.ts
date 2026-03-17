import { MenuScanResult, UserProfile } from '../../domain/models';
import { analyzeMenuWithGemini, MenuAnalysisInvalidJsonError } from '../../ai/menuAnalysis';
import { prepareImagePayloadForAI } from '../../services/aiService';
import { createId } from '../../utils/id';
import { MenuAnalysisValidationError } from '../../validation/menuAnalysisValidator';
import { MenuAnalysisContext, MenuAnalysisProvider } from './MenuAnalysisProvider';
import { getCached, hashCacheKey, setCache, TTL_24H } from '../../ai/aiCache';
import type { MenuExtractionResponse } from '../../domain/models';
import { rankForLegacyBuckets } from '../../domain/recommendationRanking';

export class MenuAnalysisFailedError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'MenuAnalysisFailedError';
  }
}

export class GeminiMenuAnalysisProvider implements MenuAnalysisProvider {
  async analyzeMenu(
    images: string[],
    user: UserProfile,
    signal?: AbortSignal,
    context?: MenuAnalysisContext
  ): Promise<MenuScanResult> {
    if (images.length === 0) {
      throw new MenuAnalysisFailedError('No images provided');
    }

    const preparedImages = await Promise.all(
      images.map(async (uri) => ({ uri, prepared: await prepareImagePayloadForAI(uri) }))
    );
    const imagePayloads: { base64: string; mimeType: string }[] = preparedImages.map(({ uri, prepared }) => {
      if (!prepared.base64) {
        throw new MenuAnalysisFailedError(`Failed to read image: ${uri.slice(0, 50)}...`);
      }
      return { base64: prepared.base64, mimeType: prepared.mimeType };
    });

    const imageFingerprints = imagePayloads
      .map((payload) =>
        hashCacheKey([
          `mime:${payload.mimeType}`,
          `len:${payload.base64.length}`,
          payload.base64,
        ])
      )
      .sort();

    const cacheKey = hashCacheKey([
      ...imageFingerprints,
      `goal:${user.goal}`,
      `diet:${[...(user.dietaryPreferences ?? [])].sort().join(',')}`,
      `allergies:${[...(user.allergies ?? [])].sort().join(',')}`,
      `dislikes:${(user.dislikes ?? []).map((d) => d.trim().toLowerCase()).filter(Boolean).sort().join(',')}`,
      'menu_v4_extraction',
    ]);

    const buildResult = (analysis: MenuExtractionResponse): MenuScanResult => {
      const legacyBuckets = rankForLegacyBuckets({
        dishes: analysis.dishes,
        goal: user.goal,
        selectedAllergies: user.allergies ?? [],
        selectedDislikes: user.dislikes ?? [],
      });
      return {
        id: createId('scan'),
        analysisId: context?.analysisId,
        recommendationVersion: 2,
        extractedDishes: analysis.dishes,
        createdAt: new Date().toISOString(),
        inputImages: images,
        topPicks: legacyBuckets.topPicks,
        caution: legacyBuckets.caution,
        avoid: legacyBuckets.avoid,
        summaryText: `Buddy extracted dishes and ranked recommendations for ${user.goal.toLowerCase()}.`,
        disclaimerFlag: true,
      };
    };

    const cached = await getCached<MenuExtractionResponse>(cacheKey);
    if (cached) {
      return buildResult(cached);
    }

    try {
      const extraction = await analyzeMenuWithGemini({
        images: imagePayloads,
        analysisId: context?.analysisId,
        userGoal: user.goal,
        dietPrefs: user.dietaryPreferences ?? [],
        allergies: user.allergies ?? [],
        dislikes: user.dislikes,
        signal,
      });

      await setCache(cacheKey, extraction, TTL_24H);
      return buildResult(extraction);
    } catch (err) {
      if (err instanceof MenuAnalysisValidationError) throw err;
      if (err instanceof MenuAnalysisInvalidJsonError) throw err;
      const message = err instanceof Error ? err.message : 'Analysis failed';
      throw new MenuAnalysisFailedError(message, err);
    }
  }
}
