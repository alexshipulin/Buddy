import { MenuScanResult, UserProfile } from '../../domain/models';
import { analyzeMenuWithGemini, MenuAnalysisInvalidJsonError, type RawDish } from '../../ai/menuAnalysis';
import { uriToBase64 } from '../../services/aiService';
import {
  buildFallbackTargets,
  rankExtractedDishes,
  rankedDishToDishPick,
} from '../../domain/recommendationRanking';
import { rawDishToExtracted } from '../../services/rawDishAdapter';
import { createId } from '../../utils/id';
import { MenuAnalysisContext, MenuAnalysisProvider } from './MenuAnalysisProvider';
import { getCached, hashCacheKey, setCache, TTL_24H } from '../../ai/aiCache';

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
  async analyzeMenu(
    images: string[],
    user: UserProfile,
    _signal?: AbortSignal,
    context?: MenuAnalysisContext
  ): Promise<MenuScanResult> {
    if (images.length === 0) {
      throw new MenuAnalysisFailedError('No images provided');
    }

    const firstUri = images[0];
    const base64Image = await uriToBase64(firstUri);
    if (!base64Image) {
      throw new MenuAnalysisFailedError(`Failed to read image: ${firstUri.slice(0, 50)}...`);
    }
    const mimeType = detectMimeType(firstUri);

    const cacheKey = hashCacheKey([
      `mime:${mimeType}`,
      `len:${base64Image.length}`,
      base64Image,
      `goal:${user.goal}`,
      `dislikes:${(user.dislikes ?? []).map((d) => d.trim().toLowerCase()).filter(Boolean).sort().join(',')}`,
      'menu_v9_raw',
    ]);

    try {
      let rawAnalysis = await getCached<Awaited<ReturnType<typeof analyzeMenuWithGemini>>>(cacheKey);
      if (!rawAnalysis) {
        rawAnalysis = await analyzeMenuWithGemini({
          imageBase64: base64Image,
          mimeType,
          userGoal: user.goal,
          userDislikes: user.dislikes ?? [],
          selectedAllergies: user.allergies ?? [],
        });
        await setCache(cacheKey, rawAnalysis, TTL_24H);
      }

      // Используем targets и dailyState из context (уже вычислены в analyzeMenuUseCase)
      const targets = context?.targets ?? buildFallbackTargets(user.goal);
      const dailyState = context?.dailyState ?? {
        dateKey: new Date().toISOString().slice(0, 10),
        consumed: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        mealsLoggedCount: 0,
        firstMealTime: null,
        lastMealTime: null,
      };

      const extractedDishes = rawAnalysis.dishes.map((dish) =>
        'nutrition' in dish ? rawDishToExtracted(dish as unknown as RawDish) : dish
      );
      const ranked = rankExtractedDishes({
        dishes: extractedDishes,
        goal: user.goal,
        targets,
        dailyState,
        selectedAllergies: user.allergies ?? [],
        selectedDislikes: user.dislikes ?? [],
        now: new Date(),
      });

      const topPicks = ranked.top.map((r) => rankedDishToDishPick(r, user.allergies ?? []));
      const caution = ranked.caution.map((r) => rankedDishToDishPick(r, user.allergies ?? []));
      const avoid = ranked.avoid.map((r) => rankedDishToDishPick(r, user.allergies ?? []));
      const summaryText = `Buddy ranked ${rawAnalysis.dishes.length} dishes for ${user.goal.toLowerCase()} and your preferences.`;

      return {
        id: createId('scan'),
        analysisId: context?.analysisId,
        createdAt: new Date().toISOString(),
        inputImages: images,
        topPicks,
        caution,
        avoid,
        summaryText,
        disclaimerFlag: true,
      };
    } catch (err) {
      if (err instanceof MenuAnalysisInvalidJsonError) throw err;
      const message = err instanceof Error ? err.message : 'Analysis failed';
      throw new MenuAnalysisFailedError(message, err);
    }
  }
}
