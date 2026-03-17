import { DishPick, MenuScanResult, UserProfile, DishRecommendation } from '../../domain/models';
import { analyzeMenuWithGemini, MenuAnalysisInvalidJsonError } from '../../ai/menuAnalysis';
import { classifyDishes } from '../../services/classifyDishes';
import { uriToBase64 } from '../../services/aiService';
import { computeTodayMacrosUseCase } from '../../services/computeTodayMacrosUseCase';
import { historyRepo } from '../../services/container';
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

function dishRecToDishPick(dish: DishRecommendation): DishPick {
  return {
    name: dish.name,
    shortReason: dish.reasonShort,
    pins: dish.tags,
    confidencePercent: 80,
    dietBadges: [],
    allergenNote: null,
    noLine: null,
    estimatedCalories: dish.nutrition?.caloriesKcal ?? null,
    estimatedProteinG: dish.nutrition?.proteinG ?? null,
    estimatedCarbsG: dish.nutrition?.carbsG ?? null,
    estimatedFatG: dish.nutrition?.fatG ?? null,
    ...(dish.contextNote ? { contextNote: dish.contextNote } : {}),
  } as DishPick;
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
        });
        await setCache(cacheKey, rawAnalysis, TTL_24H);
      }

      const eatenToday = await computeTodayMacrosUseCase(new Date(), { historyRepo });
      const classified = classifyDishes(rawAnalysis.dishes, user, eatenToday, new Date());
      const topPicks = classified.topPicks.map(dishRecToDishPick);
      const caution = classified.caution.map(dishRecToDishPick);
      const avoid = classified.avoid.map(dishRecToDishPick);
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
