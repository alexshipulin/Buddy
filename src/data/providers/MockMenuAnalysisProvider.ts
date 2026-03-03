import { DishPick, MenuScanResult, UserProfile } from '../../domain/models';
import { createId } from '../../utils/id';
import { MenuAnalysisProvider } from './MenuAnalysisProvider';

function pickPreset(_user: UserProfile): { topPicks: DishPick[]; caution: DishPick[]; avoid: DishPick[]; summaryText: string } {
  const topPicks: DishPick[] = [
    { name: 'Grilled salmon with greens', shortReason: 'High protein and healthy fats.', pins: ['High protein', 'Lean protein', 'Low sodium'], confidencePercent: 88, dietBadges: [], allergenNote: 'Allergen safe', noLine: null },
    { name: 'Chicken salad', shortReason: 'Lean protein with fiber-rich vegetables.', pins: ['High protein', 'Low calorie', 'High fiber'], confidencePercent: 85, dietBadges: [], allergenNote: 'Allergen safe', noLine: null },
    { name: 'Rice bowl with tofu', shortReason: 'Plant protein and controlled energy density.', pins: ['Whole foods', 'High fiber', 'Veggie-rich'], confidencePercent: 82, dietBadges: [], allergenNote: 'Allergen safe', noLine: null },
  ];
  const caution: DishPick[] = [
    { name: 'Teriyaki chicken', shortReason: 'Protein is good, but sauce can add sugar and sodium.', pins: [], riskPins: ['High Sugar', 'High Sodium'], quickFix: 'Try: sauce on the side', confidencePercent: 65, dietBadges: [], allergenNote: null, noLine: null },
    { name: 'Veggie wrap', shortReason: 'Mostly fine, though tortillas and sauces can shift macros.', pins: [], riskPins: ['Refined Carbs'], quickFix: 'Try: extra veggies', confidencePercent: 60, dietBadges: [], allergenNote: null, noLine: null },
    { name: 'Granola bowl', shortReason: 'Looks healthy but can be calorie dense with sweeteners.', pins: [], riskPins: ['Added Sugar', 'High calories'], quickFix: 'Try: no sauce', confidencePercent: 55, dietBadges: [], allergenNote: null, noLine: null },
  ];
  const avoid: DishPick[] = [
    { name: 'Deep-fried combo platter', shortReason: 'Very high energy density and low satiety quality.', pins: [], riskPins: ['Deep-fried', 'High calories'], confidencePercent: 90, dietBadges: [], allergenNote: null, noLine: null },
    { name: 'Loaded nachos', shortReason: 'Portion size and toppings make goals harder to hit.', pins: [], riskPins: ['High calories', 'High sat fat'], confidencePercent: 85, dietBadges: [], allergenNote: null, noLine: null },
    { name: 'Creamy pasta alfredo', shortReason: 'High fat and calories can conflict with your targets.', pins: [], riskPins: ['High calories', 'Creamy'], confidencePercent: 88, dietBadges: [], allergenNote: null, noLine: null },
  ];
  const summaryText = 'Demo result - AI not configured';
  return { topPicks, caution, avoid, summaryText };
}

export class MockMenuAnalysisProvider implements MenuAnalysisProvider {
  async analyzeMenu(images: string[], user: UserProfile): Promise<MenuScanResult> {
    const preset = pickPreset(user);
    return {
      id: createId('scan'),
      createdAt: new Date().toISOString(),
      inputImages: images,
      topPicks: preset.topPicks.slice(0, 3),
      caution: preset.caution.slice(0, 3),
      avoid: preset.avoid.slice(0, 3),
      summaryText: preset.summaryText,
      disclaimerFlag: true,
    };
  }
}
