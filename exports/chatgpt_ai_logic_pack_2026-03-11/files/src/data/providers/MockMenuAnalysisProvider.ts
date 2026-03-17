import { DishPick, ExtractedDish, MenuScanResult, UserProfile } from '../../domain/models';
import { createId } from '../../utils/id';
import { MenuAnalysisContext, MenuAnalysisProvider } from './MenuAnalysisProvider';

function toExtractedDish(section: 'top' | 'caution' | 'avoid', dish: DishPick): ExtractedDish {
  const risk = (dish.riskPins ?? []).map((item) => item.toLocaleLowerCase());
  const flags: ExtractedDish['flags'] = {
    leanProtein: dish.pins.includes('High protein') || dish.pins.includes('Lean protein'),
    veggieForward: dish.pins.includes('Veggie-rich') || dish.pins.includes('Vegetables'),
    wholeFood: dish.pins.includes('Whole foods') || dish.pins.includes('Fresh'),
    fried: risk.some((item) => item.includes('fried')),
    dessert: risk.some((item) => item.includes('sugar')),
    sugaryDrink: false,
    refinedCarbHeavy: risk.some((item) => item.includes('refined')),
    highFatSauce: risk.some((item) => item.includes('sauce') || item.includes('creamy')),
    processed: risk.some((item) => item.includes('processed')),
  };

  return {
    id: createId('dish'),
    name: dish.name,
    menuSection: section,
    shortDescription: dish.shortReason,
    estimatedCalories: dish.estimatedCalories ?? null,
    estimatedProteinG: dish.estimatedProteinG ?? null,
    estimatedCarbsG: dish.estimatedCarbsG ?? null,
    estimatedFatG: dish.estimatedFatG ?? null,
    confidencePercent: dish.confidencePercent,
    dietBadges: dish.dietBadges,
    flags,
    allergenSignals:
      dish.allergenNote === 'May contain allergens - ask the waiter'
        ? { unclear: true }
        : dish.allergenNote === 'Allergen safe'
          ? { noListedAllergen: true }
          : undefined,
    dislikes: dish.noLine ? { containsDislikedIngredient: true, removableDislikedIngredients: [dish.noLine.replace(/^No\s+/i, '')] } : undefined,
    constructorMeta: /^(build|custom)\s*:/i.test(dish.name)
      ? { isCustom: true, components: dish.name.replace(/^(build|custom)\s*:\s*/i, '').split('+').map((i) => i.trim()).filter(Boolean) }
      : undefined,
  };
}

function pickPreset(_user: UserProfile): { topPicks: DishPick[]; caution: DishPick[]; avoid: DishPick[]; summaryText: string } {
  const topPicks: DishPick[] = [
    { name: 'Grilled salmon with greens', shortReason: 'High protein and healthy fats.', pins: ['High protein', 'Lean protein', 'Low sodium'], confidencePercent: 88, dietBadges: [], allergenNote: 'No listed allergen', noLine: null },
    { name: 'Chicken salad', shortReason: 'Lean protein with fiber-rich vegetables.', pins: ['High protein', 'Low calorie', 'High fiber'], confidencePercent: 85, dietBadges: [], allergenNote: 'No listed allergen', noLine: null },
    { name: 'Rice bowl with tofu', shortReason: 'Plant protein and controlled energy density.', pins: ['Whole foods', 'High fiber', 'Veggie-rich'], confidencePercent: 82, dietBadges: [], allergenNote: 'No listed allergen', noLine: null },
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
  async analyzeMenu(
    images: string[],
    user: UserProfile,
    _signal?: AbortSignal,
    context?: MenuAnalysisContext
  ): Promise<MenuScanResult> {
    const preset = pickPreset(user);
    const extractedDishes: ExtractedDish[] = [
      ...preset.topPicks.map((dish) => toExtractedDish('top', dish)),
      ...preset.caution.map((dish) => toExtractedDish('caution', dish)),
      ...preset.avoid.map((dish) => toExtractedDish('avoid', dish)),
    ];

    return {
      id: createId('scan'),
      analysisId: context?.analysisId,
      recommendationVersion: 2,
      extractedDishes,
      createdAt: new Date().toISOString(),
      inputImages: images,
      topPicks: preset.topPicks,
      caution: preset.caution,
      avoid: preset.avoid,
      summaryText: preset.summaryText,
      disclaimerFlag: true,
    };
  }
}
