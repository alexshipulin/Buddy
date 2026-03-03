import { MenuScanResult } from '../domain/models';

export const mockTopPicksResult: MenuScanResult = {
  id: 'mock_result_1',
  createdAt: new Date().toISOString(),
  inputImages: [],
  topPicks: [
    { name: 'Grilled Salmon Bowl', shortReason: 'Perfect for your goal — high protein and healthy fats.', pins: ['High protein', 'Lean protein', 'Low sodium'], confidencePercent: 98, dietBadges: [], allergenNote: 'Allergen safe', noLine: null },
    { name: 'Roasted Chicken Breast', shortReason: 'Lean protein with minimal added fats.', pins: ['Lean protein', 'High protein', 'Low calorie'], confidencePercent: 95, dietBadges: [], allergenNote: 'Allergen safe', noLine: null },
    { name: 'Egg White Omelet', shortReason: 'Great low-cal option loaded with micronutrients.', pins: ['Low calorie', 'High protein', 'Whole foods'], confidencePercent: 92, dietBadges: [], allergenNote: 'May contain allergens - ask the waiter', noLine: null },
  ],
  caution: [
    { name: 'Caesar Salad', shortReason: 'Ask for dressing on the side to keep calories in check.', pins: [], riskPins: ['High calories', 'High Fat'], quickFix: 'Try: sauce on the side', confidencePercent: 65, dietBadges: [], allergenNote: null, noLine: null },
    { name: 'Beef Burger (No Bun)', shortReason: 'Good protein, but high saturated fat.', pins: [], riskPins: ['High sat fat', 'High Fat'], quickFix: 'Try: half portion', confidencePercent: 60, dietBadges: [], allergenNote: null, noLine: null },
  ],
  avoid: [
    { name: 'Fettuccine Alfredo', shortReason: 'Very high calories and refined carbs.', pins: [], riskPins: ['High calories', 'High carbs'], confidencePercent: 85, dietBadges: [], allergenNote: null, noLine: null },
    { name: 'Deep-fried Combo', shortReason: 'Energy dense and heavy in trans fats.', pins: [], riskPins: ['Deep-fried', 'High calories'], confidencePercent: 90, dietBadges: [], allergenNote: null, noLine: null },
  ],
  summaryText: 'Menu analyzed for your goal and dietary profile.',
  disclaimerFlag: true,
};
