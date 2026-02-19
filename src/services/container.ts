import { GeminiMenuAnalysisProvider } from '../data/providers/GeminiMenuAnalysisProvider';
import { MockMenuAnalysisProvider } from '../data/providers/MockMenuAnalysisProvider';
import { MenuAnalysisProvider } from '../data/providers/MenuAnalysisProvider';
import { AppPrefsRepo } from '../data/repos/AppPrefsRepo';
import { ChatRepo } from '../data/repos/ChatRepo';
import { HistoryRepo } from '../data/repos/HistoryRepo';
import { TrialRepo } from '../data/repos/TrialRepo';
import { UserRepo } from '../data/repos/UserRepo';

export const userRepo = new UserRepo();
export const historyRepo = new HistoryRepo();
export const trialRepo = new TrialRepo();
export const appPrefsRepo = new AppPrefsRepo();
export const chatRepo = new ChatRepo();

function createMenuAnalysisProvider(): MenuAnalysisProvider {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (apiKey && apiKey !== 'your_key_here' && apiKey.trim() !== '') {
    return new GeminiMenuAnalysisProvider();
  }
  return new MockMenuAnalysisProvider();
}

export const menuAnalysisProvider = createMenuAnalysisProvider();
