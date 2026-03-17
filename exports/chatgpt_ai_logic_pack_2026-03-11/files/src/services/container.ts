import { GeminiMenuAnalysisProvider } from '../data/providers/GeminiMenuAnalysisProvider';
import { MenuAnalysisFailedError } from '../data/providers/GeminiMenuAnalysisProvider';
import { MockMenuAnalysisProvider } from '../data/providers/MockMenuAnalysisProvider';
import { MenuAnalysisProvider } from '../data/providers/MenuAnalysisProvider';
import { TEST_MODE } from '../config/flags';
import { AppPrefsRepo } from '../data/repos/AppPrefsRepo';
import { ChatRepo } from '../data/repos/ChatRepo';
import { DailyNutritionRepo } from '../data/repos/DailyNutritionRepo';
import { HistoryRepo } from '../data/repos/HistoryRepo';
import { TrialRepo } from '../data/repos/TrialRepo';
import { UserRepo } from '../data/repos/UserRepo';

export const userRepo = new UserRepo();
export const historyRepo = new HistoryRepo();
export const dailyNutritionRepo = new DailyNutritionRepo();
export const trialRepo = new TrialRepo();
export const appPrefsRepo = new AppPrefsRepo();
export const chatRepo = new ChatRepo();

function createMenuAnalysisProvider(): MenuAnalysisProvider {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  const hasValidApiKey =
    Boolean(apiKey) && apiKey !== 'your_key_here' && apiKey!.trim() !== '';

  if (hasValidApiKey) {
    return new GeminiMenuAnalysisProvider();
  }

  // Keep mock provider available for local dev/test only.
  if (__DEV__ || TEST_MODE) {
    return new MockMenuAnalysisProvider();
  }

  // In production builds, fail explicitly instead of silently using mock data.
  return {
    async analyzeMenu(
      _images: string[],
      _user: import('../domain/models').UserProfile,
      _signal?: AbortSignal,
      _context?: import('../data/providers/MenuAnalysisProvider').MenuAnalysisContext
    ): Promise<never> {
      throw new MenuAnalysisFailedError(
        'Missing EXPO_PUBLIC_GEMINI_API_KEY. Configure it in EAS environment variables and rebuild.'
      );
    },
  };
}

export const menuAnalysisProvider = createMenuAnalysisProvider();
