import { getJson, setJson } from '../storage/storage';

const APP_PREFS_KEY = 'buddy_app_prefs';
type AppPrefs = { launchCount: number; signInNudgeDismissed: boolean; saveScansToPhotos: boolean; saveScansPromptHandled: boolean };
const defaultPrefs: AppPrefs = { launchCount: 0, signInNudgeDismissed: false, saveScansToPhotos: false, saveScansPromptHandled: false };

export class AppPrefsRepo {
  async getPrefs(): Promise<AppPrefs> {
    return getJson<AppPrefs>(APP_PREFS_KEY, defaultPrefs);
  }
  async incrementLaunchCount(): Promise<number> {
    const current = await this.getPrefs();
    const next = { ...current, launchCount: current.launchCount + 1 };
    await setJson(APP_PREFS_KEY, next);
    return next.launchCount;
  }
  async markSignInNudgeDismissed(): Promise<void> {
    const current = await this.getPrefs();
    await setJson(APP_PREFS_KEY, { ...current, signInNudgeDismissed: true });
  }
  async setSaveScansPreference(saveScansToPhotos: boolean): Promise<void> {
    const current = await this.getPrefs();
    await setJson(APP_PREFS_KEY, { ...current, saveScansToPhotos, saveScansPromptHandled: true });
  }
}
