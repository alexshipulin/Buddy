import { MenuScanResult } from '../domain/models';

export const mockTopPicksResult: MenuScanResult = {
  id: 'mock_result_1',
  createdAt: new Date().toISOString(),
  inputImages: [],
  topPicks: [
    { name: 'Grilled Salmon Bowl', shortReason: 'Perfect for your cutting goal. High protein, healthy fats.', pins: ['High protein', 'Lean protein', 'Lower sodium'], confidencePercent: 98, dietBadges: [], allergenNote: 'Allergen safe', noLine: null },
    { name: 'Roasted Chicken Breast', shortReason: 'Lean source of protein, minimal added fats.', pins: ['Lean protein', 'High protein', 'Lower calorie'], confidencePercent: 95, dietBadges: [], allergenNote: 'Allergen safe', noLine: null },
    { name: 'Egg White Omelet', shortReason: 'Great low-cal option loaded with micronutrients.', pins: ['Lower calorie', 'High protein', 'Whole foods'], confidencePercent: 92, dietBadges: [], allergenNote: 'May contain allergens - ask the waiter', noLine: null },
  ],
  caution: [
    { name: 'Caesar Salad', shortReason: 'Ask for dressing on the side.', pins: ['Lower sodium', 'Vegetable-forward', 'Fiber'], confidencePercent: 65, dietBadges: [], allergenNote: null, noLine: null },
    { name: 'Beef Burger (No Bun)', shortReason: 'Good protein, but high saturated fat.', pins: ['High protein', 'Lean protein', 'Portion control'], confidencePercent: 60, dietBadges: [], allergenNote: null, noLine: null },
  ],
  avoid: [
    { name: 'Fettuccine Alfredo', shortReason: 'Very high calories & carbs.', pins: ['Lower calorie', 'Balanced', 'Portion aware'], confidencePercent: 85, dietBadges: [], allergenNote: null, noLine: null },
    { name: 'Deep-fried Combo', shortReason: 'Energy dense and heavy in trans fats.', pins: ['No fried', 'Portion control', 'Whole foods'], confidencePercent: 90, dietBadges: [], allergenNote: null, noLine: null },
  ],
  summaryText: 'Menu analyzed for your goal and dietary profile.',
  disclaimerFlag: true,
};
