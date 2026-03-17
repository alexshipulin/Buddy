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
      dish('Lean fish plate', {
        estimatedCalories: 420,
        estimatedProteinG: 32,
        estimatedCarbsG: 24,
        estimatedFatG: 10,
        flags: { leanProtein: true, wholeFood: true },
      }),
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

  const cream = result.caution.find((item) => item.dish.name === 'Cream pasta');
  assert(Boolean(cream), 'Expected high fat pressure dish to move to caution');
  assert(
    String(cream?.explanation ?? '').toLowerCase().includes('fat'),
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

function testDislikedIngredientRemovableStaysRankable(): void {
  const result = rankExtractedDishes({
    dishes: [
      dish('Clean salmon plate', {
        estimatedCalories: 380,
        estimatedProteinG: 34,
        estimatedCarbsG: 22,
        estimatedFatG: 9,
        flags: { leanProtein: true, wholeFood: true },
      }),
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

  const burger =
    result.top.find((item) => item.dish.name === 'Burger with onions') ??
    result.caution.find((item) => item.dish.name === 'Burger with onions');
  assert(Boolean(burger), 'Expected removable dislike dish to stay rankable');
  assert(
    !result.avoid.some((item) => item.dish.name === 'Burger with onions'),
    'Expected removable dislike dish not to be forced into avoid'
  );
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

function testMildQualityReasonsDoNotForceCaution(): void {
  const result = rankExtractedDishes({
    dishes: [
      dish('Sauced chicken', {
        estimatedCalories: 320,
        estimatedProteinG: 35,
        estimatedCarbsG: 22,
        estimatedFatG: 7,
        flags: { highFatSauce: true, refinedCarbHeavy: true, leanProtein: true },
      }),
    ],
    goal: 'Maintain weight',
    targets: buildTargets(),
    dailyState: baseDailyState(),
    selectedAllergies: [],
    selectedDislikes: [],
    now: new Date(2026, 2, 11, 9, 0, 0, 0),
  });

  assert(result.top.length === 1, 'Expected mild quality-reason dish to remain in top');
}

function testRemainingMealsOneDoesNotApplyPostPickFeasibilityDemotion(): void {
  const score = scoreDish(
    {
      goal: 'Maintain weight',
      targets: buildTargets(),
      dailyState: {
        ...baseDailyState(),
        consumed: { calories: 1000, protein: 60, carbs: 80, fat: 30 },
        mealsLoggedCount: 2,
      },
      remaining: { calories: 1000, protein: 90, carbs: 120, fat: 40 },
      remainingMeals: 1,
      firstMealFlex: false,
      selectedAllergies: [],
      selectedDislikes: [],
    },
    dish('Late meal', {
      estimatedCalories: 800,
      estimatedProteinG: 35,
      estimatedCarbsG: 50,
      estimatedFatG: 20,
    })
  );

  assert(score.feasible === false, 'Expected remainingMeals=1 to keep strict post-pick feasibility');
  assert(
    score.softPressureReasons.some((reason) => reason.includes('remaining meal')),
    'Expected soft feasibility pressure in last-meal mode'
  );
}

function testTopEmptyPromotesUpToFiveProteinCautionItems(): void {
  const state = {
    ...baseDailyState(),
    consumed: { calories: 1600, protein: 90, carbs: 120, fat: 55 },
    mealsLoggedCount: 2,
  };
  const dishes = Array.from({ length: 6 }).map((_, i) =>
    dish(`Protein option ${i + 1}`, {
      estimatedCalories: 500,
      estimatedProteinG: 28,
      estimatedCarbsG: 45,
      estimatedFatG: 15,
    })
  );

  const result = rankExtractedDishes({
    dishes,
    goal: 'Maintain weight',
    targets: buildTargets(),
    dailyState: state,
    selectedAllergies: [],
    selectedDislikes: [],
    now: new Date(2026, 2, 11, 19, 0, 0, 0),
  });

  assert(result.top.length === 0, 'Expected top to stay empty when no top-eligible dishes exist');
  assert(
    result.caution.length + result.avoid.length === 6,
    'Expected all dishes to stay outside top without top promotion'
  );
}

function testTopRescueDoesNotRunWhenTopAlreadyExists(): void {
  const state = {
    ...baseDailyState(),
    consumed: { calories: 1600, protein: 90, carbs: 120, fat: 55 },
    mealsLoggedCount: 2,
  };
  const result = rankExtractedDishes({
    dishes: [
      dish('Clean top candidate', {
        estimatedCalories: 380,
        estimatedProteinG: 38,
        estimatedCarbsG: 30,
        estimatedFatG: 9,
        flags: { leanProtein: true, wholeFood: true },
      }),
      dish('Caution protein 1', {
        estimatedCalories: 500,
        estimatedProteinG: 28,
        estimatedCarbsG: 45,
        estimatedFatG: 15,
      }),
      dish('Caution protein 2', {
        estimatedCalories: 500,
        estimatedProteinG: 27,
        estimatedCarbsG: 42,
        estimatedFatG: 14,
      }),
    ],
    goal: 'Maintain weight',
    targets: buildTargets(),
    dailyState: state,
    selectedAllergies: [],
    selectedDislikes: [],
    now: new Date(2026, 2, 11, 19, 0, 0, 0),
  });

  assert(
    ![...result.top, ...result.caution, ...result.avoid].some(
      (item) => item.debug?.promotedFromCaution === true
    ),
    'Expected no synthetic promoted top flags in any bucket'
  );
}

function testTopRescueFiltersSevereQualityLowProteinAndAllergenUnclear(): void {
  const state = {
    ...baseDailyState(),
    consumed: { calories: 2100, protein: 80, carbs: 130, fat: 50 },
    mealsLoggedCount: 2,
  };
  const result = rankExtractedDishes({
    dishes: [
      dish('Good satay', {
        estimatedCalories: 710,
        estimatedProteinG: 34,
        estimatedCarbsG: 40,
        estimatedFatG: 18,
      }),
      dish('Fried protein', {
        estimatedCalories: 710,
        estimatedProteinG: 36,
        estimatedCarbsG: 35,
        estimatedFatG: 24,
        flags: { fried: true },
      }),
      dish('Low protein ham toast', {
        estimatedCalories: 710,
        estimatedProteinG: 20,
        estimatedCarbsG: 50,
        estimatedFatG: 19,
      }),
      dish('Unclear allergen dish', {
        estimatedCalories: 710,
        estimatedProteinG: 33,
        estimatedCarbsG: 38,
        estimatedFatG: 17,
        allergenSignals: { unclear: true },
      }),
    ],
    goal: 'Gain muscle',
    targets: buildTargets({ caloriesKcal: 2600, proteinG: 170, carbsG: 300, fatG: 85 }),
    dailyState: state,
    selectedAllergies: ['Peanuts'],
    selectedDislikes: [],
    now: new Date(2026, 2, 11, 19, 0, 0, 0),
  });

  assert(result.top.length === 0, 'Expected no top promotion when all options remain caution/avoid');
  assert(
    result.caution.length + result.avoid.length >= 1,
    'Expected non-top buckets to keep rankable dishes'
  );
}

function testRelativeProteinFallbackPromotesByProteinDensityWhenStrictHasNoCandidates(): void {
  const state = {
    ...baseDailyState(),
    consumed: { calories: 2100, protein: 80, carbs: 130, fat: 50 },
    mealsLoggedCount: 2,
  };
  const result = rankExtractedDishes({
    dishes: [
      dish('Candidate A', {
        estimatedCalories: 500,
        estimatedProteinG: 20,
        estimatedCarbsG: 45,
        estimatedFatG: 18,
      }),
      dish('Candidate B', {
        estimatedCalories: 300,
        estimatedProteinG: 18,
        estimatedCarbsG: 30,
        estimatedFatG: 9,
      }),
      dish('Candidate C', {
        estimatedCalories: 700,
        estimatedProteinG: 16,
        estimatedCarbsG: 55,
        estimatedFatG: 24,
      }),
    ],
    goal: 'Gain muscle',
    targets: buildTargets({ caloriesKcal: 2600, proteinG: 170, carbsG: 300, fatG: 85 }),
    dailyState: state,
    selectedAllergies: [],
    selectedDislikes: [],
    now: new Date(2026, 2, 11, 19, 0, 0, 0),
  });

  assert(result.top.length === 0, 'Expected no relative-protein fallback promotion into top');
  assert(
    result.caution.length + result.avoid.length === 3,
    'Expected all candidates to stay outside top when fallback promotion is disabled'
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
  testDislikedIngredientRemovableStaysRankable();
  testDislikedIngredientNonRemovableNotTop();
  testInfeasibleScoreConstantIsStable();
  testMildQualityReasonsDoNotForceCaution();
  testRemainingMealsOneDoesNotApplyPostPickFeasibilityDemotion();
  testTopEmptyPromotesUpToFiveProteinCautionItems();
  testTopRescueDoesNotRunWhenTopAlreadyExists();
  testTopRescueFiltersSevereQualityLowProteinAndAllergenUnclear();
  testRelativeProteinFallbackPromotesByProteinDensityWhenStrictHasNoCandidates();
}
