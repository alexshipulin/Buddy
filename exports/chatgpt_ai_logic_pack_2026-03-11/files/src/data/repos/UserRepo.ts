import { NutritionTargets, UserProfile } from '../../domain/models';
import { getJson, setJson } from '../storage/storage';

const USER_KEY = 'buddy_user_profile';
const USER_AUTH_KEY = 'buddy_user_auth_state';
const NUTRITION_TARGETS_KEY = 'buddy_nutrition_targets';
const DEFAULT_USER_PROFILE: UserProfile = {
  goal: 'Maintain weight',
  dietaryPreferences: [],
  allergies: [],
  dislikes: [],
};

export type UserAuthState = { signedIn: boolean; displayName?: string; identifier?: string };
const defaultAuthState: UserAuthState = { signedIn: false };

function normalizeUserProfile(raw: Partial<UserProfile>): UserProfile {
  return {
    goal: raw.goal ?? DEFAULT_USER_PROFILE.goal,
    dietaryPreferences: raw.dietaryPreferences ?? [],
    allergies: raw.allergies ?? [],
    dislikes: raw.dislikes ?? [],
    baseParams: raw.baseParams,
  };
}

function needsNormalization(raw: Partial<UserProfile>): boolean {
  return (
    raw.goal == null ||
    !Array.isArray(raw.dietaryPreferences) ||
    !Array.isArray(raw.allergies) ||
    !Array.isArray(raw.dislikes)
  );
}

export class UserRepo {
  async getUser(): Promise<UserProfile | null> {
    const raw = await getJson<Partial<UserProfile> | null>(USER_KEY, null);
    if (!raw) return null;
    const normalized = normalizeUserProfile(raw);
    if (needsNormalization(raw)) {
      await setJson(USER_KEY, normalized);
    }
    return normalized;
  }
  async saveUser(user: UserProfile): Promise<void> {
    await setJson(USER_KEY, normalizeUserProfile(user));
  }
  async ensureUser(): Promise<UserProfile> {
    const current = await this.getUser();
    if (current) return current;
    await this.saveUser(DEFAULT_USER_PROFILE);
    return { ...DEFAULT_USER_PROFILE, dietaryPreferences: [], allergies: [], dislikes: [] };
  }
  async patchUser(patch: Partial<UserProfile>): Promise<UserProfile> {
    const current = await this.ensureUser();
    const next: UserProfile = normalizeUserProfile({
      ...current,
      ...patch,
      dietaryPreferences: patch.dietaryPreferences ?? current.dietaryPreferences,
      allergies: patch.allergies ?? current.allergies,
      dislikes: patch.dislikes ?? current.dislikes,
      baseParams: patch.baseParams ?? current.baseParams,
    });
    await this.saveUser(next);
    return next;
  }
  async getAuthState(): Promise<UserAuthState> {
    return getJson<UserAuthState>(USER_AUTH_KEY, defaultAuthState);
  }
  async saveAuthState(state: UserAuthState): Promise<void> {
    await setJson(USER_AUTH_KEY, state);
  }
  async markSignedIn(displayName?: string, identifier?: string): Promise<void> {
    const current = await this.getAuthState();
    await this.saveAuthState({ ...current, signedIn: true, displayName: displayName ?? current.displayName, identifier: identifier ?? current.identifier });
  }

  async getNutritionTargets(): Promise<NutritionTargets | null> {
    return getJson<NutritionTargets | null>(NUTRITION_TARGETS_KEY, null);
  }

  async saveNutritionTargets(targets: NutritionTargets): Promise<void> {
    await setJson(NUTRITION_TARGETS_KEY, targets);
  }

  async clearNutritionTargets(): Promise<void> {
    await setJson(NUTRITION_TARGETS_KEY, null);
  }
}
