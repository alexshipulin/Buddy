"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLocalDateKey = getLocalDateKey;
exports.getDayPhase = getDayPhase;
exports.isFirstMealFlex = isFirstMealFlex;
exports.estimateRemainingMeals = estimateRemainingMeals;
exports.computeRemaining = computeRemaining;
exports.feasibilityAfterPick = feasibilityAfterPick;
exports.computeSoftPerMealBudget = computeSoftPerMealBudget;
exports.computeMacroPressure = computeMacroPressure;
exports.createEmptyDailyNutritionState = createEmptyDailyNutritionState;
function getLocalDateKey(now) {
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
function getDayPhase(now) {
    const hour = now.getHours();
    if (hour < 12)
        return 'morning';
    if (hour < 17)
        return 'mid';
    return 'evening';
}
function isFirstMealFlex(state, now) {
    return state.mealsLoggedCount === 0 && now.getHours() < 14;
}
function estimateRemainingMeals(state, now, mealsPerDay) {
    const configuredMealsPerDay = mealsPerDay ?? state.mealsPerDay;
    if (typeof configuredMealsPerDay === 'number' && Number.isFinite(configuredMealsPerDay)) {
        return Math.max(1, Math.round(configuredMealsPerDay) - state.mealsLoggedCount);
    }
    const defaultByPhase = {
        morning: 3,
        mid: 2,
        evening: 1,
    };
    const baseline = defaultByPhase[getDayPhase(now)];
    return Math.max(1, baseline - state.mealsLoggedCount);
}
function computeRemaining(targets, consumed) {
    return {
        calories: targets.caloriesKcal - consumed.calories,
        protein: targets.proteinG - consumed.protein,
        carbs: targets.carbsG - consumed.carbs,
        fat: targets.fatG - consumed.fat,
    };
}
function proteinLimit(goal) {
    switch (goal) {
        case 'Gain muscle':
            return 70;
        case 'Lose fat':
        case 'Maintain weight':
        case 'Eat healthier':
        default:
            return 60;
    }
}
function feasibilityAfterPick(params) {
    const proteinAfter = params.remaining.protein - params.dish.protein;
    const mealsAfter = Math.max(1, params.remainingMeals - 1);
    const proteinPerMealNeededAfter = proteinAfter / mealsAfter;
    const caloriesAfter = params.remaining.calories - params.dish.calories;
    const caloriesPerMealLeftAfter = caloriesAfter / mealsAfter;
    const proteinOk = proteinPerMealNeededAfter <= proteinLimit(params.goal);
    const caloriesOk = caloriesPerMealLeftAfter >= 300;
    return {
        ok: proteinOk && caloriesOk,
        proteinPerMealNeededAfter,
        caloriesPerMealLeftAfter,
    };
}
function computeSoftPerMealBudget(remaining, remainingMeals) {
    const meals = Math.max(1, Math.round(remainingMeals));
    return {
        calories: Math.max(1, remaining.calories / meals),
        protein: Math.max(1, remaining.protein / meals),
        carbs: Math.max(1, remaining.carbs / meals),
        fat: Math.max(1, remaining.fat / meals),
    };
}
function computeMacroPressure(dish, softPerMeal) {
    return {
        caloriePressure: dish.calories / softPerMeal.calories,
        proteinCoverage: dish.protein / softPerMeal.protein,
        carbPressure: dish.carbs / softPerMeal.carbs,
        fatPressure: dish.fat / softPerMeal.fat,
    };
}
function createEmptyDailyNutritionState(dateKey) {
    return {
        dateKey,
        consumed: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        mealsLoggedCount: 0,
        firstMealTime: null,
        lastMealTime: null,
        mealsPerDay: undefined,
        wholeFoodsMealsCount: 0,
        processedMealsCount: 0,
    };
}
