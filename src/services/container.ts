import { MockMenuAnalysisProvider } from '../data/providers/MockMenuAnalysisProvider';
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
export const menuAnalysisProvider = new MockMenuAnalysisProvider();
