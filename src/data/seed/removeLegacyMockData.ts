import { ChatMessage, HistoryItem, MealEntry, MenuScanResult, TrialState, UserProfile } from '../../domain/models';
import { getJson, setJson } from '../storage/storage';
import { UserAuthState } from '../repos/UserRepo';

const CLEANUP_DONE_KEY = 'buddy_mock_cleanup_done_v1';
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

function looksLikeSeededUser(user: Partial<UserProfile> | null): boolean {
  return (
    user?.goal === 'Maintain weight' &&
    user.baseParams?.heightCm === 172 &&
    user.baseParams?.weightKg === 68 &&
    user.baseParams?.age === 29
  );
}

function hasSeededHistoryTitles(items: HistoryItem[]): boolean {
  return items.some((item) => item.title === 'Italian Bistro Lunch' || item.title === 'Oatmeal & Berries');
}

function hasSeededChatMessages(messages: ChatMessage[]): boolean {
  return messages.some((message) => message.text.includes('sample conversation data'));
}

export async function removeLegacyMockDataIfNeeded(): Promise<void> {
  const cleanupDone = await getJson<boolean>(CLEANUP_DONE_KEY, false);
  if (cleanupDone) return;

  const user = await getJson<Partial<UserProfile> | null>(USER_KEY, null);
  const history = await getJson<typeof EMPTY_HISTORY>(HISTORY_KEY, EMPTY_HISTORY);
  const chat = await getJson<ChatMessage[]>(CHAT_KEY, []);
  const shouldCleanup =
    looksLikeSeededUser(user) ||
    hasSeededHistoryTitles(history.items) ||
    hasSeededChatMessages(chat);

  if (shouldCleanup) {
    await setJson(USER_KEY, null);
    await setJson(USER_AUTH_KEY, INITIAL_AUTH);
    await setJson(NUTRITION_TARGETS_KEY, null);
    await setJson(HISTORY_KEY, EMPTY_HISTORY);
    await setJson(CHAT_KEY, []);
    await setJson(TRIAL_KEY, INITIAL_TRIAL);
  }

  await setJson(CLEANUP_DONE_KEY, true);
}
