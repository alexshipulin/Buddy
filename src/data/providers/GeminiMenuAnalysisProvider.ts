import { DishPick, MenuScanResult, UserProfile } from '../../domain/models';
import { analyzeMenuWithGemini, MenuAnalysisInvalidJsonError } from '../../ai/menuAnalysis';
import { prepareImageForVision } from '../../services/aiService';
import { classifyDishes } from '../../services/classifyDishes';
import { computeTodayMacrosUseCase } from '../../services/computeTodayMacrosUseCase';
import { createId } from '../../utils/id';
import { HistoryRepo } from '../repos/HistoryRepo';
import { MenuAnalysisProvider } from './MenuAnalysisProvider';
import { logAIDebug } from '../../ai/aiDebugLog';
import { AllModelsRateLimitedError } from '../../ai/geminiClient';
import { getCached, hashCacheKey, setCache, TTL_24H } from '../../ai/aiCache';

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

function toDishPick(
  section: 'top' | 'caution' | 'avoid',
  item: { name: string; reasonShort: string; pins: Array<{ label: string }>; contextNote?: string; nutrition?: { caloriesKcal: number; proteinG: number; carbsG: number; fatG: number } }
): DishPick {
  const pinLabels = item.pins
    .map((pin) => (typeof pin.label === 'string' ? pin.label.trim() : ''))
    .filter(Boolean);
  const shortReason = item.reasonShort?.trim() || 'No description available.';
  const nutrition = item.nutrition ?? {
    caloriesKcal: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
  };

  const dish: DishPick & { contextNote?: string } = {
    name: item.name,
    shortReason,
    pins: section === 'top' ? pinLabels.slice(0, 4) : [],
    riskPins: section === 'top' ? undefined : pinLabels.slice(0, 3),
    quickFix: null,
    confidencePercent: 80,
    dietBadges: [],
    allergenNote: null,
    noLine: null,
    estimatedCalories: nutrition.caloriesKcal,
    estimatedProteinG: nutrition.proteinG,
    estimatedCarbsG: nutrition.carbsG,
    estimatedFatG: nutrition.fatG,
  };
  if (item.contextNote?.trim()) dish.contextNote = item.contextNote.trim();
  return dish;
}

export class GeminiMenuAnalysisProvider implements MenuAnalysisProvider {
  async analyzeMenu(
    images: string[],
    user: UserProfile,
    deps: { historyRepo: HistoryRepo; analysisId?: number; sessionId?: string }
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

      const eatenToday = await computeTodayMacrosUseCase(new Date(), { historyRepo: deps.historyRepo });

      const imageParts = preparedInputs.map((prepared) => ({
        inlineData: {
          mimeType: prepared.mimeType,
          data: prepared.base64,
        },
      }));
      const normalizedDislikes = (user.dislikes ?? [])
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
        .sort();
      const normalizedAllergies = (user.allergies ?? [])
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
        .sort();
      const normalizedDietaryPrefs = (user.dietaryPreferences ?? [])
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
        .sort();
      const imageFingerprints = imageParts.map((part, index) => {
        const data = part.inlineData.data;
        const imageHash = hashCacheKey([
          part.inlineData.mimeType,
          String(data.length),
          data,
        ]);
        return `img${index}:${part.inlineData.mimeType}:${data.length}:${imageHash}`;
      });
      const cacheKey = hashCacheKey([
        ...imageFingerprints,
        `goal:${user.goal}`,
        `dislikes:${normalizedDislikes.join(',')}`,
        `allergies:${normalizedAllergies.join(',')}`,
        `dietary:${normalizedDietaryPrefs.join(',')}`,
        'menu_v11_all_sections',
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
          imageParts,
          userGoal: user.goal,
          userDislikes: user.dislikes ?? [],
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

      const classified = classifyDishes(mergedRawAnalysis.dishes, user, eatenToday, new Date());

      const summaryText = `Buddy ranked ${mergedRawAnalysis.dishes.length} dishes for ${user.goal.toLowerCase()} and your preferences.`;
      const topPicks = classified.topPicks.map((item) => toDishPick('top', item));
      const caution = classified.caution.map((item) => toDishPick('caution', item));
      const avoid = classified.avoid.map((item) => toDishPick('avoid', item));

      return {
        id: createId('scan'),
        createdAt: new Date().toISOString(),
        inputImages: images,
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
