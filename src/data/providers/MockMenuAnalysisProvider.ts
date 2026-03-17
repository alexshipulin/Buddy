import { MenuScanResult, UserProfile } from '../../domain/models';
import { RawDish } from '../../ai/menuAnalysis';
import { classifyDishes } from '../../services/classifyDishes';
import { computeTodayMacrosUseCase } from '../../services/computeTodayMacrosUseCase';
import { createId } from '../../utils/id';
import { HistoryRepo } from '../repos/HistoryRepo';
import { MenuAnalysisProvider } from './MenuAnalysisProvider';

const MOCK_DISHES: RawDish[] = [
  {
    name: 'Grilled salmon with greens',
    nutrition: { caloriesKcal: 420, proteinG: 38, carbsG: 8, fatG: 24 },
    detected_dislikes: [],
    detected_allergies: ['Fish'],
    diet_flags: { vegan: false, vegetarian: false, gluten_free: true, lactose_free: true, keto: true, paleo: true },
    cooking_flags: { fried: false, high_sugar: false, heavy_sauce: false, processed: false },
    short_description: 'High protein, healthy fats, very low carbs.',
  },
  {
    name: 'Chicken salad',
    nutrition: { caloriesKcal: 350, proteinG: 32, carbsG: 18, fatG: 14 },
    detected_dislikes: [],
    detected_allergies: [],
    diet_flags: { vegan: false, vegetarian: false, gluten_free: true, lactose_free: true, keto: false, paleo: true },
    cooking_flags: { fried: false, high_sugar: false, heavy_sauce: false, processed: false },
    short_description: 'Lean protein with fiber-rich vegetables.',
  },
  {
    name: 'Rice bowl with tofu',
    nutrition: { caloriesKcal: 480, proteinG: 22, carbsG: 62, fatG: 12 },
    detected_dislikes: [],
    detected_allergies: ['Soy'],
    diet_flags: { vegan: true, vegetarian: true, gluten_free: true, lactose_free: true, keto: false, paleo: false },
    cooking_flags: { fried: false, high_sugar: false, heavy_sauce: false, processed: false },
    short_description: 'Plant-based protein with whole grain carbs.',
  },
  {
    name: 'Teriyaki chicken',
    nutrition: { caloriesKcal: 510, proteinG: 34, carbsG: 42, fatG: 16 },
    detected_dislikes: [],
    detected_allergies: ['Wheat', 'Soy'],
    diet_flags: { vegan: false, vegetarian: false, gluten_free: false, lactose_free: true, keto: false, paleo: false },
    cooking_flags: { fried: false, high_sugar: true, heavy_sauce: true, processed: false },
    short_description: 'Good protein but sauce adds sugar and sodium.',
  },
  {
    name: 'Veggie wrap',
    nutrition: { caloriesKcal: 390, proteinG: 14, carbsG: 52, fatG: 13 },
    detected_dislikes: [],
    detected_allergies: ['Wheat'],
    diet_flags: { vegan: true, vegetarian: true, gluten_free: false, lactose_free: true, keto: false, paleo: false },
    cooking_flags: { fried: false, high_sugar: false, heavy_sauce: false, processed: false },
    short_description: 'Light on protein but good for plant-based eating.',
  },
  {
    name: 'Granola bowl',
    nutrition: { caloriesKcal: 560, proteinG: 12, carbsG: 78, fatG: 20 },
    detected_dislikes: [],
    detected_allergies: ['Milk', 'Tree nuts'],
    diet_flags: { vegan: false, vegetarian: true, gluten_free: false, lactose_free: false, keto: false, paleo: false },
    cooking_flags: { fried: false, high_sugar: true, heavy_sauce: false, processed: true },
    short_description: 'High carbs and sugar — calorie dense.',
  },
  {
    name: 'Deep-fried combo platter',
    nutrition: { caloriesKcal: 980, proteinG: 28, carbsG: 88, fatG: 54 },
    detected_dislikes: [],
    detected_allergies: ['Wheat', 'Eggs'],
    diet_flags: { vegan: false, vegetarian: false, gluten_free: false, lactose_free: false, keto: false, paleo: false },
    cooking_flags: { fried: true, high_sugar: false, heavy_sauce: false, processed: true },
    short_description: 'Very high calories and fat, low nutrition quality.',
  },
  {
    name: 'Loaded nachos',
    nutrition: { caloriesKcal: 860, proteinG: 22, carbsG: 76, fatG: 48 },
    detected_dislikes: [],
    detected_allergies: ['Milk'],
    diet_flags: { vegan: false, vegetarian: true, gluten_free: false, lactose_free: false, keto: false, paleo: false },
    cooking_flags: { fried: true, high_sugar: false, heavy_sauce: true, processed: true },
    short_description: 'High fat and sodium, hard to fit in most goals.',
  },
  {
    name: 'Creamy pasta alfredo',
    nutrition: { caloriesKcal: 740, proteinG: 18, carbsG: 82, fatG: 36 },
    detected_dislikes: [],
    detected_allergies: ['Milk', 'Wheat', 'Eggs'],
    diet_flags: { vegan: false, vegetarian: true, gluten_free: false, lactose_free: false, keto: false, paleo: false },
    cooking_flags: { fried: false, high_sugar: false, heavy_sauce: true, processed: false },
    short_description: 'Rich and heavy — high carbs and saturated fat.',
  },
];

export class MockMenuAnalysisProvider implements MenuAnalysisProvider {
  async analyzeMenu(
    images: string[],
    user: UserProfile,
    deps: { historyRepo: HistoryRepo }
  ): Promise<MenuScanResult> {
    const eatenToday = await computeTodayMacrosUseCase(new Date(), { historyRepo: deps.historyRepo });
    const classified = classifyDishes(MOCK_DISHES, user, eatenToday, new Date());

    const summaryText =
      user.goal === 'Gain muscle' ? 'Buddy ranked dishes for muscle gain and your preferences.'
      : user.goal === 'Lose fat' ? 'Buddy ranked dishes for fat loss and your preferences.'
      : user.goal === 'Eat healthier' ? 'Buddy ranked dishes for healthier eating.'
      : 'Buddy ranked dishes for maintenance and your preferences.';

    return {
      id: createId('scan'),
      createdAt: new Date().toISOString(),
      inputImages: images,
      topPicks: classified.topPicks as unknown as MenuScanResult['topPicks'],
      caution: classified.caution as unknown as MenuScanResult['caution'],
      avoid: classified.avoid as unknown as MenuScanResult['avoid'],
      summaryText,
      disclaimerFlag: true,
    };
  }
}
