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
    const firstImage = images[0];
    if (!firstImage) {
      throw new MenuAnalysisFailedError('No images provided');
    }

    try {
      // Keep menu text readable while reducing payload size for vision tokens.
      const prepared = await prepareImageForVision(firstImage, {
        maxWidth: 1800,
        minWidth: 1400,
        compress: 0.72,
        targetBase64Len: 1_100_000,
      });
      if (!prepared?.base64) {
        throw new MenuAnalysisFailedError('Failed to prepare image for analysis');
      }

      const base64Image = prepared.base64;
      const mimeType = prepared.mimeType || detectMimeType(firstImage);
      logAIDebug({
        level: 'info',
        task: 'menu_scan',
        stage: 'menu_analysis.request_payload',
        message: 'AI request payload prepared',
        analysisId: deps.analysisId,
        sessionId: deps.sessionId,
        details: {
          imagesCount: 1,
          mimeType,
          base64Len: base64Image.length,
          wasCompressed: prepared.wasCompressed,
          originalWidth: prepared.originalWidth ?? null,
          outputWidth: prepared.outputWidth ?? null,
          compressionQuality: prepared.compressionQuality ?? null,
          goal: user.goal,
          dislikesCount: (user.dislikes ?? []).length,
        },
      });

      const eatenToday = await computeTodayMacrosUseCase(new Date(), { historyRepo: deps.historyRepo });

      const rawAnalysis = await analyzeMenuWithGemini({
        imageBase64: base64Image,
        mimeType,
        userGoal: user.goal,
        userDislikes: user.dislikes ?? [],
        analysisId: deps.analysisId,
        sessionId: deps.sessionId,
      });

      const classified = classifyDishes(rawAnalysis.dishes, user, eatenToday, new Date());

      const summaryText = `Buddy ranked ${rawAnalysis.dishes.length} dishes for ${user.goal.toLowerCase()} and your preferences.`;
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
