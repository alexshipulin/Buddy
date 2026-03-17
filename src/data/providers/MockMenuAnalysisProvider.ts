import { RawDish } from '../../ai/menuAnalysis';
import { DishPick, DishRecommendation, MenuScanResult, UserProfile } from '../../domain/models';
import { classifyDishes } from '../../services/classifyDishes';
import { computeTodayMacrosUseCase } from '../../services/computeTodayMacrosUseCase';
import { historyRepo } from '../../services/container';
import { createId } from '../../utils/id';
import { MenuAnalysisContext, MenuAnalysisProvider } from './MenuAnalysisProvider';

function pickPreset(_user: UserProfile): { dishes: DishPick[]; summaryText: string } {
  const topPicks: DishPick[] = [
    { name: 'Grilled salmon with greens', shortReason: 'High protein and healthy fats.', pins: ['High protein', 'Lean protein', 'Low sodium'], confidencePercent: 88, dietBadges: [], allergenNote: 'Allergen safe', noLine: null, estimatedCalories: 420, estimatedProteinG: 38, estimatedCarbsG: 8, estimatedFatG: 24 },
    { name: 'Chicken salad', shortReason: 'Lean protein with fiber-rich vegetables.', pins: ['High protein', 'Low-calorie', 'High fiber'], confidencePercent: 85, dietBadges: [], allergenNote: 'Allergen safe', noLine: null, estimatedCalories: 350, estimatedProteinG: 32, estimatedCarbsG: 18, estimatedFatG: 14 },
    { name: 'Rice bowl with tofu', shortReason: 'Plant protein and controlled energy density.', pins: ['Whole foods', 'High fiber', 'Vegetables'], confidencePercent: 82, dietBadges: [], allergenNote: 'Allergen safe', noLine: null, estimatedCalories: 480, estimatedProteinG: 22, estimatedCarbsG: 62, estimatedFatG: 12 },
  ];
  const caution: DishPick[] = [
    { name: 'Teriyaki chicken', shortReason: 'Protein is good, but sauce can add sugar and sodium.', pins: [], riskPins: ['High sugar', 'High sodium'], quickFix: 'Try: sauce on the side', confidencePercent: 65, dietBadges: [], allergenNote: null, noLine: null, estimatedCalories: 510, estimatedProteinG: 34, estimatedCarbsG: 42, estimatedFatG: 16 },
    { name: 'Veggie wrap', shortReason: 'Mostly fine, though tortillas and sauces can shift macros.', pins: [], riskPins: ['Refined Carbs'], quickFix: 'Try: extra veggies', confidencePercent: 60, dietBadges: [], allergenNote: null, noLine: null, estimatedCalories: 390, estimatedProteinG: 14, estimatedCarbsG: 52, estimatedFatG: 13 },
    { name: 'Granola bowl', shortReason: 'Looks healthy but can be calorie dense with sweeteners.', pins: [], riskPins: ['High sugar', 'High-calorie'], quickFix: 'Try: no sauce', confidencePercent: 55, dietBadges: [], allergenNote: null, noLine: null, estimatedCalories: 560, estimatedProteinG: 12, estimatedCarbsG: 78, estimatedFatG: 20 },
  ];
  const avoid: DishPick[] = [
    { name: 'Deep-fried combo platter', shortReason: 'Very high energy density and low satiety quality.', pins: [], riskPins: ['Fried', 'High-calorie'], confidencePercent: 90, dietBadges: [], allergenNote: null, noLine: null, estimatedCalories: 980, estimatedProteinG: 28, estimatedCarbsG: 88, estimatedFatG: 54 },
    { name: 'Loaded nachos', shortReason: 'Portion size and toppings make goals harder to hit.', pins: [], riskPins: ['High-calorie', 'High sat fat'], confidencePercent: 85, dietBadges: [], allergenNote: null, noLine: null, estimatedCalories: 860, estimatedProteinG: 22, estimatedCarbsG: 76, estimatedFatG: 48 },
    { name: 'Creamy pasta alfredo', shortReason: 'High fat and calories can conflict with your targets.', pins: [], riskPins: ['High-calorie', 'Heavy sauce'], confidencePercent: 88, dietBadges: [], allergenNote: null, noLine: null, estimatedCalories: 740, estimatedProteinG: 18, estimatedCarbsG: 82, estimatedFatG: 36 },
  ];
  const summaryText = 'Demo result - AI not configured';
  return { dishes: [...topPicks, ...caution, ...avoid], summaryText };
}

function toRawDish(dish: DishPick): RawDish {
  return {
    name: dish.name,
    detected_dislikes: [],
    detected_allergies: [],
    diet_flags: {
      vegan: false,
      vegetarian: false,
      gluten_free: false,
      lactose_free: false,
      keto: false,
      paleo: false,
    },
    short_description: dish.shortReason,
    nutrition: {
      caloriesKcal: dish.estimatedCalories ?? 0,
      proteinG: dish.estimatedProteinG ?? 0,
      carbsG: dish.estimatedCarbsG ?? 0,
      fatG: dish.estimatedFatG ?? 0,
    },
  };
}

function dishRecToDishPick(dish: DishRecommendation): DishPick {
  return {
    name: dish.name,
    shortReason: dish.reasonShort,
    pins: dish.tags,
    confidencePercent: 80,
    dietBadges: [],
    allergenNote: null,
    noLine: null,
    estimatedCalories: dish.nutrition?.caloriesKcal ?? null,
    estimatedProteinG: dish.nutrition?.proteinG ?? null,
    estimatedCarbsG: dish.nutrition?.carbsG ?? null,
    estimatedFatG: dish.nutrition?.fatG ?? null,
    ...(dish.contextNote ? { contextNote: dish.contextNote } : {}),
  } as DishPick;
}

export class MockMenuAnalysisProvider implements MenuAnalysisProvider {
  async analyzeMenu(
    images: string[],
    user: UserProfile,
    _signal?: AbortSignal,
    context?: MenuAnalysisContext
  ): Promise<MenuScanResult> {
    const preset = pickPreset(user);
    const mockDishes = preset.dishes.map(toRawDish);
    const eatenToday = await computeTodayMacrosUseCase(new Date(), { historyRepo });
    const classified = classifyDishes(mockDishes, user, eatenToday, new Date());
    const topPicks = classified.topPicks.map(dishRecToDishPick);
    const caution = classified.caution.map(dishRecToDishPick);
    const avoid = classified.avoid.map(dishRecToDishPick);
    return {
      id: createId('scan'),
      analysisId: context?.analysisId,
      createdAt: new Date().toISOString(),
      inputImages: images,
      topPicks,
      caution,
      avoid,
      summaryText: preset.summaryText,
      disclaimerFlag: true,
    };
  }
}
