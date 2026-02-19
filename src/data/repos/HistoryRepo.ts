import { HistoryItem, MealEntry, MenuScanResult } from '../../domain/models';
import { getJson, setJson } from '../storage/storage';

type HistoryStore = { items: HistoryItem[]; scanResultsById: Record<string, MenuScanResult>; mealsById: Record<string, MealEntry> };
const HISTORY_KEY = 'buddy_history_store';
const initialStore: HistoryStore = { items: [], scanResultsById: {}, mealsById: {} };

export class HistoryRepo {
  private async getStore(): Promise<HistoryStore> {
    return getJson<HistoryStore>(HISTORY_KEY, initialStore);
  }
  private async saveStore(store: HistoryStore): Promise<void> {
    await setJson(HISTORY_KEY, store);
  }
  async listRecent(limit = 30): Promise<HistoryItem[]> {
    const store = await this.getStore();
    return [...store.items].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, limit);
  }
  async addItem(item: HistoryItem): Promise<void> {
    const store = await this.getStore();
    store.items = [item, ...store.items];
    await this.saveStore(store);
  }
  async getScanResultById(id: string): Promise<MenuScanResult | null> {
    const store = await this.getStore();
    return store.scanResultsById[id] ?? null;
  }
  async saveScanResult(result: MenuScanResult): Promise<void> {
    const store = await this.getStore();
    store.scanResultsById[result.id] = result;
    await this.saveStore(store);
  }
  async getMealById(id: string): Promise<MealEntry | null> {
    const store = await this.getStore();
    return store.mealsById[id] ?? null;
  }
  async saveMeal(meal: MealEntry): Promise<void> {
    const store = await this.getStore();
    store.mealsById[meal.id] = meal;
    await this.saveStore(store);
  }
}
