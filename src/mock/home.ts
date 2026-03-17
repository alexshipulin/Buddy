import { HistoryItem, MacroTotals } from '../domain/models';

export const mockHomeGreeting = 'Hello, Alex';

export const mockTodayMacros: MacroTotals = {
  caloriesKcal: 1280,
  proteinG: 82,
  carbsG: 118,
  fatG: 46,
};

export const mockRecentItems: HistoryItem[] = [
  {
    id: 'recent_1',
    type: 'menu_scan',
    title: 'Italian Bistro Lunch',
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    payloadRef: 'mock_result_1',
  },
  {
    id: 'recent_2',
    type: 'meal',
    title: 'Oatmeal & Berries',
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    payloadRef: 'mock_meal_1',
  },
  {
    id: 'recent_3',
    type: 'menu_scan',
    title: 'Office Deli Menu',
    createdAt: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
    payloadRef: 'mock_result_2',
  },
  {
    id: 'recent_4',
    type: 'meal',
    title: 'Chicken Bowl',
    createdAt: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString(),
    payloadRef: 'mock_meal_2',
  },
];
