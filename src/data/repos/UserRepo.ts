import { UserProfile } from '../../domain/models';
import { getJson, setJson } from '../storage/storage';

const USER_KEY = 'buddy_user_profile';
const USER_AUTH_KEY = 'buddy_user_auth_state';

export type UserAuthState = { signedIn: boolean; displayName?: string; identifier?: string };
const defaultAuthState: UserAuthState = { signedIn: false };

export class UserRepo {
  async getUser(): Promise<UserProfile | null> {
    return getJson<UserProfile | null>(USER_KEY, null);
  }
  async saveUser(user: UserProfile): Promise<void> {
    await setJson(USER_KEY, user);
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
}
