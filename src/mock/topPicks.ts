import { MenuScanResult } from '../domain/models';

export const mockTopPicksResult: MenuScanResult = {
  id: 'mock_result_1',
  createdAt: new Date().toISOString(),
  inputImages: [],
  topPicks: [
    { name: 'Grilled Salmon Bowl', reasonShort: 'Perfect for your cutting goal. High protein, healthy fats.', tags: ['High Protein', 'Low Carb'], matchPercent: 98, macros: { caloriesKcal: 450, proteinG: 38, carbsG: 12, fatG: 22 } },
    { name: 'Roasted Chicken Breast', reasonShort: 'Lean source of protein, minimal added fats.', tags: ['Lean Protein'], matchPercent: 95, macros: { caloriesKcal: 320, proteinG: 42, carbsG: 4, fatG: 8 } },
    { name: 'Egg White Omelet', reasonShort: 'Great low-cal option loaded with micronutrients.', tags: ['Vegetarian', 'Keto Friendly'], matchPercent: 92, macros: { caloriesKcal: 280, proteinG: 25, carbsG: 8, fatG: 14 }, warningLabel: 'Contains Eggs' },
  ],
  caution: [
    { name: 'Caesar Salad', reasonShort: 'Ask for dressing on the side.', tags: ['High Fat'] },
    { name: 'Beef Burger (No Bun)', reasonShort: 'Good protein, but high saturated fat.', tags: ['High Cal'] },
  ],
  avoid: [
    { name: 'Fettuccine Alfredo', reasonShort: 'Very high calories & carbs.', tags: [] },
    { name: 'Deep-fried Combo', reasonShort: 'Energy dense and heavy in trans fats.', tags: ['Deep Fried'] },
  ],
  summaryText: 'Menu analyzed for your goal and dietary profile.',
  disclaimerFlag: true,
};
