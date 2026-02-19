import { DishRecommendation, MenuScanResult, UserProfile } from '../../domain/models';
import { createId } from '../../utils/id';
import { MenuAnalysisProvider } from './MenuAnalysisProvider';

function pickPreset(user: UserProfile): { topPicks: DishRecommendation[]; caution: DishRecommendation[]; avoid: DishRecommendation[]; summaryText: string } {
  const topPicks: DishRecommendation[] = [
    { name: 'Grilled salmon with greens', reasonShort: 'High protein and healthy fats.', tags: ['High protein', 'Omega-3', 'Lower sodium'] },
    { name: 'Chicken salad', reasonShort: 'Lean protein with fiber-rich vegetables.', tags: ['High protein', 'Lower calories', 'High fiber'] },
    { name: 'Rice bowl with tofu', reasonShort: 'Plant protein and controlled energy density.', tags: ['Vegetarian-friendly', 'High fiber'] },
  ];
  const caution: DishRecommendation[] = [
    { name: 'Teriyaki chicken', reasonShort: 'Protein is good, but sauce can add sugar and sodium.', tags: ['Lower sugar', 'Lower sodium'] },
    { name: 'Veggie wrap', reasonShort: 'Mostly fine, though tortillas and sauces can shift macros.', tags: ['Vegetarian-friendly'] },
    { name: 'Granola bowl', reasonShort: 'Looks healthy but can be calorie dense with sweeteners.', tags: ['High fiber', 'Lower sugar'] },
  ];
  const avoid: DishRecommendation[] = [
    { name: 'Deep-fried combo platter', reasonShort: 'Very high energy density and low satiety quality.', tags: ['Lower calories'] },
    { name: 'Loaded nachos', reasonShort: 'Portion size and toppings make goals harder to hit.', tags: ['Lower sodium'] },
    { name: 'Creamy pasta alfredo', reasonShort: 'High fat and calories can conflict with your targets.', tags: ['Lower calories'] },
  ];
  const summaryText =
    user.goal === 'Gain muscle'
      ? 'Buddy ranked dishes for muscle gain and your preferences.'
      : user.goal === 'Lose fat'
        ? 'Buddy ranked dishes for fat loss and your preferences.'
        : 'Buddy ranked dishes for maintenance and your preferences.';
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
