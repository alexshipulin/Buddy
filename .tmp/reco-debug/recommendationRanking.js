"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rankingConstants = void 0;
exports.buildFallbackTargets = buildFallbackTargets;
exports.createFallbackDailyState = createFallbackDailyState;
exports.scoreDish = scoreDish;
exports.rankedDishToDishPick = rankedDishToDishPick;
exports.buildRankingContext = buildRankingContext;
exports.rankExtractedDishes = rankExtractedDishes;
exports.rankForLegacyBuckets = rankForLegacyBuckets;
const dayBudget_1 = require("./dayBudget");
const menuPins_1 = require("./menuPins");
const recommendationExplanations_1 = require("./recommendationExplanations");
const INFEASIBLE_SCORE = -999;
const FIRST_MEAL_PRESSURE_TOLERANCE = 1.8;
const SECOND_MEAL_PRESSURE_TOLERANCE = 1.35;
const LATER_MEAL_PRESSURE_TOLERANCE = 1.15;
const GOAL_TOLERANCE_MULTIPLIER = {
    'Lose fat': 1,
    'Maintain weight': 1.05,
    'Gain muscle': 1.2,
    'Eat healthier': 1.08,
};
function buildFallbackTargets(goal) {
    const map = {
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
function createFallbackDailyState(now = new Date()) {
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
function toNonNegativeInt(value) {
    if (typeof value !== 'number' || !Number.isFinite(value))
        return 0;
    return Math.max(0, Math.round(value));
}
function normalizeAllergenToken(value) {
    const normalized = value.trim().toLocaleLowerCase();
    if (normalized === 'peanuts')
        return 'peanut';
    if (normalized === 'tree nuts (almonds, walnuts, cashews)')
        return 'tree nuts';
    if (normalized === 'crustacean shellfish (shrimp, crab, lobster)')
        return 'shellfish';
    if (normalized === 'eggs')
        return 'egg';
    return normalized;
}
function getGoalWeights(goal) {
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
function qualityBonusAndPenalty(flags) {
    const f = flags ?? {};
    const qualityReasons = [];
    let bonus = 0;
    let penalty = 0;
    if (f.wholeFood) {
        bonus += 8;
        qualityReasons.push('Whole-food option compared with other choices.');
    }
    if (f.veggieForward) {
        bonus += 7;
        qualityReasons.push('Veggie-forward option for a more balanced day.');
    }
    if (f.leanProtein) {
        bonus += 6;
        qualityReasons.push('Lean protein support for your goal.');
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
function proteinFloor(goal, firstMealFlex) {
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
function getBasePressureTolerance(mealsLoggedCount) {
    if (mealsLoggedCount <= 0)
        return FIRST_MEAL_PRESSURE_TOLERANCE;
    if (mealsLoggedCount === 1)
        return SECOND_MEAL_PRESSURE_TOLERANCE;
    return LATER_MEAL_PRESSURE_TOLERANCE;
}
function hasAnyMatch(haystack, token) {
    return haystack.some((item) => item.includes(token) || token.includes(item));
}
function containsAllergenConflict(allergenSignals, selectedAllergies) {
    if (!allergenSignals || selectedAllergies.length === 0)
        return [];
    const contains = (allergenSignals.contains ?? []).map(normalizeAllergenToken).filter(Boolean);
    const selected = selectedAllergies.map(normalizeAllergenToken).filter(Boolean);
    const matches = [];
    for (const allergy of selected) {
        if (hasAnyMatch(contains, allergy)) {
            matches.push(`Contains ${allergy}`);
        }
    }
    return matches;
}
function deriveAllergenReason(allergenSignals, selectedAllergies) {
    const contains = containsAllergenConflict(allergenSignals, selectedAllergies);
    if (contains.length > 0)
        return contains;
    if (selectedAllergies.length > 0 && allergenSignals?.unclear) {
        return ['Allergen unclear - ask staff'];
    }
    if (allergenSignals?.noListedAllergen) {
        return ['No listed allergen'];
    }
    return [];
}
function deriveDislikeReasons(dislikes) {
    if (!dislikes?.containsDislikedIngredient)
        return [];
    if ((dislikes.removableDislikedIngredients?.length ?? 0) > 0) {
        return ['Contains disliked ingredient but likely removable'];
    }
    return ['Contains disliked ingredient and not realistically removable'];
}
function determineSection(params) {
    const { scoreResult, firstMealFlex } = params;
    if (scoreResult.hardConflictReasons.length > 0)
        return 'avoid';
    if (scoreResult.allergenReasons.some((reason) => reason.startsWith('Contains ')))
        return 'avoid';
    if (scoreResult.dislikeReasons.some((reason) => reason.includes('not realistically removable'))) {
        return 'avoid';
    }
    if (scoreResult.softPressureReasons.length > 0 ||
        scoreResult.proteinReasons.length > 0 ||
        scoreResult.qualityReasons.length > 0 ||
        scoreResult.allergenReasons.includes('Allergen unclear - ask staff')) {
        return 'caution';
    }
    if (!scoreResult.feasible && !firstMealFlex)
        return 'caution';
    return 'top';
}
function toMealShareValues(remaining, remainingMeals) {
    return {
        calories: Math.max(1, remaining.calories / remainingMeals),
        protein: Math.max(1, remaining.protein / remainingMeals),
        carbs: Math.max(1, remaining.carbs / remainingMeals),
        fat: Math.max(1, remaining.fat / remainingMeals),
    };
}
function scoreDish(ctx, dish) {
    const macros = {
        calories: toNonNegativeInt(dish.estimatedCalories),
        protein: toNonNegativeInt(dish.estimatedProteinG),
        carbs: toNonNegativeInt(dish.estimatedCarbsG),
        fat: toNonNegativeInt(dish.estimatedFatG),
    };
    const feasibility = (0, dayBudget_1.feasibilityAfterPick)({
        goal: ctx.goal,
        remaining: ctx.remaining,
        remainingMeals: ctx.remainingMeals,
        dish: macros,
    });
    const mealShare = toMealShareValues(ctx.remaining, ctx.remainingMeals);
    const baseTolerance = getBasePressureTolerance(ctx.dailyState.mealsLoggedCount);
    const flexBoost = ctx.firstMealFlex ? (ctx.goal === 'Gain muscle' ? 0.25 : 0.12) : 0;
    const pressureTolerance = baseTolerance * GOAL_TOLERANCE_MULTIPLIER[ctx.goal] + flexBoost;
    const caloriePressure = macros.calories / mealShare.calories;
    const carbPressure = macros.carbs / mealShare.carbs;
    const fatPressure = macros.fat / mealShare.fat;
    const proteinCoverage = macros.protein / mealShare.protein;
    const pressure = {
        caloriePressure,
        carbPressure,
        fatPressure,
        proteinCoverage,
        pressureTolerance,
    };
    const hardConflictReasons = [];
    const softPressureReasons = [];
    const proteinReasons = [];
    const containsAllergens = containsAllergenConflict(dish.allergenSignals, ctx.selectedAllergies);
    if (containsAllergens.length > 0) {
        hardConflictReasons.push(...containsAllergens);
    }
    const dislikeReasons = deriveDislikeReasons(dish.dislikes);
    if (dislikeReasons.some((reason) => reason.includes('not realistically removable'))) {
        hardConflictReasons.push('Contains disliked ingredient and not realistically removable');
    }
    const severeCalorieOver = ctx.dailyState.mealsLoggedCount > 0 &&
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
    }
    else if (dish.flags?.highFatSauce &&
        fatPressure >= 1 &&
        !softPressureReasons.includes('High fat for this point in the day. Keep later meals lower in fat.')) {
        softPressureReasons.push('High fat for this point in the day. Keep later meals lower in fat.');
    }
    if (carbPressure > pressureTolerance) {
        softPressureReasons.push('Carb-heavy for your remaining budget. Keep later meals lower in carbs.');
    }
    const floor = proteinFloor(ctx.goal, ctx.firstMealFlex);
    const remainingProteinRatio = ctx.targets.proteinG > 0 ? Math.max(0, ctx.remaining.protein) / ctx.targets.proteinG : 0;
    if (macros.protein < floor && remainingProteinRatio > 0.35) {
        proteinReasons.push('Low protein for your goal. Add protein later today.');
    }
    if (macros.protein >= floor + 8) {
        proteinReasons.push('Good protein for your goal.');
    }
    if (!feasibility.ok) {
        if (feasibility.caloriesPerMealLeftAfter < 180) {
            hardConflictReasons.push('Would leave too little calories for remaining meals.');
        }
        else if (feasibility.caloriesPerMealLeftAfter < 300) {
            softPressureReasons.push('Would leave low calories per remaining meal.');
        }
        if (!ctx.firstMealFlex && feasibility.proteinPerMealNeededAfter > (ctx.goal === 'Gain muscle' ? 72 : 62)) {
            if (feasibility.proteinPerMealNeededAfter > (ctx.goal === 'Gain muscle' ? 92 : 78)) {
                hardConflictReasons.push('Protein requirement becomes too high for remaining meals.');
            }
            else {
                softPressureReasons.push('Low protein for your remaining budget. Add protein later today.');
            }
        }
    }
    const { bonus: qualityBonus, penalty: qualityPenalty, qualityReasons } = qualityBonusAndPenalty(dish.flags);
    const weights = getGoalWeights(ctx.goal);
    const overCalories = Math.max(0, macros.calories - ctx.remaining.calories);
    const overCarbs = Math.max(0, macros.carbs - ctx.remaining.carbs);
    const overFat = Math.max(0, macros.fat - ctx.remaining.fat);
    const lowProteinPenalty = macros.protein < floor
        ? (floor - macros.protein) * weights.lowProteinPenaltyWeight
        : 0;
    const pressurePenalty = Math.max(0, caloriePressure - pressureTolerance) * weights.softPressurePenaltyWeight +
        Math.max(0, carbPressure - pressureTolerance) * (weights.softPressurePenaltyWeight * 0.65) +
        Math.max(0, fatPressure - pressureTolerance) * (weights.softPressurePenaltyWeight * 0.9);
    const score = macros.protein * weights.proteinBonusWeight +
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
function mapAllergenNote(allergenSignals, selectedAllergies) {
    const contains = containsAllergenConflict(allergenSignals, selectedAllergies);
    if (contains.length > 0)
        return contains[0];
    if (selectedAllergies.length > 0 && allergenSignals?.unclear) {
        return 'Allergen unclear - ask staff';
    }
    if (allergenSignals?.noListedAllergen) {
        return 'No listed allergen';
    }
    return null;
}
function mapNoLine(dislikes) {
    const removable = dislikes?.removableDislikedIngredients ?? [];
    if (!dislikes?.containsDislikedIngredient || removable.length === 0)
        return null;
    return `No ${removable[0]}`;
}
function inferQuickFix(dish, section) {
    if (section !== 'caution')
        return null;
    const removable = dish.dislikes?.removableDislikedIngredients ?? [];
    if (removable.length > 0) {
        return `Try: remove ${removable[0]}`.slice(0, 45);
    }
    if (dish.flags?.highFatSauce)
        return 'Try: sauce on the side';
    if (dish.flags?.fried)
        return 'Try: grilled not fried';
    if (dish.flags?.dessert)
        return 'Try: half portion';
    if (dish.flags?.refinedCarbHeavy)
        return 'Try: extra veggies';
    return null;
}
function normalizeDishName(name) {
    return name.trim() || 'Unknown dish';
}
function toDishPick(ranked, selectedAllergies) {
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
function rankedDishToDishPick(ranked, selectedAllergies = []) {
    return toDishPick(ranked, selectedAllergies);
}
function buildRankingContext(params) {
    const now = params.now ?? new Date();
    const remaining = (0, dayBudget_1.computeRemaining)(params.targets, params.dailyState.consumed);
    const remainingMeals = (0, dayBudget_1.estimateRemainingMeals)(params.dailyState, now, params.dailyState.mealsPerDay);
    return {
        goal: params.goal,
        targets: params.targets,
        dailyState: params.dailyState,
        remaining,
        remainingMeals,
        firstMealFlex: (0, dayBudget_1.isFirstMealFlex)(params.dailyState, now),
        selectedAllergies: params.selectedAllergies,
        selectedDislikes: params.selectedDislikes,
    };
}
function rankExtractedDishes(params) {
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
        const pinResult = (0, menuPins_1.buildDeterministicPins)({
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
        const explanationResult = (0, recommendationExplanations_1.buildDeterministicExplanation)({
            goal: params.goal,
            hardConflictReasons: scoreResult.hardConflictReasons,
            softPressureReasons: scoreResult.softPressureReasons,
            qualityReasons: scoreResult.qualityReasons,
            proteinReasons: scoreResult.proteinReasons,
            allergenReasons: scoreResult.allergenReasons,
            dislikeReasons: scoreResult.dislikeReasons,
        });
        const quickFix = section === 'caution'
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
        };
    });
    const sorted = [...ranked].sort((a, b) => {
        if (b.score !== a.score)
            return b.score - a.score;
        return (b.dish.confidencePercent ?? 0) - (a.dish.confidencePercent ?? 0);
    });
    const top = sorted.filter((item) => item.section === 'top');
    const caution = sorted.filter((item) => item.section === 'caution');
    const avoid = sorted.filter((item) => item.section === 'avoid');
    return {
        ranked: sorted,
        top,
        caution,
        avoid,
        context,
    };
}
function rankForLegacyBuckets(params) {
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
exports.rankingConstants = {
    INFEASIBLE_SCORE,
    FIRST_MEAL_PRESSURE_TOLERANCE,
    SECOND_MEAL_PRESSURE_TOLERANCE,
    LATER_MEAL_PRESSURE_TOLERANCE,
};
