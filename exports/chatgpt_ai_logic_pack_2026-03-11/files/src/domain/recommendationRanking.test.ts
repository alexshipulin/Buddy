import { createEmptyDailyNutritionState } from './dayBudget';
import type { ExtractedDish, Goal, NutritionTargets } from './models';
import {
  buildFallbackTargets,
  rankExtractedDishes,
  rankedDishToDishPick,
  rankingConstants,
  scoreDish,
} from './recommendationRanking';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function buildTargets(overrides?: Partial<NutritionTargets>): NutritionTargets {
  return {
    ...buildFallbackTargets('Maintain weight'),
    caloriesKcal: 2000,
    proteinG: 150,
    carbsG: 200,
    fatG: 70,
    ...overrides,
  };
}

function dish(name: string, overrides?: Partial<ExtractedDish>): ExtractedDish {
  return {
    name,
    menuSection: 'Mains',
    shortDescription: `${name} description`,
    estimatedCalories: 600,
    estimatedProteinG: 30,
    estimatedCarbsG: 50,
    estimatedFatG: 20,
    confidencePercent: 80,
    ...overrides,
  };
}

function baseDailyState() {
  return createEmptyDailyNutritionState('2026-03-11');
}

function testFirstMealHighFatDessertGoesCaution(): void {
  const result = rankExtractedDishes({
    dishes: [
      dish('Cheesecake', {
        estimatedCalories: 520,
        estimatedProteinG: 8,
        estimatedCarbsG: 52,
        estimatedFatG: 31,
        flags: { dessert: true, highFatSauce: true, processed: true },
      }),
    ],
    goal: 'Lose fat',
    targets: buildTargets(),
    dailyState: baseDailyState(),
    selectedAllergies: [],
    selectedDislikes: [],
    now: new Date(2026, 2, 11, 9, 0, 0, 0),
  });

  assert(result.caution.length === 1, 'Expected dessert to become caution on first meal');
  assert(result.avoid.length === 0, 'Expected no hard avoid from meal-share alone in first meal');
}

function testSecondMealFatPressureMovesToCaution(): void {
  const state = {
    ...baseDailyState(),
    consumed: { calories: 1100, protein: 70, carbs: 90, fat: 35 },
    mealsLoggedCount: 1,
  };

  const result = rankExtractedDishes({
    dishes: [
      dish('Cream pasta', {
        estimatedCalories: 650,
        estimatedProteinG: 24,
        estimatedCarbsG: 48,
        estimatedFatG: 36,
        flags: { highFatSauce: true, refinedCarbHeavy: true },
      }),
    ],
    goal: 'Maintain weight',
    targets: buildTargets(),
    dailyState: state,
    selectedAllergies: [],
    selectedDislikes: [],
    now: new Date(2026, 2, 11, 14, 0, 0, 0),
  });

  assert(result.caution.length === 1, 'Expected high fat pressure dish to move to caution');
  assert(
    String(result.caution[0].explanation ?? '').toLowerCase().includes('fat'),
    'Expected caution explanation to mention fat pressure'
  );
}

function testGainMuscleEarlyCarbIsSofterThanLoseFat(): void {
  const dishes = [
    dish('Rice chicken bowl', {
      estimatedCalories: 720,
      estimatedProteinG: 38,
      estimatedCarbsG: 82,
      estimatedFatG: 18,
      flags: { wholeFood: true, leanProtein: true },
    }),
  ];

  const gain = rankExtractedDishes({
    dishes,
    goal: 'Gain muscle',
    targets: buildTargets({ caloriesKcal: 2600, proteinG: 170, carbsG: 310, fatG: 85 }),
    dailyState: baseDailyState(),
    selectedAllergies: [],
    selectedDislikes: [],
    now: new Date(2026, 2, 11, 9, 0, 0, 0),
  });

  const lose = rankExtractedDishes({
    dishes,
    goal: 'Lose fat',
    targets: buildTargets(),
    dailyState: baseDailyState(),
    selectedAllergies: [],
    selectedDislikes: [],
    now: new Date(2026, 2, 11, 9, 0, 0, 0),
  });

  assert(gain.top.length >= lose.top.length, 'Expected gain-muscle to be at least as soft as lose-fat');
}

function testEatHealthierWholeFoodBeatsFried(): void {
  const result = rankExtractedDishes({
    dishes: [
      dish('Balanced bowl', {
        estimatedCalories: 560,
        estimatedProteinG: 34,
        estimatedCarbsG: 48,
        estimatedFatG: 17,
        flags: { wholeFood: true, veggieForward: true, leanProtein: true },
      }),
      dish('Fried snack', {
        estimatedCalories: 560,
        estimatedProteinG: 18,
        estimatedCarbsG: 55,
        estimatedFatG: 28,
        flags: { fried: true, processed: true },
      }),
    ],
    goal: 'Eat healthier',
    targets: buildTargets(),
    dailyState: baseDailyState(),
    selectedAllergies: [],
    selectedDislikes: [],
  });

  const wholeFood = result.ranked.find((item) => item.dish.name === 'Balanced bowl');
  const fried = result.ranked.find((item) => item.dish.name === 'Fried snack');
  assert(Boolean(wholeFood) && Boolean(fried), 'Expected both dishes ranked');
  assert((wholeFood?.score ?? 0) > (fried?.score ?? 0), 'Expected whole-food dish to rank higher');
}

function testExplicitAllergenBecomesAvoid(): void {
  const result = rankExtractedDishes({
    dishes: [
      dish('Peanut noodles', {
        allergenSignals: { contains: ['Peanut'] },
      }),
    ],
    goal: 'Maintain weight',
    targets: buildTargets(),
    dailyState: baseDailyState(),
    selectedAllergies: ['Peanuts'],
    selectedDislikes: [],
  });

  assert(result.avoid.length === 1, 'Expected explicit allergen to be avoid');
  const mapped = rankedDishToDishPick(result.avoid[0], ['Peanuts']);
  assert(mapped.allergenNote === 'Contains peanut', 'Expected allergen note to reflect explicit allergen');
}

function testAllergenUnclearIsNotTop(): void {
  const result = rankExtractedDishes({
    dishes: [
      dish('Creamy unknown soup', {
        allergenSignals: { unclear: true },
      }),
    ],
    goal: 'Maintain weight',
    targets: buildTargets(),
    dailyState: baseDailyState(),
    selectedAllergies: ['Milk'],
    selectedDislikes: [],
  });

  assert(result.top.length === 0, 'Expected unclear allergen dish not to be top');
  assert(result.caution.length === 1 || result.avoid.length === 1, 'Expected caution or avoid');
}

function testNoListedAllergenCanRank(): void {
  const result = rankExtractedDishes({
    dishes: [
      dish('Clear salad', {
        allergenSignals: { noListedAllergen: true },
        flags: { wholeFood: true, veggieForward: true },
      }),
    ],
    goal: 'Eat healthier',
    targets: buildTargets(),
    dailyState: baseDailyState(),
    selectedAllergies: ['Milk'],
    selectedDislikes: [],
  });

  assert(result.top.length === 1 || result.caution.length === 1, 'Expected dish with no listed allergen to stay rankable');
  const mapped = rankedDishToDishPick(result.top[0] ?? result.caution[0], ['Milk']);
  assert(mapped.allergenNote === 'No listed allergen', 'Expected no listed allergen note');
}

function testDislikedIngredientRemovableIsCaution(): void {
  const result = rankExtractedDishes({
    dishes: [
      dish('Burger with onions', {
        dislikes: {
          containsDislikedIngredient: true,
          removableDislikedIngredients: ['onions'],
        },
      }),
    ],
    goal: 'Maintain weight',
    targets: buildTargets(),
    dailyState: baseDailyState(),
    selectedAllergies: [],
    selectedDislikes: ['Onions'],
  });

  assert(result.caution.length === 1, 'Expected removable dislike to become caution');
  assert(Boolean(result.caution[0].quickFix), 'Expected quick fix for removable dislike');
}

function testDislikedIngredientNonRemovableNotTop(): void {
  const result = rankExtractedDishes({
    dishes: [
      dish('Onion jam tart', {
        dislikes: {
          containsDislikedIngredient: true,
        },
        flags: { dessert: true },
      }),
    ],
    goal: 'Maintain weight',
    targets: buildTargets(),
    dailyState: baseDailyState(),
    selectedAllergies: [],
    selectedDislikes: ['Onions'],
  });

  assert(result.top.length === 0, 'Expected non-removable dislike dish not to remain top');
}

function testInfeasibleScoreConstantIsStable(): void {
  const score = scoreDish(
    {
      goal: 'Maintain weight',
      targets: buildTargets(),
      dailyState: {
        ...baseDailyState(),
        consumed: { calories: 1900, protein: 130, carbs: 170, fat: 65 },
        mealsLoggedCount: 2,
      },
      remaining: { calories: 100, protein: 20, carbs: 30, fat: 5 },
      remainingMeals: 1,
      firstMealFlex: false,
      selectedAllergies: [],
      selectedDislikes: [],
    },
    dish('Massive dish', {
      estimatedCalories: 900,
      estimatedProteinG: 10,
      estimatedCarbsG: 120,
      estimatedFatG: 40,
    })
  );
  assert(typeof score.score === 'number', 'Expected numeric score');
  assert(
    rankingConstants.INFEASIBLE_SCORE === -999,
    'Expected INFEASIBLE sentinel constant to remain stable'
  );
}

export function runRecommendationRankingTests(): void {
  testFirstMealHighFatDessertGoesCaution();
  testSecondMealFatPressureMovesToCaution();
  testGainMuscleEarlyCarbIsSofterThanLoseFat();
  testEatHealthierWholeFoodBeatsFried();
  testExplicitAllergenBecomesAvoid();
  testAllergenUnclearIsNotTop();
  testNoListedAllergenCanRank();
  testDislikedIngredientRemovableIsCaution();
  testDislikedIngredientNonRemovableNotTop();
  testInfeasibleScoreConstantIsStable();
}
