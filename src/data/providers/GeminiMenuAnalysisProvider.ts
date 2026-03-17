import { MenuScanResult, NutritionTargets, UserProfile } from '../../domain/models';
import { DailyNutritionState } from '../../domain/dayBudget';
import { analyzeMenuWithGemini, MenuAnalysisInvalidJsonError } from '../../ai/menuAnalysis';
import { prepareImageForVision } from '../../services/aiService';
import { rawDishToExtracted } from '../../services/rawDishAdapter';
import { createId } from '../../utils/id';
import { HistoryRepo } from '../repos/HistoryRepo';
import { MenuAnalysisProvider } from './MenuAnalysisProvider';
import { logAIDebug } from '../../ai/aiDebugLog';
import { AllModelsRateLimitedError } from '../../ai/geminiClient';
import { getCached, hashCacheKey, setCache, TTL_24H } from '../../ai/aiCache';
import {
  buildFallbackTargets,
  rankExtractedDishes,
  rankedDishToDishPick,
} from '../../domain/recommendationRanking';

function detectMimeType(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.heic') || lower.endsWith('.heif')) return 'image/heic';
  return 'image/jpeg';
}

export class MenuAnalysisFailedError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'MenuAnalysisFailedError';
  }
}

function resolveTargets(goal: UserProfile['goal'], provided?: NutritionTargets): NutritionTargets {
  if (provided) return provided;
  return buildFallbackTargets(goal);
}

function resolveDailyState(provided: DailyNutritionState | undefined, now: Date): DailyNutritionState {
  if (provided) return provided;
  return {
    dateKey: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`,
    consumed: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    mealsLoggedCount: 0,
    firstMealTime: null,
    lastMealTime: null,
    mealsPerDay: undefined,
    wholeFoodsMealsCount: 0,
    processedMealsCount: 0,
  };
}

export class GeminiMenuAnalysisProvider implements MenuAnalysisProvider {
  async analyzeMenu(
    images: string[],
    user: UserProfile,
    deps: {
      historyRepo: HistoryRepo;
      analysisId?: number;
      sessionId?: string;
      targets?: NutritionTargets;
      dailyState?: DailyNutritionState;
    }
  ): Promise<MenuScanResult> {
    if (images.length === 0) {
      throw new MenuAnalysisFailedError('No images provided');
    }

    try {
      const preparedInputs = (
        await Promise.all(
          images.map(async (uri) => {
            const prepared = await prepareImageForVision(uri, {
              maxWidth: 2048,
              minWidth: 1600,
              compress: 0.82,
              targetBase64Len: 1_500_000,
            });
            if (!prepared?.base64) return null;
            return {
              imageUri: uri,
              base64: prepared.base64,
              mimeType: prepared.mimeType || detectMimeType(uri),
              wasCompressed: prepared.wasCompressed,
              originalWidth: prepared.originalWidth ?? null,
              outputWidth: prepared.outputWidth ?? null,
              compressionQuality: prepared.compressionQuality ?? null,
            };
          })
        )
      ).filter((item): item is NonNullable<typeof item> => Boolean(item));

      if (preparedInputs.length === 0) {
        throw new MenuAnalysisFailedError('Failed to prepare images for analysis');
      }

      logAIDebug({
        level: 'info',
        task: 'menu_scan',
        stage: 'menu_analysis.request_payload',
        message: 'AI request payload prepared',
        analysisId: deps.analysisId,
        sessionId: deps.sessionId,
        details: {
          imagesCount: preparedInputs.length,
          imagePayloads: preparedInputs.map((item) => ({
            mimeType: item.mimeType,
            base64Len: item.base64.length,
            wasCompressed: item.wasCompressed,
            originalWidth: item.originalWidth,
            outputWidth: item.outputWidth,
            compressionQuality: item.compressionQuality,
          })),
          goal: user.goal,
          dislikesCount: (user.dislikes ?? []).length,
        },
      });

      const imagePayloads: Array<{ base64: string; mimeType: string }> = [];
      for (const prepared of preparedInputs.slice(0, 3)) {
        if (prepared.base64) {
          imagePayloads.push({
            base64: prepared.base64,
            mimeType: prepared.mimeType || detectMimeType(prepared.imageUri),
          });
        }
      }
      if (imagePayloads.length === 0) {
        throw new MenuAnalysisFailedError('Failed to read any image');
      }

      const cacheKey = hashCacheKey([
        ...imagePayloads.map(
          (p, i) => `img${i}:${p.mimeType}:${p.base64.length}:${p.base64.slice(-32)}`
        ),
        `goal:${user.goal}`,
        `allergies:${(user.allergies ?? [])
          .map((a) => a.trim().toLowerCase())
          .filter(Boolean)
          .sort()
          .join(',')}`,
        `dislikes:${(user.dislikes ?? [])
          .map((d) => d.trim().toLowerCase())
          .filter(Boolean)
          .sort()
          .join(',')}`,
        'menu_v12_multi',
      ]);

      const cachedRawAnalysis = await getCached<Awaited<ReturnType<typeof analyzeMenuWithGemini>>>(cacheKey);
      if (cachedRawAnalysis) {
        logAIDebug({
          level: 'info',
          task: 'menu_scan',
          stage: 'menu_analysis.cache_hit',
          message: 'Using cached AI menu extraction',
          analysisId: deps.analysisId,
          sessionId: deps.sessionId,
          details: {
            cacheKey,
            cachedDishCount: cachedRawAnalysis.dishes.length,
          },
        });
      } else {
        logAIDebug({
          level: 'info',
          task: 'menu_scan',
          stage: 'menu_analysis.cache_miss',
          message: 'No cached AI menu extraction, running model',
          analysisId: deps.analysisId,
          sessionId: deps.sessionId,
          details: { cacheKey },
        });
      }

      const mergedRawAnalysis =
        cachedRawAnalysis ??
        (await analyzeMenuWithGemini({
          images: imagePayloads,
          userGoal: user.goal,
          userDislikes: user.dislikes ?? [],
          selectedAllergies: user.allergies ?? [],
          analysisId: deps.analysisId,
          sessionId: deps.sessionId,
        }));

      if (!cachedRawAnalysis) {
        try {
          await setCache(cacheKey, mergedRawAnalysis, TTL_24H);
          logAIDebug({
            level: 'info',
            task: 'menu_scan',
            stage: 'menu_analysis.cache_store',
            message: 'Stored AI menu extraction in cache',
            analysisId: deps.analysisId,
            sessionId: deps.sessionId,
            details: {
              cacheKey,
              cachedDishCount: mergedRawAnalysis.dishes.length,
              ttlMs: TTL_24H,
            },
          });
        } catch (cacheWriteError) {
          logAIDebug({
            level: 'warn',
            task: 'menu_scan',
            stage: 'menu_analysis.cache_store_failed',
            message: 'Failed to write AI extraction cache; continuing without cache',
            analysisId: deps.analysisId,
            sessionId: deps.sessionId,
            details: {
              cacheKey,
              errName: (cacheWriteError as Error)?.name,
              errMsg: (cacheWriteError as Error)?.message?.slice(0, 240),
            },
          });
        }
      }

      const extractedDishes = mergedRawAnalysis.dishes.map(rawDishToExtracted);
      const now = new Date();
      const targets = resolveTargets(user.goal, deps.targets);
      const dailyState = resolveDailyState(deps.dailyState, now);
      const ranked = rankExtractedDishes({
        dishes: extractedDishes,
        goal: user.goal,
        targets,
        dailyState,
        selectedAllergies: user.allergies ?? [],
        selectedDislikes: user.dislikes ?? [],
        now,
      });

      const summaryText = `Buddy ranked ${extractedDishes.length} dishes for ${user.goal.toLowerCase()} and your preferences.`;
      const topPicks = ranked.top.map((item) => rankedDishToDishPick(item, user.allergies ?? []));
      const caution = ranked.caution.map((item) =>
        rankedDishToDishPick(item, user.allergies ?? [])
      );
      const avoid = ranked.avoid.map((item) => rankedDishToDishPick(item, user.allergies ?? []));

      return {
        id: createId('scan'),
        createdAt: new Date().toISOString(),
        inputImages: images,
        extractedDishes,
        recommendationVersion: 2,
        topPicks,
        caution,
        avoid,
        summaryText,
        disclaimerFlag: true,
      };
    } catch (error) {
      if (error instanceof MenuAnalysisInvalidJsonError) throw error;
      if (error instanceof AllModelsRateLimitedError) throw error;
      if (error instanceof Error && error.name === 'AbortError') throw error;
      const message =
        error instanceof MenuAnalysisFailedError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Gemini menu analysis failed';
      throw new MenuAnalysisFailedError(message, error);
    }
  }
}
