import {
  computeRemaining,
  DailyNutritionState,
  estimateRemainingMeals,
  feasibilityAfterPick,
  isFirstMealFlex,
  RemainingMacros,
} from './dayBudget';
import { buildDeterministicPins } from './menuPins';
import { buildDeterministicExplanation } from './recommendationExplanations';
import type {
  DishAllergenSignals,
  DishDislikeSignals,
  DishPick,
  DishQualityFlags,
  ExtractedDish,
  Goal,
  NutritionTargets,
} from './models';

export type RankedDishSection = 'top' | 'caution' | 'avoid';

export type RankedDish = {
  dish: ExtractedDish;
  section: RankedDishSection;
  pins: string[];
  riskPins: string[];
  explanation: string | null;
  quickFix: string | null;
  score: number;
  debug?: Record<string, unknown>;
};

export type RankingContext = {
  goal: Goal;
  targets: NutritionTargets;
  dailyState: DailyNutritionState;
  remaining: RemainingMacros;
  remainingMeals: number;
  firstMealFlex: boolean;
  selectedAllergies: string[];
  selectedDislikes: string[];
};

export type DishPressureMetrics = {
  caloriePressure: number;
  carbPressure: number;
  fatPressure: number;
  proteinCoverage: number;
  pressureTolerance: number;
};

export type DishScoreResult = {
  score: number;
  feasible: boolean;
  feasibility: ReturnType<typeof feasibilityAfterPick>;
  pressure: DishPressureMetrics;
  hardConflictReasons: string[];
  softPressureReasons: string[];
  proteinReasons: string[];
  qualityReasons: string[];
  allergenReasons: string[];
  dislikeReasons: string[];
};

type RankExtractedParams = {
  dishes: ExtractedDish[];
  goal: Goal;
  targets: NutritionTargets;
  dailyState: DailyNutritionState;
  selectedAllergies: string[];
  selectedDislikes: string[];
  now?: Date;
};

type RankedBuckets = {
  ranked: RankedDish[];
  top: RankedDish[];
  caution: RankedDish[];
  avoid: RankedDish[];
  context: RankingContext;
};

type GoalWeights = {
  proteinBonusWeight: number;
  caloriesOverPenaltyWeight: number;
  carbsOverPenaltyWeight: number;
  fatOverPenaltyWeight: number;
  softPressurePenaltyWeight: number;
  lowProteinPenaltyWeight: number;
  qualityBonusWeight: number;
  qualityPenaltyWeight: number;
};

const INFEASIBLE_SCORE = -999;
const FIRST_MEAL_PRESSURE_TOLERANCE = 1.8;
const SECOND_MEAL_PRESSURE_TOLERANCE = 1.35;
const LATER_MEAL_PRESSURE_TOLERANCE = 1.15;

const GOAL_TOLERANCE_MULTIPLIER: Record<Goal, number> = {
  'Lose fat': 1,
  'Maintain weight': 1.05,
  'Gain muscle': 1.2,
  'Eat healthier': 1.08,
};

export function buildFallbackTargets(goal: Goal): NutritionTargets {
  const map: Record<Goal, Pick<NutritionTargets, 'caloriesKcal' | 'proteinG' | 'carbsG' | 'fatG'>> = {
    'Lose fat': { caloriesKcal: 1900, proteinG: 140, carbsG: 170, fatG: 65 },
    'Maintain weight': { caloriesKcal: 2200, proteinG: 130, carbsG: 240, fatG: 75 },
    'Gain muscle': { caloriesKcal: 2600, proteinG: 170, carbsG: 300, fatG: 85 },
    'Eat healthier': { caloriesKcal: 2100, proteinG: 125, carbsG: 230, fatG: 75 },
  };
  const target = map[goal];
  return {
    ...target,
    bmrKcal: target.caloriesKcal - 350,
    tdeeKcal: target.caloriesKcal,
    assumptions: { ageUsed: 34, activityMult: 1.45 },
    computedAt: new Date().toISOString(),
  };
}

export function createFallbackDailyState(now: Date = new Date()): DailyNutritionState {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return {
    dateKey: `${y}-${m}-${d}`,
    consumed: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    mealsLoggedCount: 0,
    firstMealTime: null,
    lastMealTime: null,
    mealsPerDay: undefined,
    wholeFoodsMealsCount: 0,
    processedMealsCount: 0,
  };
}

function toNonNegativeInt(value: number | null | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

function normalizeAllergenToken(value: string): string {
  const normalized = value.trim().toLocaleLowerCase();
  if (normalized === 'peanuts') return 'peanut';
  if (normalized === 'tree nuts (almonds, walnuts, cashews)') return 'tree nuts';
  if (normalized === 'crustacean shellfish (shrimp, crab, lobster)') return 'shellfish';
  if (normalized === 'eggs') return 'egg';
  return normalized;
}

function getGoalWeights(goal: Goal): GoalWeights {
  switch (goal) {
    case 'Lose fat':
      return {
        proteinBonusWeight: 2.4,
        caloriesOverPenaltyWeight: 3.4,
        carbsOverPenaltyWeight: 1.7,
        fatOverPenaltyWeight: 2.5,
        softPressurePenaltyWeight: 36,
        lowProteinPenaltyWeight: 2.8,
        qualityBonusWeight: 1.1,
        qualityPenaltyWeight: 1.9,
      };
    case 'Gain muscle':
      return {
        proteinBonusWeight: 3.0,
        caloriesOverPenaltyWeight: 1.8,
        carbsOverPenaltyWeight: 0.8,
        fatOverPenaltyWeight: 1.1,
        softPressurePenaltyWeight: 22,
        lowProteinPenaltyWeight: 3.2,
        qualityBonusWeight: 0.8,
        qualityPenaltyWeight: 1.1,
      };
    case 'Eat healthier':
      return {
        proteinBonusWeight: 1.8,
        caloriesOverPenaltyWeight: 2.1,
        carbsOverPenaltyWeight: 1.2,
        fatOverPenaltyWeight: 1.5,
        softPressurePenaltyWeight: 26,
        lowProteinPenaltyWeight: 1.8,
        qualityBonusWeight: 2.4,
        qualityPenaltyWeight: 2.8,
      };
    case 'Maintain weight':
    default:
      return {
        proteinBonusWeight: 2.0,
        caloriesOverPenaltyWeight: 2.5,
        carbsOverPenaltyWeight: 1.4,
        fatOverPenaltyWeight: 1.6,
        softPressurePenaltyWeight: 28,
        lowProteinPenaltyWeight: 2.0,
        qualityBonusWeight: 1.2,
        qualityPenaltyWeight: 1.6,
      };
  }
}

function qualityBonusAndPenalty(flags: DishQualityFlags | undefined): {
  bonus: number;
  penalty: number;
  qualityReasons: string[];
} {
  const f = flags ?? {};
  const qualityReasons: string[] = [];
  let bonus = 0;
  let penalty = 0;

  if (f.wholeFood) {
    bonus += 8;
  }
  if (f.veggieForward) {
    bonus += 7;
  }
  if (f.leanProtein) {
    bonus += 6;
  }

  if (f.fried) {
    penalty += 10;
    qualityReasons.push('Fried option. Better occasionally than regularly.');
  }
  if (f.sugaryDrink) {
    penalty += 12;
    qualityReasons.push('Sugary drink with low nutrition value.');
  }
  if (f.processed) {
    penalty += 9;
    qualityReasons.push('Heavily processed compared with other options.');
  }
  if (f.highFatSauce) {
    penalty += 8;
    qualityReasons.push('High-fat sauce can raise meal pressure quickly.');
  }
  if (f.dessert) {
    penalty += 10;
    qualityReasons.push('Dessert-type option with lower satiety quality.');
  }
  if (f.refinedCarbHeavy) {
    penalty += 7;
    qualityReasons.push('Refined-carb heavy option for current budget.');
  }

  return { bonus, penalty, qualityReasons };
}

function proteinFloor(goal: Goal, firstMealFlex: boolean): number {
  switch (goal) {
    case 'Gain muscle':
      return firstMealFlex ? 24 : 28;
    case 'Lose fat':
      return firstMealFlex ? 18 : 24;
    case 'Eat healthier':
      return firstMealFlex ? 17 : 22;
    case 'Maintain weight':
    default:
      return firstMealFlex ? 18 : 22;
  }
}

function getBasePressureTolerance(mealsLoggedCount: number): number {
  if (mealsLoggedCount <= 0) return FIRST_MEAL_PRESSURE_TOLERANCE;
  if (mealsLoggedCount === 1) return SECOND_MEAL_PRESSURE_TOLERANCE;
  return LATER_MEAL_PRESSURE_TOLERANCE;
}

function hasAnyMatch(haystack: string[], token: string): boolean {
  return haystack.some((item) => item.includes(token) || token.includes(item));
}

function containsAllergenConflict(
  allergenSignals: DishAllergenSignals | undefined,
  selectedAllergies: string[]
): string[] {
  if (!allergenSignals || selectedAllergies.length === 0) return [];
  const contains = (allergenSignals.contains ?? []).map(normalizeAllergenToken).filter(Boolean);
  const selected = selectedAllergies.map(normalizeAllergenToken).filter(Boolean);
  const matches: string[] = [];
  for (const allergy of selected) {
    if (hasAnyMatch(contains, allergy)) {
      matches.push(`Contains ${allergy}`);
    }
  }
  return matches;
}

function deriveAllergenReason(
  allergenSignals: DishAllergenSignals | undefined,
  selectedAllergies: string[]
): string[] {
  const contains = containsAllergenConflict(allergenSignals, selectedAllergies);
  if (contains.length > 0) return contains;
  if (selectedAllergies.length > 0 && allergenSignals?.unclear) {
    return ['Allergen unclear - ask staff'];
  }
  if (allergenSignals?.noListedAllergen) {
    return ['No listed allergen'];
  }
  return [];
}

function deriveDislikeReasons(dislikes: DishDislikeSignals | undefined): string[] {
  if (!dislikes?.containsDislikedIngredient) return [];
  if ((dislikes.removableDislikedIngredients?.length ?? 0) > 0) {
    return ['Contains disliked ingredient but likely removable'];
  }
  return ['Contains disliked ingredient and not realistically removable'];
}

function determineSection(params: {
  scoreResult: DishScoreResult;
  firstMealFlex: boolean;
}): RankedDishSection {
  const { scoreResult, firstMealFlex } = params;
  if (scoreResult.hardConflictReasons.length > 0) return 'avoid';
  if (scoreResult.allergenReasons.some((reason) => reason.startsWith('Contains '))) return 'avoid';
  if (scoreResult.dislikeReasons.some((reason) => reason.includes('not realistically removable'))) {
    return 'avoid';
  }
  if (
    scoreResult.softPressureReasons.length > 0 ||
    scoreResult.proteinReasons.length > 0 ||
    scoreResult.qualityReasons.length > 0 ||
    scoreResult.allergenReasons.includes('Allergen unclear - ask staff')
  ) {
    return 'caution';
  }

  if (!scoreResult.feasible && !firstMealFlex) return 'caution';
  return 'top';
}

function toMealShareValues(remaining: RemainingMacros, remainingMeals: number): {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
} {
  return {
    calories: Math.max(1, remaining.calories / remainingMeals),
    protein: Math.max(1, remaining.protein / remainingMeals),
    carbs: Math.max(1, remaining.carbs / remainingMeals),
    fat: Math.max(1, remaining.fat / remainingMeals),
  };
}

export function scoreDish(ctx: RankingContext, dish: ExtractedDish): DishScoreResult {
  const macros = {
    calories: toNonNegativeInt(dish.estimatedCalories),
    protein: toNonNegativeInt(dish.estimatedProteinG),
    carbs: toNonNegativeInt(dish.estimatedCarbsG),
    fat: toNonNegativeInt(dish.estimatedFatG),
  };

  const feasibility = feasibilityAfterPick({
    goal: ctx.goal,
    remaining: ctx.remaining,
    remainingMeals: ctx.remainingMeals,
    dish: macros,
  });

  const mealShare = toMealShareValues(ctx.remaining, ctx.remainingMeals);
  const baseTolerance = getBasePressureTolerance(ctx.dailyState.mealsLoggedCount);
  const flexBoost = ctx.firstMealFlex ? (ctx.goal === 'Gain muscle' ? 0.25 : 0.12) : 0;
  const pressureTolerance =
    baseTolerance * GOAL_TOLERANCE_MULTIPLIER[ctx.goal] + flexBoost;

  const caloriePressure = macros.calories / mealShare.calories;
  const carbPressure = macros.carbs / mealShare.carbs;
  const fatPressure = macros.fat / mealShare.fat;
  const proteinCoverage = macros.protein / mealShare.protein;

  const pressure: DishPressureMetrics = {
    caloriePressure,
    carbPressure,
    fatPressure,
    proteinCoverage,
    pressureTolerance,
  };

  const hardConflictReasons: string[] = [];
  const softPressureReasons: string[] = [];
  const proteinReasons: string[] = [];

  const containsAllergens = containsAllergenConflict(
    dish.allergenSignals,
    ctx.selectedAllergies
  );
  if (containsAllergens.length > 0) {
    hardConflictReasons.push(...containsAllergens);
  }

  const dislikeReasons = deriveDislikeReasons(dish.dislikes);
  if (dislikeReasons.some((reason) => reason.includes('not realistically removable'))) {
    hardConflictReasons.push('Contains disliked ingredient and not realistically removable');
  }

  const severeCalorieOver =
    ctx.dailyState.mealsLoggedCount > 0 &&
    ctx.remaining.calories > 0 &&
    macros.calories > ctx.remaining.calories * 1.45;
  if (severeCalorieOver) {
    hardConflictReasons.push('Large share of your remaining daily calories.');
  }

  if (caloriePressure > pressureTolerance) {
    softPressureReasons.push('Large share of your daily calories. Go lighter later.');
  }
  if (fatPressure > pressureTolerance) {
    softPressureReasons.push('High fat for this point in the day. Keep later meals lower in fat.');
  } else if (
    dish.flags?.highFatSauce &&
    fatPressure >= 1 &&
    !softPressureReasons.includes('High fat for this point in the day. Keep later meals lower in fat.')
  ) {
    softPressureReasons.push('High fat for this point in the day. Keep later meals lower in fat.');
  }
  if (carbPressure > pressureTolerance) {
    softPressureReasons.push('Carb-heavy for your remaining budget. Keep later meals lower in carbs.');
  }

  const floor = proteinFloor(ctx.goal, ctx.firstMealFlex);
  const remainingProteinRatio =
    ctx.targets.proteinG > 0 ? Math.max(0, ctx.remaining.protein) / ctx.targets.proteinG : 0;
  if (macros.protein < floor && remainingProteinRatio > 0.35) {
    proteinReasons.push('Low protein for your goal. Add protein later today.');
  }

  if (!feasibility.ok) {
    if (feasibility.caloriesPerMealLeftAfter < 180) {
      hardConflictReasons.push('Would leave too little calories for remaining meals.');
    } else if (feasibility.caloriesPerMealLeftAfter < 300) {
      softPressureReasons.push('Would leave low calories per remaining meal.');
    }
    if (!ctx.firstMealFlex && feasibility.proteinPerMealNeededAfter > (ctx.goal === 'Gain muscle' ? 72 : 62)) {
      softPressureReasons.push('Low protein for your remaining budget. Add protein later today.');
    }
  }

  const { bonus: qualityBonus, penalty: qualityPenalty, qualityReasons } = qualityBonusAndPenalty(
    dish.flags
  );

  const weights = getGoalWeights(ctx.goal);
  const overCalories = Math.max(0, macros.calories - ctx.remaining.calories);
  const overCarbs = Math.max(0, macros.carbs - ctx.remaining.carbs);
  const overFat = Math.max(0, macros.fat - ctx.remaining.fat);

  const lowProteinPenalty =
    macros.protein < floor
      ? (floor - macros.protein) * weights.lowProteinPenaltyWeight
      : 0;

  const pressurePenalty =
    Math.max(0, caloriePressure - pressureTolerance) * weights.softPressurePenaltyWeight +
    Math.max(0, carbPressure - pressureTolerance) * (weights.softPressurePenaltyWeight * 0.65) +
    Math.max(0, fatPressure - pressureTolerance) * (weights.softPressurePenaltyWeight * 0.9);

  const score =
    macros.protein * weights.proteinBonusWeight +
    qualityBonus * weights.qualityBonusWeight -
    (overCalories * weights.caloriesOverPenaltyWeight +
      overCarbs * weights.carbsOverPenaltyWeight +
      overFat * weights.fatOverPenaltyWeight +
      qualityPenalty * weights.qualityPenaltyWeight +
      lowProteinPenalty +
      pressurePenalty +
      hardConflictReasons.length * 120);

  return {
    score,
    feasible: feasibility.ok,
    feasibility,
    pressure,
    hardConflictReasons,
    softPressureReasons,
    proteinReasons,
    qualityReasons,
    allergenReasons: deriveAllergenReason(dish.allergenSignals, ctx.selectedAllergies),
    dislikeReasons,
  };
}

function mapAllergenNote(
  allergenSignals: DishAllergenSignals | undefined,
  selectedAllergies: string[]
): string | null {
  const contains = containsAllergenConflict(allergenSignals, selectedAllergies);
  if (contains.length > 0) return contains[0];
  if (selectedAllergies.length > 0 && allergenSignals?.unclear) {
    return 'Allergen unclear - ask staff';
  }
  if (allergenSignals?.noListedAllergen) {
    return 'No listed allergen';
  }
  return null;
}

function mapNoLine(dislikes: DishDislikeSignals | undefined): string | null {
  const removable = dislikes?.removableDislikedIngredients ?? [];
  if (!dislikes?.containsDislikedIngredient || removable.length === 0) return null;
  return `No ${removable[0]}`;
}

function inferQuickFix(dish: ExtractedDish, section: RankedDishSection): string | null {
  if (section !== 'caution') return null;
  const removable = dish.dislikes?.removableDislikedIngredients ?? [];
  if (removable.length > 0) {
    return `Try: remove ${removable[0]}`.slice(0, 45);
  }
  if (dish.flags?.highFatSauce) return 'Try: sauce on the side';
  if (dish.flags?.fried) return 'Try: grilled not fried';
  if (dish.flags?.dessert) return 'Try: half portion';
  if (dish.flags?.refinedCarbHeavy) return 'Try: extra veggies';
  return null;
}

function normalizeDishName(name: string): string {
  return name.trim() || 'Unknown dish';
}

function toDishPick(
  ranked: RankedDish,
  selectedAllergies: string[]
): DishPick {
  const explanation = ranked.explanation ?? ranked.dish.shortDescription ?? 'Deterministic recommendation.';
  const quickFix = ranked.quickFix ?? inferQuickFix(ranked.dish, ranked.section);
  const pins = ranked.section === 'top' ? ranked.pins : [];
  const riskPins = ranked.section === 'top' ? undefined : ranked.riskPins;
  return {
    name: normalizeDishName(ranked.dish.name),
    shortReason: explanation,
    pins,
    riskPins,
    quickFix,
    confidencePercent: Math.max(1, Math.min(100, Math.round(ranked.dish.confidencePercent || 65))),
    dietBadges: (ranked.dish.dietBadges ?? []).slice(0, 3),
    allergenNote: mapAllergenNote(ranked.dish.allergenSignals, selectedAllergies),
    noLine: mapNoLine(ranked.dish.dislikes),
    estimatedCalories: ranked.dish.estimatedCalories,
    estimatedProteinG: ranked.dish.estimatedProteinG,
    estimatedCarbsG: ranked.dish.estimatedCarbsG,
    estimatedFatG: ranked.dish.estimatedFatG,
  };
}

export function rankedDishToDishPick(
  ranked: RankedDish,
  selectedAllergies: string[] = []
): DishPick {
  return toDishPick(ranked, selectedAllergies);
}

export function buildRankingContext(params: {
  goal: Goal;
  targets: NutritionTargets;
  dailyState: DailyNutritionState;
  selectedAllergies: string[];
  selectedDislikes: string[];
  now?: Date;
}): RankingContext {
  const now = params.now ?? new Date();
  const remaining = computeRemaining(params.targets, params.dailyState.consumed);
  const remainingMeals = estimateRemainingMeals(
    params.dailyState,
    now,
    params.dailyState.mealsPerDay
  );
  return {
    goal: params.goal,
    targets: params.targets,
    dailyState: params.dailyState,
    remaining,
    remainingMeals,
    firstMealFlex: isFirstMealFlex(params.dailyState, now),
    selectedAllergies: params.selectedAllergies,
    selectedDislikes: params.selectedDislikes,
  };
}

export function rankExtractedDishes(params: RankExtractedParams): RankedBuckets {
  const now = params.now ?? new Date();
  const context = buildRankingContext({
    goal: params.goal,
    targets: params.targets,
    dailyState: params.dailyState,
    selectedAllergies: params.selectedAllergies,
    selectedDislikes: params.selectedDislikes,
    now,
  });

  const ranked = params.dishes.map((dish) => {
    const scoreResult = scoreDish(context, dish);
    const section = determineSection({ scoreResult, firstMealFlex: context.firstMealFlex });
    const pinResult = buildDeterministicPins({
      goal: params.goal,
      section,
      calories: toNonNegativeInt(dish.estimatedCalories),
      protein: toNonNegativeInt(dish.estimatedProteinG),
      carbs: toNonNegativeInt(dish.estimatedCarbsG),
      fat: toNonNegativeInt(dish.estimatedFatG),
      flags: dish.flags,
      allergenSignals: dish.allergenSignals,
      dislikeSignals: dish.dislikes,
      selectedAllergies: params.selectedAllergies,
    });

    const explanationResult = buildDeterministicExplanation({
      goal: params.goal,
      hardConflictReasons: scoreResult.hardConflictReasons,
      softPressureReasons: scoreResult.softPressureReasons,
      qualityReasons: scoreResult.qualityReasons,
      proteinReasons: scoreResult.proteinReasons,
      allergenReasons: scoreResult.allergenReasons,
      dislikeReasons: scoreResult.dislikeReasons,
    });

    const quickFix =
      section === 'caution'
        ? explanationResult.quickFix ?? inferQuickFix(dish, section)
        : null;

    return {
      dish,
      section,
      pins: pinResult.pins,
      riskPins: pinResult.riskPins,
      explanation: explanationResult.explanation,
      quickFix,
      score: scoreResult.score,
      debug: {
        hardConflictReasons: scoreResult.hardConflictReasons,
        softPressureReasons: scoreResult.softPressureReasons,
        proteinReasons: scoreResult.proteinReasons,
        qualityReasons: scoreResult.qualityReasons,
        allergenReasons: scoreResult.allergenReasons,
        dislikeReasons: scoreResult.dislikeReasons,
        ...scoreResult.pressure,
      },
    } satisfies RankedDish;
  });

  const sorted = [...ranked].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.dish.confidencePercent ?? 0) - (a.dish.confidencePercent ?? 0);
  });

  const debugList = (item: RankedDish, key: string): string[] => {
    const value = item.debug?.[key];
    return Array.isArray(value) ? value.map((entry) => String(entry)) : [];
  };

  const promoteFromCaution = (input: RankedDish[]): RankedDish[] => {
    const topExisting = input.filter((item) => item.section === 'top');
    if (topExisting.length > 0) return input;

    const cautionCandidates = input.filter((item) => item.section === 'caution');
    if (cautionCandidates.length === 0) return input;

    const promotable = cautionCandidates.filter((item) => {
      const hard = debugList(item, 'hardConflictReasons');
      const allergen = debugList(item, 'allergenReasons');
      const dislike = debugList(item, 'dislikeReasons');
      if (hard.length > 0 || dislike.length > 0) {
        return false;
      }
      if (allergen.some((reason) => reason.startsWith('Contains '))) return false;
      if (allergen.includes('Allergen unclear - ask staff')) return false;
      return true;
    });

    const promoteCount = Math.min(2, promotable.length);
    if (promoteCount === 0) return input;
    const promotedRefs = new Set(promotable.slice(0, promoteCount));

    return input.map((item) => {
      if (!promotedRefs.has(item)) return item;
      return {
        ...item,
        section: 'top',
        debug: {
          ...(item.debug ?? {}),
          promotedFromCaution: true,
        },
      };
    });
  };

  const sectionAdjusted = promoteFromCaution(sorted);
  const top = sectionAdjusted.filter((item) => item.section === 'top');
  const caution = sectionAdjusted.filter((item) => item.section === 'caution');
  const avoid = sectionAdjusted.filter((item) => item.section === 'avoid');

  return {
    ranked: sectionAdjusted,
    top,
    caution,
    avoid,
    context,
  };
}

export function rankForLegacyBuckets(params: {
  dishes: ExtractedDish[];
  goal: Goal;
  selectedAllergies: string[];
  selectedDislikes: string[];
  now?: Date;
}): { topPicks: DishPick[]; caution: DishPick[]; avoid: DishPick[] } {
  const now = params.now ?? new Date();
  const targets = buildFallbackTargets(params.goal);
  const dailyState = createFallbackDailyState(now);
  const ranked = rankExtractedDishes({
    dishes: params.dishes,
    goal: params.goal,
    targets,
    dailyState,
    selectedAllergies: params.selectedAllergies,
    selectedDislikes: params.selectedDislikes,
    now,
  });

  return {
    topPicks: ranked.top.map((item) => toDishPick(item, params.selectedAllergies)),
    caution: ranked.caution.map((item) => toDishPick(item, params.selectedAllergies)),
    avoid: ranked.avoid.map((item) => toDishPick(item, params.selectedAllergies)),
  };
}

export const rankingConstants = {
  INFEASIBLE_SCORE,
  FIRST_MEAL_PRESSURE_TOLERANCE,
  SECOND_MEAL_PRESSURE_TOLERANCE,
  LATER_MEAL_PRESSURE_TOLERANCE,
};
