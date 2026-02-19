import { TrialState } from '../../domain/models';
import { toIsoDateOnly } from '../../utils/date';
import { getJson, setJson } from '../storage/storage';

const TRIAL_KEY = 'buddy_trial_state';
const TRIAL_DAYS = 7;
const initialTrial: TrialState = { isPremium: false, scansUsedTodayCount: 0 };

export class TrialRepo {
  async getTrial(): Promise<TrialState> {
    return getJson<TrialState>(TRIAL_KEY, initialTrial);
  }
  async saveTrial(state: TrialState): Promise<void> {
    await setJson(TRIAL_KEY, state);
  }
  async incrementDailyScanIfAllowed(nowDate = new Date()): Promise<boolean> {
    const trial = await this.getTrial();
    // Premium or active trial period bypasses the post-trial daily cap.
    if (trial.isPremium) return true;
    if (trial.trialEndsAt && nowDate.getTime() <= new Date(trial.trialEndsAt).getTime()) return true;
    if (!trial.trialStartsAt) return true;
    const today = toIsoDateOnly(nowDate);
    if (trial.scansUsedTodayDate !== today) {
      // First scan of a new day resets the counter.
      await this.saveTrial({ ...trial, scansUsedTodayDate: today, scansUsedTodayCount: 1 });
      return true;
    }
    if (trial.scansUsedTodayCount >= 1) return false;
    await this.saveTrial({ ...trial, scansUsedTodayCount: trial.scansUsedTodayCount + 1 });
    return true;
  }
  async registerFirstResultIfNeeded(nowDate = new Date()): Promise<{ state: TrialState; isFirstResult: boolean }> {
    const trial = await this.getTrial();
    if (trial.firstResultAt) return { state: trial, isFirstResult: false };
    const startsAt = nowDate.toISOString();
    const endsAt = new Date(nowDate.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
    // Trial starts after the first successful full result.
    const updated: TrialState = { ...trial, firstResultAt: startsAt, trialStartsAt: trial.trialStartsAt ?? startsAt, trialEndsAt: trial.trialEndsAt ?? endsAt };
    await this.saveTrial(updated);
    return { state: updated, isFirstResult: true };
  }
  getTrialDaysLeft(state: TrialState, nowDate = new Date()): number {
    if (!state.trialEndsAt || state.isPremium) return 0;
    const remainingMs = new Date(state.trialEndsAt).getTime() - nowDate.getTime();
    if (remainingMs <= 0) return 0;
    return Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
  }
}
