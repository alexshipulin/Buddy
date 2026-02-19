import { ChatRepo } from '../repos/ChatRepo';
import { HistoryRepo } from '../repos/HistoryRepo';
import { TrialRepo } from '../repos/TrialRepo';
import { UserRepo } from '../repos/UserRepo';
import { getJson, setJson } from '../storage/storage';
import { MealEntry, MenuScanResult } from '../../domain/models';
import { createId } from '../../utils/id';

const SEED_FLAG_KEY = 'buddy_seed_done_v2';

type SeedDeps = {
  userRepo: UserRepo;
  historyRepo: HistoryRepo;
  trialRepo: TrialRepo;
  chatRepo: ChatRepo;
};

export async function seedMockDataIfNeeded(deps: SeedDeps): Promise<void> {
  const alreadySeeded = await getJson<boolean>(SEED_FLAG_KEY, false);
  if (alreadySeeded) return;

  const now = new Date();
  const menuTime = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
  const mealTime = new Date(now.getTime() - 45 * 60 * 1000).toISOString();

  const user = await deps.userRepo.getUser();
  if (!user) {
    await deps.userRepo.saveUser({
      goal: 'Maintain weight',
      dietaryPreferences: ['Gluten-free'],
      allergies: ['Peanuts'],
      baseParams: { heightCm: 172, weightKg: 68, activityLevel: 'Medium', age: 29, sex: 'Prefer not to say' },
    });
  }

  const auth = await deps.userRepo.getAuthState();
  if (!auth.displayName || auth.displayName === 'Guest') {
    await deps.userRepo.saveAuthState({ ...auth, displayName: 'Alex' });
  }

  const trial = await deps.trialRepo.getTrial();
  if (!trial.trialStartsAt || !trial.trialEndsAt) {
    const trialStartsAt = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const trialEndsAt = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString();
    await deps.trialRepo.saveTrial({
      ...trial,
      isPremium: false,
      firstResultAt: trial.firstResultAt ?? menuTime,
      trialStartsAt,
      trialEndsAt,
      scansUsedTodayCount: 0,
    });
  }

  const recent = await deps.historyRepo.listRecent(20);
  const hasMenuScan = recent.some((item) => item.type === 'menu_scan');
  const hasMeal = recent.some((item) => item.type === 'meal');
  if (!hasMenuScan) {
    const menuResultId = createId('scan');
    const menuResult: MenuScanResult = {
      id: menuResultId,
      createdAt: menuTime,
      inputImages: [],
      topPicks: [
        { name: 'Grilled fish with vegetables', reasonShort: 'Balanced macros and high protein.', tags: ['High protein', 'Balanced'] },
      ],
      caution: [{ name: 'Pasta carbonara', reasonShort: 'Energy dense, portion matters.', tags: ['Portion control'] }],
      avoid: [{ name: 'Fried combo set', reasonShort: 'High calories and low satiety.', tags: ['High calories'] }],
      summaryText: 'Sample result for UI preview.',
      disclaimerFlag: true,
    };
    await deps.historyRepo.saveScanResult(menuResult);
    await deps.historyRepo.addItem({
      id: createId('history'),
      type: 'menu_scan',
      title: 'Italian Bistro Lunch',
      createdAt: menuTime,
      payloadRef: menuResultId,
    });
  }

  if (!hasMeal) {
    const mealId = createId('meal');
    const mealEntry: MealEntry = {
      id: mealId,
      createdAt: mealTime,
      title: 'Oatmeal & Berries',
      source: 'text',
      notes: 'Oatmeal with berries and nuts.',
      macros: { caloriesKcal: 620, proteinG: 39, carbsG: 56, fatG: 24 },
    };
    await deps.historyRepo.saveMeal(mealEntry);
    await deps.historyRepo.addItem({
      id: createId('history'),
      type: 'meal',
      title: mealEntry.title,
      createdAt: mealEntry.createdAt,
      payloadRef: mealEntry.id,
    });
  }

  const messages = await deps.chatRepo.listMessages();
  if (messages.length === 0) {
    await deps.chatRepo.addMessage('system', 'Welcome to Buddy. This is sample conversation data.');
    await deps.chatRepo.addMessage('user', 'Can you suggest a lighter dinner option?');
    await deps.chatRepo.addMessage('assistant', 'Try grilled fish or tofu with greens and a side of roasted vegetables.');
    await deps.chatRepo.addMessage('system', 'Logged: Sample lunch bowl. Today updated.');
    await deps.chatRepo.addMessage('assistant', 'Great job logging your meal. Your daily intake is now updated.');
  }

  await setJson(SEED_FLAG_KEY, true);
}
