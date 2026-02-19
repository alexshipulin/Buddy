import { MenuScanResult } from '../domain/models';

export const mockTopPicksResult: MenuScanResult = {
  id: 'mock_result_1',
  createdAt: new Date().toISOString(),
  inputImages: [],
  topPicks: [
    { name: 'Grilled Salmon Bowl', reasonShort: 'Perfect for your cutting goal: lean protein and healthy fats.', tags: ['High Protein', 'Low Carb'] },
    { name: 'Roasted Chicken Breast', reasonShort: 'Lean source of protein with lower calories.', tags: ['Lean Protein'] },
    { name: 'Egg White Omelet', reasonShort: 'Great low-calorie option rich in protein.', tags: ['Vegetarian', 'Keto Friendly'] },
  ],
  caution: [
    { name: 'Caesar Salad', reasonShort: 'Good greens, but dressing can increase fats.', tags: ['High Fat'] },
    { name: 'Beef Burger (No Bun)', reasonShort: 'Protein dense, but saturated fat is higher.', tags: ['High Cal'] },
  ],
  avoid: [
    { name: 'Fettuccine Alfredo', reasonShort: 'High calories and refined carbs.', tags: ['High Carb'] },
    { name: 'Deep-fried Combo', reasonShort: 'Energy dense and heavy in trans fats.', tags: ['Deep Fried'] },
  ],
  summaryText: 'Menu analyzed for your goal and dietary profile.',
  disclaimerFlag: true,
};
