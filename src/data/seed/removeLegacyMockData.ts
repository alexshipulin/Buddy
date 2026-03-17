import { HistoryItem, MealEntry, MenuScanResult, TrialState } from '../../domain/models';
import { getJson, setJson } from '../storage/storage';
import { UserAuthState } from '../repos/UserRepo';

const CLEANUP_DONE_KEY = 'buddy_mock_cleanup_done_v2';
const SEED_FLAG_KEY = 'buddy_seed_done_v2';
const USER_KEY = 'buddy_user_profile';
const USER_AUTH_KEY = 'buddy_user_auth_state';
const NUTRITION_TARGETS_KEY = 'buddy_nutrition_targets';
const HISTORY_KEY = 'buddy_history_store';
const CHAT_KEY = 'buddy_chat_messages';
const TRIAL_KEY = 'buddy_trial_state';

const EMPTY_HISTORY = {
  items: [] as HistoryItem[],
  scanResultsById: {} as Record<string, MenuScanResult>,
  mealsById: {} as Record<string, MealEntry>,
};
const INITIAL_TRIAL: TrialState = { isPremium: false, scansUsedTodayCount: 0 };
const INITIAL_AUTH: UserAuthState = { signedIn: false };

export async function removeLegacyMockDataIfNeeded(): Promise<void> {
  const cleanupDone = await getJson<boolean>(CLEANUP_DONE_KEY, false);
  if (cleanupDone) return;

  // Safety rule: cleanup only when app data was explicitly marked as seeded.
  // This avoids accidental deletion of real user profiles that may match legacy heuristics.
  const seedFlag = await getJson<boolean>(SEED_FLAG_KEY, false);
  if (seedFlag) {
    await setJson(USER_KEY, null);
    await setJson(USER_AUTH_KEY, INITIAL_AUTH);
    await setJson(NUTRITION_TARGETS_KEY, null);
    await setJson(HISTORY_KEY, EMPTY_HISTORY);
    await setJson(CHAT_KEY, []);
    await setJson(TRIAL_KEY, INITIAL_TRIAL);
    await setJson(SEED_FLAG_KEY, false);
  }

  await setJson(CLEANUP_DONE_KEY, true);
}
